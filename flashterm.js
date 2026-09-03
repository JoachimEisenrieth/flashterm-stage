// © 2025-04-18 Eisenrieth Digital Solutions. Alle Rechte vorbehalten.

import { config } from './config.js';  // Konfiguration importieren
import {
    BootstrapState,
    createInitializationGuard,
    getBootstrapPresentation
} from './src/app/bootstrap-state.js';
import { getConceptSectionAvailability } from './src/app/concept-section-availability.js';
import { createConceptViewModel } from './src/app/concept-view-model.js';
import { serializeCsv } from './src/app/csv-export.js';
import { createInternationalPreferredTerms } from './src/app/international-preferred-terms.js';
import { createTermContexts, extractTermsFromText } from './src/app/term-mining.js';
import { parseLanguageCache, serializeLanguageCache } from './src/app/language-cache.js';
import { getSourceLanguage } from './src/app/source-language.js';
import {
    effectiveTerminologyConfig,
    getAvailableTermbases,
    initializeTerminologySource,
    terminologyRepository
} from './src/app/terminology-repository.js';
import {
    getInitialLanguageSelection,
    getTermbaseSelectionUrl,
    getTerminologyCacheKey,
    getTerminologyImageBasePath,
    usesPublishedTerminology
} from './src/app/terminology-source.js';

const langParams = getInitialLanguageSelection(
    effectiveTerminologyConfig,
    window.location.search
);
let sourceLanguage = langParams.source;
let targetLanguage = langParams.target;

let translations;
let sourceTermList = [];
let targetTermList = [];
let searchMode = 'contains';

const ratingIcons = {
    preferred: '<svg class="rating-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16 9"></path></svg>',
    alternative: '<svg class="rating-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle></svg>',
    rejected: '<svg class="rating-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M5.64 5.64 18.36 18.36"></path></svg>'
};

function getRatingLegend() {
    const preferred = translations?.[guiLanguage]?.preferred_heading || 'Preferred';
    const alternative = translations?.[guiLanguage]?.alternative_heading || 'Alternative';
    const rejected = translations?.[guiLanguage]?.rejected_heading || 'Rejected';

    return {
        label: translations?.[guiLanguage]?.rating_legend || 'Terminology status legend',
        items: `
            <span class="term-legend-item rating-preferred">${ratingIcons.preferred}<span>${preferred}</span></span>
            <span class="term-legend-item rating-alternative">${ratingIcons.alternative}<span>${alternative}</span></span>
            <span class="term-legend-item rating-rejected">${ratingIcons.rejected}<span>${rejected}</span></span>`
    };
}

const clearButton = document.getElementById('clear-icon');
const closeIcon = document.getElementById('close-icon');
const loadingIndicator = document.getElementById('loading');
const startupStatus = document.getElementById('startup-status');
const startupStatusMessage = document.getElementById('startup-status-message');
const startupRetryButton = document.getElementById('startup-retry');
const miningDiv = document.getElementById('mining-container');
const miningStatus = document.getElementById('mining-status');
const searchField = document.getElementById('search-field');
const startScreen = document.getElementById('start-screen');
const inspectorStartScreen = document.getElementById('inspector-start-screen');
const translatorStartScreen = document.getElementById('translator-start-screen');
const miningInputPanel = document.getElementById('mining-input-panel');
const miningTextInput = document.getElementById('mining-text-input');
const miningAnalyzeButton = document.getElementById('mining-analyze-button');
const miningClearButton = document.getElementById('mining-clear-button');

const wiki = document.getElementById("wiki");
const inspector = document.getElementById("inspector");
const translator = document.getElementById("translator");

let term = '';
let guiLanguage = getGuiLanguage();
let bootstrapState = BootstrapState.STARTING;
const initializationGuard = createInitializationGuard();

let selectedTerm = '';
let selectedConceptID = '';

let selectedSuggestionIndex = -1;

// ====================================================================================================
// Initialisierung
// ====================================================================================================
async function initialize() {
    return initializationGuard.run(async () => {
        renderBootstrapState(BootstrapState.STARTING);

        try {
            // Konfigurierte Terminologiequelle initialisieren
            await initializeTerminologySource();

            // GUI-Übersetzungen für die gewählte Sprache laden
            const translationsLoaded = await loadGuiTranslations(guiLanguage);

            // Verfügbare veröffentlichte Terminologiebestände im Header anbieten
            await initializeTermbaseSelector();
            await initializeSessionDisplay();

            // Sprachoptionen für das GUI laden und cachen
            const languagesLoaded = await fetchAndCacheLanguageOptions(guiLanguage);
            const sourceLanguageResolved = applySourceLanguageFromOptions();

            // Quell-Termini für die Ausgangssprache laden
            const sourceTermsLoaded = await fetchSourceTermList(sourceLanguage);

            // Ziel-Termini für die Zielsprache laden
            const targetTermsLoaded = await fetchTargetTermList(targetLanguage);

            // Titel des Tabs entsprechend den Sprachen setzen
            setTitle(sourceLanguage, targetLanguage);

            // Hier die Modustexte aktualisieren
            updateModeText(); // <--- Hinzufügen

            if (startScreen) {
                startScreen.classList.remove('hidden');
            }

            const isDegraded = [
                translationsLoaded,
                languagesLoaded,
                sourceLanguageResolved,
                sourceTermsLoaded,
                targetTermsLoaded
            ].includes(false);
            renderBootstrapState(isDegraded ? BootstrapState.DEGRADED : BootstrapState.READY);

        } catch (error) {
            renderBootstrapState(BootstrapState.FAILED);
            logError('Fehler bei der Initialisierung', error);
        }
    });
}

function renderBootstrapState(state) {
    bootstrapState = state;
    const presentation = getBootstrapPresentation(state, guiLanguage);

    if (presentation.showLoading) {
        showLoadingIndicator();
    } else {
        hideLoadingIndicator();
    }

    if (startupStatus && startupStatusMessage && startupRetryButton) {
        startupStatus.classList.toggle('hidden', !presentation.showStatus);
        startupStatus.classList.toggle('startup-state-degraded', state === BootstrapState.DEGRADED);
        startupStatus.classList.toggle('startup-state-failed', state === BootstrapState.FAILED);
        startupStatus.setAttribute('role', presentation.role);
        startupStatus.setAttribute('aria-live', presentation.ariaLive);
        startupStatusMessage.textContent = presentation.message;
        startupRetryButton.textContent = presentation.retryLabel;
        startupRetryButton.classList.toggle('hidden', !presentation.showRetry);
        startupRetryButton.disabled = state === BootstrapState.STARTING;
    }

    setDataControlsEnabled(presentation.enableDataControls);
    if (presentation.enableDataControls) {
        searchField?.focus();
    }
}

function setDataControlsEnabled(enabled) {
    [
        searchField,
        clearButton,
        document.getElementById('profile-icon'),
        document.getElementById('language-selector'),
        document.getElementById('saveLanguageBtn'),
        document.getElementById('termbase-selector')
    ].forEach(element => {
        if (element) {
            element.disabled = !enabled;
        }
    });
}

// ====================================================================================================
// Event Listener initialisieren
// ====================================================================================================
function initializeEventListeners() {

    // -----------------------------------------------------------------------------------------------
    // Buttons für Moduswechsel
    // -----------------------------------------------------------------------------------------------

    const buttons = [
        { element: document.getElementById("wiki"), mode: "wiki" },
        { element: document.getElementById("inspector"), mode: "inspector" },
        { element: document.getElementById("translator"), mode: "translator" },
    ];

    buttons.forEach(button => {
        if (button.element && !button.element.hasListener) {
            button.element.addEventListener("click", function () {
                switchMode(button.mode); // Schaltet zwischen den Modi um
            });
            button.element.hasListener = true; // Verhindert doppelte Listener
        }
    });

    const termbaseSelector = document.getElementById('termbase-selector');
    termbaseSelector?.addEventListener('change', event => {
        const selectedTermbaseId = event.target.value;
        if (selectedTermbaseId && selectedTermbaseId !== effectiveTerminologyConfig.termbaseId) {
            window.location.assign(getTermbaseSelectionUrl(window.location.href, selectedTermbaseId));
        }
    });

    // -------------------------------------------------------------------------------------------------
    // Suchfeld und Vorschläge-Handling
    // -------------------------------------------------------------------------------------------------
    if (clearButton) {
        clearButton.addEventListener('click', clearTextInput); // Button zum Löschen des Suchfelds
    }

    if (searchField && !searchField.hasListeners) {
        searchField.addEventListener('input', handleSearchInput);
        searchField.addEventListener('keydown', (event) => handleKeyPressEvent(event));     // Event bei Tastatureingaben
        searchField.hasListeners = true;
    } else if (!searchField) {
        handleError('Text input element not found');
    }

    miningTextInput?.addEventListener('input', updateMiningInputState);
    miningTextInput?.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            analyzeMiningInput();
        }
    });
    miningAnalyzeButton?.addEventListener('click', analyzeMiningInput);
    miningClearButton?.addEventListener('click', clearMiningInput);
    updateMiningInputState();

    // -------------------------------------------------------------------------------------------------
    // Vorschlagsliste und Drag-and-Drop-Funktionalität
    // -------------------------------------------------------------------------------------------------
    if (suggestionsWrapper) {
        let isClickingSuggestion = false;

        suggestionsWrapper.addEventListener('mousedown', (e) => {
            if (e.target === headerElement) {
                onMouseDown(e);  // Dragging nur, wenn der Header oder das Icon angeklickt wird
            } else {
                isClickingSuggestion = true;
            }
        });

        suggestionsWrapper.addEventListener('mouseup', (e) => {
            if (isClickingSuggestion) {
                isClickingSuggestion = false;
                if (!hasMoved && e.target !== closeIcon) {
                    hideSuggestions();
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging && !preventDrag) {
                const newX = initialDivX + (e.clientX - initialMouseX);
                const newY = initialDivY + (e.clientY - initialMouseY);
                suggestionsWrapper.style.left = `${newX}px`;
                suggestionsWrapper.style.top = `${newY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                suggestionsWrapper.style.cursor = 'move';
            }
        });

        closeIcon.addEventListener('click', () => {
            hasMoved = false;
            preventDrag = true;

            // Suchfeld leeren und Vorschläge ausblenden
            if (searchField) {
                searchField.value = '';
                searchField.dispatchEvent(new Event('input')); // Event auslösen, um Vorschläge zu verbergen
            }

            // Fensterposition zurücksetzen
            suggestionsWrapper.style.left = originalPosition.left;
            suggestionsWrapper.style.top = originalPosition.top;
            isDragging = false;
            preventDrag = false;
        });

        // Verhindere das sofortige Schließen der Vorschlagsliste, wenn man das Suchfeld verlässt
        searchField.addEventListener('blur', (e) => {
            setTimeout(() => {
                if (!isClickingSuggestion && !hasMoved && e.relatedTarget !== closeIcon) {
                    hideSuggestions();
                }
            }, 100);
        });
    }


    // -------------------------------------------------------------------------------------------------
    // Gewählter Term
    // -------------------------------------------------------------------------------------------------    
    document.querySelectorAll('.term-clickable').forEach(element => {
        element.addEventListener('click', function () {
            const conceptID = this.getAttribute('data-concept-id');
            const sourceLanguage = this.getAttribute('data-source-language');
            const targetLanguage = this.getAttribute('data-target-language');

            // Aktualisiere den globalen Term
            term = this.textContent;

            // Entferne die Hervorhebung von zuvor geklickten Termini
            document.querySelectorAll('.highlighted-term').forEach(termElement => {
                termElement.classList.remove('highlighted-term');
            });

            // Füge die gelbe Hervorhebung zum geklickten Term hinzu
            this.classList.add('highlighted-term');

            // Zeige den Wiki-Eintrag für den geklickten Term an
            logNow(`Gewählter Term: ${term}`);
            showWiki(term, conceptID, sourceLanguage, targetLanguage);
        });
    });

    // -------------------------------------------------------------------------------------------------
    // Modales Fenster – Profil
    // -------------------------------------------------------------------------------------------------
    const languageModal = document.getElementById('language-modal');
    const closeLanguageModalButton = document.querySelector('.close');
    let languageModalTrigger = null;

    const closeLanguageModal = () => {
        languageModal.style.display = 'none';
        languageModalTrigger?.focus();
    };

    document.getElementById('profile-icon').addEventListener('click', async function () {

        // Modales Fenster öffnen
        languageModalTrigger = document.activeElement;
        languageModal.style.display = 'block';
        closeLanguageModalButton.focus();

        try {
            // Sprachoptionen laden
            const languageData = await terminologyRepository.getLanguages(guiLanguage);
            populateLanguageOptions(languageData);  // Optionen in das Dropdown einfügen
        } catch (error) {
            console.error('Fehler beim Laden der Sprachoptionen:', error);
        }
    });

    closeLanguageModalButton.addEventListener('click', closeLanguageModal);

    languageModal.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeLanguageModal();
            return;
        }

        if (event.key === 'Tab') {
            const focusableElements = [...languageModal.querySelectorAll('button:not(:disabled), select:not(:disabled)')];
            const firstFocusableElement = focusableElements[0];
            const lastFocusableElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstFocusableElement) {
                event.preventDefault();
                lastFocusableElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastFocusableElement) {
                event.preventDefault();
                firstFocusableElement.focus();
            }
        }
    });

    document.getElementById('saveLanguageBtn').addEventListener('click', function () {
        const selectedLanguage = document.getElementById('language-selector').value;
        switchTargetLanguage(selectedLanguage);  // Funktion zur Zielsprache wechseln
        closeLanguageModal();
    });

    setupLanguageToggle('language-toggle-links', 'links-container', 'links-container-target');

    startupRetryButton?.addEventListener('click', () => {
        if (bootstrapState === BootstrapState.FAILED || bootstrapState === BootstrapState.DEGRADED) {
            void initialize();
        }
    });


    // -------------------------------------------------------------------------------------------------
    // Logout
    // ------------------------------------------------------------------------------------------------- 
    // document.getElementById('logout-button').addEventListener('click', logout);

}

// ====================================================================================================
// Verwende URL- und Konfigurationswerte bis die führende Source aus languageAPI geladen wurde.
// ====================================================================================================
function getGuiLanguage() {
    const browserLanguage = navigator.language || navigator.userLanguage || 'en-GB';
    return browserLanguage.startsWith('de') ? 'de-DE' : 'en-GB';
}

async function initializeTermbaseSelector() {
    if (!usesPublishedTerminology(effectiveTerminologyConfig)) {
        return;
    }

    const control = document.getElementById('termbase-control');
    const selector = document.getElementById('termbase-selector');
    if (!control || !selector) {
        return;
    }

    try {
        const termbases = await getAvailableTermbases();
        selector.innerHTML = '';
        [...termbases]
            .sort((first, second) => first.name.localeCompare(second.name, guiLanguage))
            .forEach(termbase => {
                const option = document.createElement('option');
                option.value = termbase.id;
                option.textContent = termbase.name;
                option.selected = termbase.id === effectiveTerminologyConfig.termbaseId;
                selector.appendChild(option);
            });

        control.classList.toggle('hidden', termbases.length < 2);
    } catch (error) {
        logWarning(`Terminologiebestände konnten nicht geladen werden: ${error.message}`);
    }
}

async function initializeSessionDisplay() {
    if (!usesPublishedTerminology(effectiveTerminologyConfig)) {
        return;
    }
    try {
        const response = await fetch('/api/session', { headers: { Accept: 'application/json' } });
        if (!response.ok) return;
        const data = await response.json();
        const control = document.getElementById('session-control');
        const user = document.getElementById('session-user');
        if (control && user && data.user?.displayName) {
            user.textContent = data.user.displayName;
            control.classList.remove('hidden');
        }
    } catch (error) {
        logWarning(`Anmeldestatus konnte nicht geladen werden: ${error.message}`);
    }
}

// ====================================================================================================
// Vorschläge
// ====================================================================================================
const suggestionsWrapper = document.querySelector('.suggestions-wrapper');
let isDragging = false;
let hasMoved = false;
let initialMouseX = 0;
let initialMouseY = 0;
let initialDivX = 0;
let initialDivY = 0;
let preventDrag = false;

const originalPosition = {
    left: suggestionsWrapper.style.left,
    top: suggestionsWrapper.style.top,
};

const headerElement = document.getElementById('window-header');

function onMouseDown(e) {
    if ((headerElement && e.target === headerElement) && !preventDrag) {

        // Verschiebe das Fenster nur einmal, wenn es noch nicht verschoben wurde
        if (!hasMoved) {
            shiftWindowPosition();
        }

        // Starte das Dragging
        isDragging = true;
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;
        initialDivX = suggestionsWrapper.offsetLeft;
        initialDivY = suggestionsWrapper.offsetTop;
        suggestionsWrapper.style.cursor = 'grabbing';
    }
}

function shiftWindowPosition() {
    const currentX = suggestionsWrapper.offsetLeft;
    const currentY = suggestionsWrapper.offsetTop;

    // Verschiebe das Fenster um 10px nach links und nach unten
    suggestionsWrapper.style.left = `${currentX - 10}px`;
    suggestionsWrapper.style.top = `${currentY + 10}px`;
    hasMoved = true; // Setze den Zustand auf "verschoben"
}

function highlightSuggestionAtIndex(index, suggestions) {
    suggestions.forEach((el, i) => {
        const isSelected = i === index;
        el.classList.toggle('highlighted', isSelected);
        el.setAttribute('aria-selected', String(isSelected));
    });

    const selectedSuggestion = suggestions[index];
    if (selectedSuggestion) {
        searchField.setAttribute('aria-activedescendant', selectedSuggestion.id);
    } else {
        searchField.removeAttribute('aria-activedescendant');
    }
}

function hideSuggestions() {
    suggestionsWrapper.style.display = 'none';
    selectedSuggestionIndex = -1;
    searchField.setAttribute('aria-expanded', 'false');
    searchField.removeAttribute('aria-activedescendant');
}

// ====================================================================================================
// Load GUI Translations
// ====================================================================================================
async function loadGuiTranslations(language) {
    logNot(`Loading translations for language: ${language}`);
    try {
        const response = await fetch('./json/translations.json');
        if (!response.ok) throw new Error('Translations file not found');
        translations = await response.json();
        updateTexts(language);
        logNot(`Translations loaded successfully for language: ${language}`);
        return Boolean(translations?.[language]);
    } catch (error) {
        logError('Error while loading the translations file.', error);
        return false;
    }
}

// ====================================================================================================
// Modus schalten
// ====================================================================================================
async function switchMode(mode) {
    if (!wiki || !inspector || !translator) {
        return;
    }

    // Alle Buttons auf passiv schalten
    [wiki, inspector, translator].forEach(modeButton => {
        modeButton.classList.remove("active");
        modeButton.setAttribute('aria-pressed', 'false');
    });
    document.getElementById("mining-container").style.display = "none";
    document.getElementById("wiki-container").style.display = "none";
    inspectorStartScreen?.classList.add('hidden');
    translatorStartScreen?.classList.add('hidden');
    miningInputPanel?.classList.toggle('hidden', mode === 'wiki');

    if (mode === "wiki") {
        wiki.classList.add("active");
        wiki.setAttribute('aria-pressed', 'true');
    } else if (mode === "inspector") {
        inspector.classList.add("active");
        inspector.setAttribute('aria-pressed', 'true');
    } else if (mode === "translator") {
        translator.classList.add("active");
        translator.setAttribute('aria-pressed', 'true');
    }

    if (mode === "wiki") {
        document.getElementById("wiki-container").style.display = "block";
        if (searchField && searchField.value.trim()) {
            showSuggestions(sourceTermList, searchField.value.trim());
        } else {
            document.getElementById('search-field').placeholder = 'Suche...';
        }
    } else if (mode === "inspector" || mode === "translator") {
        document.getElementById("mining-container").style.display = "block";
        if (!savedText) {
            miningDiv.innerHTML = '';
            if (miningStatus) {
                miningStatus.textContent = '';
            }
            const modeStartScreen = mode === 'inspector' ? inspectorStartScreen : translatorStartScreen;
            modeStartScreen?.classList.remove('hidden');
        } else {
            displayMinedTerms(foundTerms);
        }
    }
}


function getCurrentMode() {
    const wikiActive = document.getElementById("wiki").classList.contains("active");
    const inspectorActive = document.getElementById("inspector").classList.contains("active");
    const translatorActive = document.getElementById("translator").classList.contains("active");

    if (wikiActive) return 'wiki';
    if (inspectorActive) return 'inspector';
    if (translatorActive) return 'translator';

    return null; // Oder ein Standardmodus, falls keiner aktiv ist
}

// ====================================================================================================
// Ausgangssprche umschalten
// ====================================================================================================
// Diese Funktion wird verwendet, um die Ausgangssprache zu wechseln. 
// Sie wird in einem zukünftigen Feature aufgerufen werden.
// eslint-disable-next-line no-unused-vars
function switchSourceLanguage(newSourceLanguage) {
    sourceLanguage = newSourceLanguage;
    sessionStorage.setItem('sourceLanguage', newSourceLanguage);

    // Setze den Titel des Tabs mit der neuen Ausgangssprache
    setTitle(sourceLanguage, targetLanguage);
}

// ====================================================================================================
// Zielsprache umschalten
// ====================================================================================================
function populateLanguageOptions(languageData) {
    const languageSelector = document.getElementById('language-selector');
    languageSelector.innerHTML = '';  // Vorherige Optionen löschen

    let currentTargetLanguage = targetLanguage || '';

    // Sortiere die Sprachdaten alphabetisch nach dem Sprachnamen
    languageData.sort((a, b) => a.name.localeCompare(b.name));

    // Durch die sortierten Sprachdaten iterieren und Optionen hinzufügen
    languageData.forEach(language => {
        if (language.code !== sourceLanguage) {
            const option = document.createElement('option');
            option.value = language.code;
            option.text = `${language.name} (${language.code})`;

            // Überprüfen, ob die aktuelle Option der Zielsprache entspricht
            if (language.code === currentTargetLanguage) {
                option.selected = true; // Zielsprache als ausgewählt markieren
            }

            languageSelector.appendChild(option);
        } else {
            // console.log(`Ausgangssprache ${sourceLanguage} wird nicht als Zielsprache hinzugefügt.`);
        }
    });

    logNot('Alle Sprachoptionen erfolgreich hinzugefügt');
}

async function switchTargetLanguage(newTargetLanguage) {
    console.log(`Zielsprache wird gewechselt zu: ${newTargetLanguage}`);

    targetLanguage = newTargetLanguage;
    sessionStorage.setItem('targetLanguage', newTargetLanguage);
    console.log(`Zielsprache in sessionStorage gespeichert: ${newTargetLanguage}`);

    setTitle(sourceLanguage, targetLanguage);
    console.log(`Titel auf ${sourceLanguage} ➔ ${targetLanguage} gesetzt`);

    // Begriffe und Übersetzungen für die neue Zielsprache laden
    let targetTermsLoaded = false;
    try {
        console.log(`Lade Begriffe für die Zielsprache: ${targetLanguage}`);
        targetTermsLoaded = await fetchTargetTermList(targetLanguage);
        if (targetTermsLoaded) {
            console.log('Zielsprach-Begriffe erfolgreich geladen');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Zielsprach-Begriffe:', error);
    }

    updateModeText();
    console.log('Modus-Texte wurden aktualisiert');

    updateURLWithLanguages(sourceLanguage, targetLanguage);

    // Überprüfen, ob der Nutzer im Wiki-Modus ist, und den Wiki-Inhalt aktualisieren
    const currentMode = getCurrentMode();
    console.log(`Aktueller Modus: ${currentMode}`);

    if (currentMode === 'wiki') {
        console.log('Nutzer befindet sich im Wiki-Modus. Wiki-Inhalt wird aktualisiert.');

        // Verwende die global gespeicherten Term- und conceptID-Variablen
        if (selectedTerm && selectedConceptID) {
            console.log(`Aktualisiere Wiki für den Term: ${selectedTerm} und conceptID: ${selectedConceptID}`);
            await showWiki(selectedTerm, selectedConceptID, sourceLanguage, targetLanguage);
            console.log('Wiki-Inhalt erfolgreich aktualisiert');
        } else {
            console.warn('Kein Term oder conceptID ausgewählt. Wiki kann nicht aktualisiert werden.');
        }
    } else if (currentMode === 'translator' && targetTermsLoaded && savedText) {
        displayMinedTerms(foundTerms);
    } else {
        console.log('Nutzer ist nicht im Wiki-Modus. Keine Aktualisierung des Wiki-Inhalts erforderlich.');
    }
}

// ====================================================================================================
// Suchfeld
// ====================================================================================================
function handleSearchInput(event) {
    try {
        const currentMode = getCurrentMode();
        const query = event.target.value.trim();

        if (query !== '' && currentMode !== 'wiki') {
            switchMode('wiki');
        }
        showSuggestions(sourceTermList, query);
        toggleClearButton();
    } catch (error) {
        handleError('Error in search input listener', error);
    }
}

function handleKeyPressEvent(event) {
    try {
        const suggestions = document.querySelectorAll('.suggestion');

        if (!suggestionsWrapper || suggestionsWrapper.style.display === 'none') return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (selectedSuggestionIndex < suggestions.length - 1) {
                selectedSuggestionIndex++;
                highlightSuggestionAtIndex(selectedSuggestionIndex, suggestions);
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (selectedSuggestionIndex > 0) {
                selectedSuggestionIndex--;
                highlightSuggestionAtIndex(selectedSuggestionIndex, suggestions);
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                suggestions[selectedSuggestionIndex].click();
            } else {
                hideSuggestions();
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            hideSuggestions();
            searchField.focus();
        }
    } catch (error) {
        logError('Fehler bei Tastatureingabe', error);
    }
}

function toggleClearButton() {
    if (searchField.value.trim() !== "") {
        clearButton.style.display = 'flex';
    } else {
        clearButton.style.display = 'none';
    }
}

// ====================================================================================================
// Termliste der Ausgangssprache laden
// ====================================================================================================
async function fetchSourceTermList(language) {
    showLoadingIndicator();
    try {
        sourceTermList = await terminologyRepository.getTerms(language);
        console.log(`Termliste geladen: ${language}`);
        return true;
    } catch (error) {
        if (error instanceof SyntaxError) {
            handleError('Error parsing termlistField', error);
        }
        console.error('Fehler beim Laden der Termliste:', error);
        return false;
    } finally {
        hideLoadingIndicator();
    }
}

// ====================================================================================================
// Termliste der Zielsprache laden
// ====================================================================================================
async function fetchTargetTermList(language) {
    showLoadingIndicator();
    try {
        targetTermList = await terminologyRepository.getTerms(language);
        console.log(`Termliste geladen: ${language}`);
        return true;
    } catch (error) {
        if (error instanceof SyntaxError) {
            handleError('Error parsing termlistField', error);
        }
        console.error('Fehler beim Laden der Termliste:', error);
        return false;
    } finally {
        hideLoadingIndicator();
    }
}

// ====================================================================================================
// Sprachoptionen laden
// ====================================================================================================
let cachedLanguageOptions = null;

function getLanguageCacheKey() {
    return getTerminologyCacheKey(effectiveTerminologyConfig);
}

function applySourceLanguageFromOptions() {
    const configuredSourceLanguage = getSourceLanguage(cachedLanguageOptions);
    if (!configuredSourceLanguage) {
        logWarning('Keine eindeutige Source-Sprache in den Sprachdaten gefunden.');
        return false;
    }

    let languagesChanged = false;
    if (sourceLanguage !== configuredSourceLanguage.code) {
        sourceLanguage = configuredSourceLanguage.code;
        languagesChanged = true;
    }

    if (usesPublishedTerminology(effectiveTerminologyConfig)) {
        const targetIsAvailable = cachedLanguageOptions.some(language => (
            language.code === targetLanguage && language.code !== sourceLanguage
        ));
        if (!targetIsAvailable) {
            targetLanguage = cachedLanguageOptions.find(language => (
                language.code !== sourceLanguage
            ))?.code ?? '';
            languagesChanged = true;
        }
    }

    if (languagesChanged) {
        updateURLWithLanguages(sourceLanguage, targetLanguage);
    }

    return true;
}

async function fetchAndCacheLanguageOptions(guiLanguage) {
    // Überprüfe, ob die Sprachdaten bereits im SessionStorage vorhanden sind
    const languageCacheKey = getLanguageCacheKey();
    const cachedData = sessionStorage.getItem(languageCacheKey);
    const cachedLanguages = parseLanguageCache(cachedData, guiLanguage);
    if (cachedLanguages !== null) {
        cachedLanguageOptions = cachedLanguages;
        return cachedLanguages.length > 0; // Keine API-Abfrage nötig
    }

    try {
        // Wenn keine zwischengespeicherten Daten im SessionStorage vorhanden sind, hole sie vom Server
        cachedLanguageOptions = await terminologyRepository.getLanguages(guiLanguage);
        if (cachedLanguageOptions && cachedLanguageOptions.length > 0) {
            // Speichere die Daten im SessionStorage für zukünftige Sitzungen
            sessionStorage.setItem(languageCacheKey, serializeLanguageCache(guiLanguage, cachedLanguageOptions));
            return true;
        } else {
            logWarning('Keine Sprachdaten gefunden.');
            return false;
        }
    } catch (error) {
        handleError('Fehler beim Abrufen der Sprachdaten', error);
        return false;
    }
}

function showSuggestions(sourceTermList, query) {
    const suggestionsDiv = document.getElementById('suggestions');

    if (!suggestionsDiv) {
        return;
    }

    suggestionsDiv.innerHTML = '';

    if (query.length === 0) {
        if (!hasMoved) {
            hideSuggestions();
        }
        return;
    }

    const normalizedQuery = query.normalize('NFD').replace(/[̀-ͯ]/g, '');
    try {
        const regex = new RegExp(searchMode === 'contains' ? sanitizeRegexString(normalizedQuery) : `^${sanitizeRegexString(normalizedQuery)}`, 'i');

        const matchedTerms = sourceTermList.filter(term => regex.test(term.term.normalize('NFD').replace(/[̀-ͯ]/g, '')));

        if (matchedTerms.length === 0) {
            if (!hasMoved) {
                hideSuggestions();
            }
            return;
        }

        const suggestionLegend = document.getElementById('suggestion-legend');
        if (suggestionLegend) {
            const legend = getRatingLegend();
            suggestionLegend.setAttribute('aria-label', legend.label);
            suggestionLegend.innerHTML = legend.items;
        }

        matchedTerms.forEach((term, index) => {
            const div = document.createElement('div');
            div.classList.add('suggestion');
            div.id = `suggestion-${index}`;
            div.setAttribute('role', 'option');
            div.setAttribute('aria-selected', 'false');
            div.innerHTML = highlightMatch(term.term, query);

            let rating;
            switch (term.weighting) {
                case 0:
                    rating = { icon: ratingIcons.rejected, className: 'rating-rejected', labelKey: 'rejected_heading', fallback: 'Rejected' };
                    break;
                case 1:
                    rating = { icon: ratingIcons.alternative, className: 'rating-alternative', labelKey: 'alternative_heading', fallback: 'Alternative' };
                    break;
                case 2:
                    rating = { icon: ratingIcons.preferred, className: 'rating-preferred', labelKey: 'preferred_heading', fallback: 'Preferred' };
                    break;
            }

            if (rating) {
                div.classList.add('rated-suggestion');

                const ratingIcon = document.createElement('span');
                const ratingLabel = translations?.[guiLanguage]?.[rating.labelKey] || rating.fallback;
                ratingIcon.classList.add('suggestion-rating', rating.className);
                ratingIcon.innerHTML = rating.icon;
                ratingIcon.setAttribute('role', 'img');
                ratingIcon.setAttribute('aria-label', ratingLabel);
                ratingIcon.title = ratingLabel;
                div.prepend(ratingIcon);
            }

            div.addEventListener('click', () => {
                if (!hasMoved) {
                    hideSuggestions();
                }
                showWiki(term.term, term.conceptID, sourceLanguage, targetLanguage);
            });

            suggestionsDiv.appendChild(div);
        });

        const allSuggestions = suggestionsDiv.querySelectorAll('.suggestion');
        selectedSuggestionIndex = -1;
        highlightSuggestionAtIndex(selectedSuggestionIndex, allSuggestions);

        suggestionsWrapper.style.display = 'block';
        searchField.setAttribute('aria-expanded', 'true');

    } catch (e) {
        handleError('Regex Error in showSuggestions', e);
    }
}

function highlightMatch(term, query) {
    try {
        const regex = new RegExp(`(${searchMode === 'contains' ? sanitizeRegexString(query) : '^' + sanitizeRegexString(query)})`, 'gi');
        return term.replace(regex, '<span class="highlight">$1</span>');
    } catch (e) {
        handleError('Regex Error in highlightMatch', e);
        return term;
    }
}

async function exportTerms() {
    const exportData = [];

    const isTwoLanguageMode = targetLanguage && targetLanguage !== '';

    for (const category in foundTerms) {
        for (const term in foundTerms[category]) {
            const conceptID = foundTerms[category][term].conceptID;
            let preferredTranslation = '';

            if (isTwoLanguageMode) {
                preferredTranslation = retrievePreferredTerm(conceptID, targetTermList.length ? targetTermList : sourceTermList);
            }

            exportData.push({
                term: foundTerms[category][term].originalTerm || term,
                category,
                preferredTranslation: isTwoLanguageMode ? preferredTranslation : undefined
            });
        }
    }

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const sourceLang = sourceLanguage.replace('-', '_');
    const targetLang = targetLanguage ? targetLanguage.replace('-', '_') : 'none';
    a.download = `termlist_${sourceLang}-${targetLang}.json`;

    a.click();
    URL.revokeObjectURL(url);
}

function createTermExportData() {
    const isTranslatorMode = translator.classList.contains('active');
    const preferredTermList = isTranslatorMode ? targetTermList : sourceTermList;
    const preferredDesignationLanguage = isTranslatorMode ? targetLanguage : sourceLanguage;
    const rows = [];

    for (const category in foundTerms) {
        for (const term in foundTerms[category]) {
            const record = foundTerms[category][term];
            const preferredDesignation = retrievePreferredTerm(record.conceptID, preferredTermList);

            rows.push({
                term: record.originalTerm || term,
                category,
                count: record.count,
                preferredDesignation: preferredDesignation === '–' ? '' : preferredDesignation,
                termLanguage: sourceLanguage,
                preferredDesignationLanguage
            });
        }
    }

    return {
        isTranslatorMode,
        preferredDesignationLanguage,
        rows
    };
}

function exportTermsToCsv() {
    const { preferredDesignationLanguage, rows } = createTermExportData();

    const csv = `\uFEFF${serializeCsv(rows)}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sourceLang = sourceLanguage.replace('-', '_');
    const targetLang = preferredDesignationLanguage
        ? preferredDesignationLanguage.replace('-', '_')
        : 'none';

    link.href = url;
    link.download = `termlist_${sourceLang}-${targetLang}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function clearTextInput() {
    if (searchField) {
        searchField.value = ''; // Leert das Suchfeld
        searchField.dispatchEvent(new Event('input')); // Löst das 'input'-Event aus
        toggleClearButton();
    }
}

function updateMiningInputState() {
    const hasText = Boolean(miningTextInput?.value.trim());
    if (miningAnalyzeButton) miningAnalyzeButton.disabled = !hasText;
    if (miningClearButton) miningClearButton.disabled = !hasText && !savedText;
}

function showCurrentMiningStartScreen() {
    const currentMode = getCurrentMode();
    inspectorStartScreen?.classList.toggle('hidden', currentMode !== 'inspector');
    translatorStartScreen?.classList.toggle('hidden', currentMode !== 'translator');
}

function analyzeMiningInput() {
    const inputText = miningTextInput?.value.trim() ?? '';
    if (!inputText) return;

    savedText = inputText;
    inspectorStartScreen?.classList.add('hidden');
    translatorStartScreen?.classList.add('hidden');
    termMining();
    updateMiningInputState();
}

function clearMiningInput() {
    savedText = '';
    foundTerms = { preferred: {}, alternative: {}, rejected: {} };
    if (miningTextInput) miningTextInput.value = '';
    if (miningDiv) miningDiv.innerHTML = '';
    if (miningStatus) miningStatus.textContent = '';
    updateMiningInputState();
    showCurrentMiningStartScreen();
    miningTextInput?.focus();
}

// ====================================================================================================
// 
// ====================================================================================================
function updateModeText() {
    try {
        // Prüfen, ob Sprachdaten zwischengespeichert wurden
        if (!cachedLanguageOptions || cachedLanguageOptions.length === 0) {
            logWarning('Keine zwischengespeicherten Sprachdaten gefunden.');
            return;
        }

        const sourceLanguageData = cachedLanguageOptions.find(lang => lang.code === sourceLanguage);
        const targetLanguageData = cachedLanguageOptions.find(lang => lang.code === targetLanguage);

        const sourceLanguageName = sourceLanguageData
            ? sourceLanguageData.name
            : sourceLanguage.toUpperCase();
        const targetLanguageName = targetLanguageData
            ? targetLanguageData.name
            : targetLanguage.toUpperCase();

        const sourceLanguageLabel = sourceLanguageData?.isSource
            ? `${sourceLanguageName} · Source`
            : sourceLanguageName;

        // Hier werden zwei schmale Leerzeichen (&thinsp;) verwendet
        const wikiText = `${sourceLanguageLabel} &thinsp;&thinsp;|&thinsp;&thinsp; ${targetLanguageName}`;
        const inspectorText = `${sourceLanguageLabel}`;
        const translatorText = `${sourceLanguageLabel} ➔ ${targetLanguageName}`;

        const wikiElement = document.getElementById('wiki');
        if (wikiElement) {
            const textContainer = wikiElement.querySelector('.mode-text');
            if (textContainer) {
                textContainer.innerHTML = wikiText;  // Verwende innerHTML, um HTML-Entities zu berücksichtigen
            }
        }

        const inspectorElement = document.getElementById('inspector');
        if (inspectorElement) {
            const textContainer = inspectorElement.querySelector('.mode-text');
            if (textContainer) {
                textContainer.textContent = inspectorText;
            }
        }

        const translatorElement = document.getElementById('translator');
        if (translatorElement) {
            const textContainer = translatorElement.querySelector('.mode-text');
            if (textContainer) {
                textContainer.textContent = translatorText;
            }
        }
    } catch (error) {
        handleError('Fehler beim Aktualisieren der Modus-Texte', error);
    }
}

function setTitle(language, targetLanguage) {
    const title = targetLanguage ? `Inspector ${language} ⮕ ${targetLanguage}` : `Inspector ${language}`;
    document.title = title;
}

function updateTexts(language) {
    if (!translations || !translations[language]) {
        handleError(`Es wurden keine Übersetzungen für die Sprache ${language} gefunden.`, new Error(`Missing translations for ${language}`));
        return;
    }

    const elementsToUpdate = [
        { selector: '#loading', key: 'loading' },
        { selector: '#start-heading', key: 'start_heading' },
        { selector: '#start-intro', key: 'start_intro' },
        { selector: '#international-title', key: 'international_title' },
        { selector: '#international-description', key: 'international_description' },
        { selector: '#international-language-heading', key: 'international_language' },
        { selector: '#international-preferred-heading', key: 'preferred_designation' },
        { selector: '#inspector-start-heading', key: 'inspector_start_heading' },
        { selector: '#inspector-start-intro', key: 'inspector_start_intro' },
        { selector: '#inspector-start-hint', key: 'inspector_start_hint' },
        { selector: '#translator-start-heading', key: 'translator_start_heading' },
        { selector: '#translator-start-intro', key: 'translator_start_intro' },
        { selector: '#translator-start-hint', key: 'translator_start_hint' },
        { selector: '#mining-input-label', key: 'mining_input_label' },
        { selector: '#mining-clear-button', key: 'clear_text' },
        { selector: '#mining-analyze-button', key: 'analyze_text' },
        { selector: '#termbase-selector-label', key: 'select_termbase' },
        { selector: '#logout-button', key: 'logout' },
        { selector: '#language-modal-title', key: 'select_target_language' },
        { selector: '#saveLanguageBtn', key: 'save' }
    ];

    const attributesToUpdate = [
        { selector: '#profile-icon', attribute: 'aria-label', key: 'select_target_language' },
        { selector: '#clear-icon', attribute: 'aria-label', key: 'clear_search' },
        { selector: '#close-icon', attribute: 'aria-label', key: 'close_suggestions' },
        { selector: '#suggestions', attribute: 'aria-label', key: 'search_suggestions' },
        { selector: '#mining-text-input', attribute: 'placeholder', key: 'mining_input_placeholder' },
        { selector: '.close', attribute: 'aria-label', key: 'close_language_selection' }
    ];

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', translations[language].description || '');
    }

    elementsToUpdate.forEach(item => {
        const element = document.querySelector(item.selector);
        if (element) {
            const text = translations[language][item.key];
            if (text) {
                element.innerText = text;
            }
        }
    });

    attributesToUpdate.forEach(item => {
        const element = document.querySelector(item.selector);
        const text = translations[language][item.key];
        if (element && text) {
            element.setAttribute(item.attribute, text);
        }
    });
}

// ====================================================================================================
// Wiki
// ====================================================================================================
async function showWiki(term, conceptID, sourceLanguage, targetLanguage) {

    selectedTerm = term;
    selectedConceptID = conceptID;

    if (!conceptID) {
        console.log('Kein gültiger conceptID vorhanden. showWiki wird nicht ausgeführt.');
        return;  // Funktion wird abgebrochen, wenn kein conceptID vorhanden ist
    }

    try {
        // Begriffsdetails abrufen
        const concept = await terminologyRepository.getConcept(conceptID);

        if (!concept) {
            console.error('Keine Begriffsdetails verfügbar.');
            return;
        }

        if (concept.languages.length === 0) {
            console.error('Keine Begriffsdetails verfügbar');
            return;
        }

        if (startScreen) {
            startScreen.classList.add('hidden');
        }

        createWikiLanguageMenus(concept);
        const conceptData = createConceptViewModel(concept, sourceLanguage, targetLanguage);
        updateDOMElements(
            conceptData,
            targetLanguage,
            getTerminologyImageBasePath(effectiveTerminologyConfig, window.location.origin)
        );
        renderInternationalTerms(concept);

        document.getElementById('mining-container').style.display = 'none';
        document.getElementById('wiki-container').style.display = 'block';

        hideEmptySections();

        // Hervorhebung der Ausgangssprache nach dem Laden setzen
        const sections = ['synonyms', 'definition', 'context', 'info', 'infobox', 'links']; // Wiki-Abschnitte
        sections.forEach(section => {
            const languageToggleElement = document.getElementById(`language-toggle-${section}`);
            if (languageToggleElement) {
                const languageOptions = languageToggleElement.querySelectorAll('.language-option');
                highlightSelectedLanguage(languageOptions, sourceLanguage.substring(0, 2)); // Hervorhebung der Ausgangssprache
            }
        });

    } catch (error) {
        console.error('Fehler in showWiki:', error);
    }
}

// -------------------------------------------------------------------------------------------------
// Sprach-Menü für jeden Bereich erstellen
// -------------------------------------------------------------------------------------------------    
function createWikiLanguageMenus(concept) {
    const sections = ['synonyms', 'definition', 'context', 'info', 'infobox', 'links']; // Wiki-Abschnitte
    const sectionAvailability = getConceptSectionAvailability(concept, sourceLanguage, targetLanguage);

    sections.forEach(section => {
        createLanguageMenuForSection(section, sectionAvailability[section]); // Verwende die bereits erstellte Funktion
    });
}

// Funktion zur Erstellung eines Sprachmenüs 
function createLanguageMenuForSection(section, availability) {
    const languageToggleElement = document.getElementById(`language-toggle-${section}`);

    if (!languageToggleElement) {
        console.warn(`Kein Sprache-Umschaltelement für Abschnitt ${section} gefunden.`);
        return;
    }

    // Entferne vorherige Sprachcontainer
    removePreviousLanguageContainers(section);

    // Prüfe, ob Inhalte für die Ausgangs- oder Zielsprache vorhanden sind
    const availableLanguages = [];
    const allLanguages = [sourceLanguage, targetLanguage]; // Alle möglichen Sprachen

    // Prüfe, ob für die Ausgangssprache Inhalte vorhanden sind
    const sourceContentExists = availability.source;
    if (sourceContentExists) {
        availableLanguages.push(sourceLanguage);
    }

    // Prüfe, ob für die Zielsprache Inhalte vorhanden sind
    const targetContentExists = availability.target;
    if (targetContentExists) {
        availableLanguages.push(targetLanguage);
    }

    // Vorhandene Sprachen als Buttons anzeigen
    languageToggleElement.innerHTML = '';  // Leeren, falls vorherige Einträge existieren
    allLanguages.forEach((lang, index) => {
        const langCode = lang.substring(0, 2);
        const languageName = cachedLanguageOptions?.find(language => language.code === lang)?.name || lang;
        const button = document.createElement('button');
        button.classList.add('language-option');

        // Wenn die Sprache verfügbar ist, zeige den Sprachcode
        if (availableLanguages.includes(lang)) {
            const showLanguageLabel = (translations?.[guiLanguage]?.show_language || 'Show {language}')
                .replace('{language}', languageName);
            button.textContent = langCode;
            button.setAttribute('data-lang', langCode);
            button.setAttribute('aria-label', showLanguageLabel);
            button.title = showLanguageLabel;

            // Markiere die erste Sprache als ausgewählt
            if (index === 0) {
                button.classList.add('selected');
            }

            // Event-Listener für die Sprachoptionen
            button.addEventListener('click', function () {
                switchLanguage(section, langCode);
                highlightSelectedLanguage(languageToggleElement.querySelectorAll('.language-option'), langCode);
            });
        } else {
            // Wenn die Sprache keinen Inhalt hat, zeige einen Gedankenstrich und mache den Button inaktiv
            const unavailableLanguageLabel = (translations?.[guiLanguage]?.language_unavailable || 'No content available in {language}')
                .replace('{language}', languageName);
            button.textContent = '–';
            button.setAttribute('aria-label', unavailableLanguageLabel);
            button.title = unavailableLanguageLabel;
            button.disabled = true;
            button.classList.add('disabled');
        }

        // Füge den Button dem Umschaltelement hinzu
        languageToggleElement.appendChild(button);
    });
}

// Funktion, um die ausgewählte Sprache hervorzuheben
function highlightSelectedLanguage(languageElements, selectedLanguage) {
    languageElements.forEach(el => {
        if (el.dataset.lang === selectedLanguage) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
}

// ====================================================================================================
// Sprachcontainer wechseln
// ====================================================================================================

// Funktion, um die vorherigen Sprachcontainer zu entfernen, bevor neue erstellt werden
function removePreviousLanguageContainers(section) {
    const previousContainers = document.querySelectorAll(`[id^="${section}-container-target-"]`);
    previousContainers.forEach(container => container.remove());
}

// Beispielhafte Funktion, um die Sprache eines Abschnitts zu wechseln
function switchLanguage(section, language) {
    const sourceContent = document.querySelector(`#${section}-container`);
    const targetContent = document.querySelector(`#${section}-container-target`);

    if (sourceContent && targetContent) {
        if (language === sourceLanguage.substring(0, 2)) {
            sourceContent.classList.remove('hidden');
            targetContent.classList.add('hidden');
        } else if (language === targetLanguage.substring(0, 2)) {
            sourceContent.classList.add('hidden');
            targetContent.classList.remove('hidden');
        } else {
            console.error(`Sprache ${language} wird nicht unterstützt.`);
        }
    } else {
        if (!sourceContent) {
            console.error(`Source Content für Abschnitt ${section} nicht gefunden.`);
        }
        if (!targetContent) {
            console.error(`Target Content für Abschnitt ${section} nicht gefunden.`);
        }
    }
}

// ====================================================================================================
// Concept anzeigen
// ====================================================================================================
function updateDOMElements(conceptData, targetLanguage, imageBasePath) {
    const {
        preferredTermSource = '', preferredTermTarget = '',
        footnoteSource = [], footnoteTarget = [],
        synonymsSource = '', synonymsTarget = '',
        definitionSource = '', definitionTarget = '',
        contextDataSource = '', contextDataTarget = [],
        infoDataSource = '', infoDataTarget = '',
        infoboxContentSource = '', infoboxContentTarget = '',
        linksSource = [], linksTarget = [],
        fileName = ''
    } = conceptData;

    // Vorzugsbenennungen anzeigen
    const termTitleElement = document.getElementById('term-title');
    if (termTitleElement) {
        termTitleElement.innerHTML = '';
        const preferredDesignationLabel = translations?.[guiLanguage]?.preferred_designation || 'Preferred designation';
        const sourceLanguageName = cachedLanguageOptions?.find(language => language.code === sourceLanguage)?.name || sourceLanguage;
        const targetLanguageName = cachedLanguageOptions?.find(language => language.code === targetLanguage)?.name || targetLanguage;
        const sourceTitle = `
            <span class="concept-term concept-term-source">
                <span class="concept-term-label">${sourceLanguageName} · ${preferredDesignationLabel}</span>
                <span class="concept-term-value" lang="${sourceLanguage}">${preferredTermSource}</span>
            </span>`;
        const targetTitle = preferredTermTarget
            ? `<span class="concept-term concept-term-target">
                    <span class="concept-term-label">${targetLanguageName} · ${preferredDesignationLabel}</span>
                    <span class="concept-term-value" lang="${targetLanguage}">${preferredTermTarget}</span>
               </span>`
            : '';
        termTitleElement.innerHTML = `${sourceTitle}${targetTitle}`;
    }

    // Bild anzeigen
    checkAndDisplayImage(fileName, imageBasePath);

    // Synonyme anzeigen
    const synonymsContainer = document.getElementById('synonyms-container');
    const synonymsTargetContainer = document.getElementById('synonyms-container-target');
    if (synonymsContainer && synonymsTargetContainer) {
        synonymsContainer.innerHTML = '';
        synonymsTargetContainer.innerHTML = '';
        synonymsContainer.innerHTML = generateSynonymsContent(synonymsSource);
        synonymsTargetContainer.innerHTML = generateSynonymsContent(synonymsTarget);
        synonymsTargetContainer.classList.add('hidden');
    }

    // Definitionen + Fußnoten anzeigen
    const definitionContainer = document.getElementById('definition-container');
    const definitionTargetContainer = document.getElementById('definition-container-target');
    if (definitionContainer && definitionTargetContainer) {
        definitionContainer.innerHTML = '';
        definitionTargetContainer.innerHTML = '';

        let sourceContent = definitionSource;
        let targetContent = definitionTarget;

        if (footnoteSource.length > 0) {
            sourceContent += `<p class="footnote">${footnoteSource.join('<br>')}</p>`;
        }
        if (footnoteTarget.length > 0) {
            targetContent += `<p class="footnote">${footnoteTarget.join('<br>')}</p>`;
        }

        const sourceBlock = createContentBlock(sourceContent);
        const targetBlock = createContentBlock(targetContent);

        definitionContainer.innerHTML = sourceBlock ? sourceBlock.outerHTML : '';
        definitionTargetContainer.innerHTML = targetBlock ? targetBlock.outerHTML : '';
        definitionTargetContainer.classList.add('hidden');
    }

    // Kontext anzeigen
    const contextContainer = document.getElementById('context-container');
    const contextTargetContainer = document.getElementById('context-container-target');
    if (contextContainer && contextTargetContainer) {
        contextContainer.innerHTML = '';
        contextTargetContainer.innerHTML = '';
        contextContainer.innerHTML = populateContextTable(contextDataSource);
        contextTargetContainer.innerHTML = populateContextTable(contextDataTarget);
        contextTargetContainer.classList.add('hidden');
    }

    // Info anzeigen
    const infoContainer = document.getElementById('info-container');
    const infoTargetContainer = document.getElementById('info-container-target');
    if (infoContainer && infoTargetContainer) {
        infoContainer.innerHTML = '';
        infoTargetContainer.innerHTML = '';
        infoContainer.innerHTML = populateInfoTable(infoDataSource);
        infoTargetContainer.innerHTML = populateInfoTable(infoDataTarget);
        infoTargetContainer.classList.add('hidden');
    }

    // Infobox anzeigen
    const infoboxContainer = document.getElementById('infobox-container');
    const infoboxTargetContainer = document.getElementById('infobox-container-target');
    if (infoboxContainer && infoboxTargetContainer) {
        infoboxContainer.innerHTML = '';
        infoboxTargetContainer.innerHTML = '';

        const md = window.markdownit({ html: true, linkify: true, typographer: true });
        const parsedContent = md.render(infoboxContentSource);
        const parsedTargetContent = md.render(infoboxContentTarget);

        const contentBlock = createContentBlock(parsedContent);
        const targetContentBlock = createContentBlock(parsedTargetContent);

        if (contentBlock) {
            infoboxContainer.innerHTML = contentBlock.outerHTML;
        }
        if (targetContentBlock) {
            infoboxTargetContainer.innerHTML = targetContentBlock.outerHTML;
            infoboxTargetContainer.classList.add('hidden');
        }
    }

    // Links anzeigen
    const linksContainer = document.getElementById('links-container');
    const linksTargetContainer = document.getElementById('links-container-target');

    if (linksContainer && linksTargetContainer) {
        linksContainer.innerHTML = '';         // Vorherige Inhalte löschen
        linksTargetContainer.innerHTML = '';   // Vorherige Inhalte löschen

        const sourceLinks = conceptData.linksSource || [];
        const targetLinks = conceptData.linksTarget || [];

        linksContainer.innerHTML = renderLinkList(sourceLinks);
        linksTargetContainer.innerHTML = renderLinkList(targetLinks);
        linksTargetContainer.classList.add('hidden');
    }

    hideEmptySections();
}

function renderInternationalTerms(concept) {
    const section = document.getElementById('international-section');
    const tableBody = document.getElementById('international-table-body');
    if (!section || !tableBody) {
        return;
    }

    const rows = createInternationalPreferredTerms(concept, cachedLanguageOptions ?? []);
    tableBody.replaceChildren();

    rows.forEach(row => {
        const tableRow = document.createElement('tr');
        const languageCell = document.createElement('th');
        const languageName = document.createElement('span');
        const languageCode = document.createElement('span');
        const preferredTermCell = document.createElement('td');

        languageCell.scope = 'row';
        languageName.className = 'international-language-name';
        languageName.textContent = row.name;
        languageCode.className = 'international-language-code';
        languageCode.textContent = row.code;
        languageCell.append(languageCode, languageName);

        preferredTermCell.lang = row.code;
        preferredTermCell.textContent = row.preferredTerm;

        tableRow.append(languageCell, preferredTermCell);
        tableBody.appendChild(tableRow);
    });

    section.classList.toggle('hidden', rows.length === 0);
}

// ====================================================================================================
// Synonyme darstellen
// ====================================================================================================

function generateSynonymsContent(synonyms) {
    if (synonyms.alternative.length === 0 && synonyms.rejected.length === 0) {
        return '';
    }
    let content = '<table class="synonyms-table">';

    const alternativeLabel = translations?.[guiLanguage]?.alternative_heading || 'Alternative';
    const alternativeIcon = `<span class="synonym-rating rating-alternative" role="img" aria-label="${alternativeLabel}" title="${alternativeLabel}">${ratingIcons.alternative}</span>`;
    synonyms.alternative.forEach(term => {
        const isSelected = term === selectedTerm; // Überprüfen, ob dies die gewählte Benennung ist
        content += `<tr><td>${alternativeIcon}</td><td><span class="${isSelected ? 'highlighted-term' : ''}">${term}</span></td></tr>`;
    });

    const rejectedLabel = translations?.[guiLanguage]?.rejected_heading || 'Rejected';
    const rejectedIcon = `<span class="synonym-rating rating-rejected" role="img" aria-label="${rejectedLabel}" title="${rejectedLabel}">${ratingIcons.rejected}</span>`;
    synonyms.rejected.forEach(term => {
        const isSelected = term === selectedTerm; // Überprüfen, ob dies die gewählte Benennung ist
        content += `<tr><td>${rejectedIcon}</td><td><span class="${isSelected ? 'highlighted-term' : ''}">${term}</span></td></tr>`;
    });

    content += '</table>';
    return content;
}

// ====================================================================================================
// Kontexttabelle darstellen
// ====================================================================================================

function populateContextTable(contextData) {
    let tableContent = '';

    contextData.forEach(context => {
        let termText = context.term || '';  // Der Begriff (Term)
        let contextText = context.context || '';  // Der Kontexttext (Beschreibung)

        // Die Fußnote wird direkt unter dem Kontexttext in der gleichen Zelle eingefügt
        let rowContent = `<tr><td>${termText}</td><td>${contextText}`;

        // Falls eine Fußnote vorhanden ist, wird sie unter dem Kontexttext in der gleichen Zelle hinzugefügt
        if (context.footnote && context.footnote.trim() !== '') {
            rowContent += `<p class="footnote">${context.footnote}</p>`;
        }

        rowContent += '</td></tr>';
        tableContent += rowContent;
    });

    return `<table>${tableContent}</table>`;
}

// ====================================================================================================
// Infotabelle darstellen
// ====================================================================================================
function populateInfoTable(infoData) {
    let tableContent = '';

    infoData.forEach(info => {
        let termText = info.term || '';  // Der Begriff (Term, z.B. Produktname)
        let infoText = info.info || '';  // Der Informationstext

        // Die Fußnote wird direkt unter dem Informationstext in der gleichen Zelle eingefügt
        let rowContent = `<tr><td>${termText}</td><td>${infoText}`;

        // Falls eine Fußnote vorhanden ist, wird sie unter dem Informationstext in der gleichen Zelle hinzugefügt
        if (info.footnote && info.footnote.trim() !== '') {
            rowContent += `<p class="footnote">${info.footnote}</p>`;
        }

        rowContent += '</td></tr>';
        tableContent += rowContent;
    });

    return `<table>${tableContent}</table>`;
}


// ====================================================================================================
// 
// ====================================================================================================
function createContentBlock(content) {
    if (!content.trim()) return null;

    const block = document.createElement('div');
    block.className = 'content-block';
    block.innerHTML = content;
    return block;
}

function renderLinkList(links = []) {
    if (!links.length) return '';
    return `<ul>${links.map(l =>
        `<li><a href="${l.link}" target="_blank" rel="noopener">${l.label}</a></li>`
    ).join('')}</ul>`;
}

function showLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

function hideEmptySections() {
    const sections = [
        document.getElementById('term-title'),
        document.getElementById('synonyms-section'),
        document.getElementById('definition-section'),
        document.getElementById('context-section'),
        document.getElementById('info-section'),
        document.getElementById('infobox-section'),
        document.getElementById('footnotes-section'),
        document.getElementById('links-section')
    ];

    sections.forEach(section => {
        if (section) {
            let hasContent = false;

            // Logik für 'term-title': erst ausblenden, wenn wirklich leer
            if (section.id === 'term-title') {
                hasContent = section.textContent.trim() !== '';  // Wenn leer, ausblenden
                section.classList.toggle('hidden', !hasContent);
                document.getElementById('concept-header')?.classList.toggle('hidden', !hasContent);
            } else {

                let sourceContainer = section.querySelector('.content-source');
                let targetContainer = section.querySelector('.content-target');
                let toggleButton = section.querySelector('.toggle-language');

                const isSourceEmpty = isContainerEmpty(sourceContainer);
                const isTargetEmpty = isContainerEmpty(targetContainer);

                // Zeige den Abschnitt an, wenn einer der Container Inhalt hat
                hasContent = !(isSourceEmpty && isTargetEmpty);

                section.classList.toggle('hidden', !hasContent);

                // Verstecke den Toggle-Button, wenn kein Inhalt in der Zielsprache vorhanden ist
                if (toggleButton) {
                    toggleButton.classList.toggle('hidden', isTargetEmpty);
                }
            }
        }
    });
}

function isContainerEmpty(container) {
    // Überprüfe, ob der Container selbst leer ist und keine Kinder hat
    if (!container || (container.textContent.trim() === '' && container.children.length === 0)) {
        return true;
    }

    // Hier prüfen wir, ob eines der Kinder sichtbaren Text hat
    for (let child of container.children) {
        if (child.textContent.trim() !== '') {
            return false; // Kind hat sichtbaren Inhalt
        }
    }

    // Wenn kein Kind sichtbaren Inhalt hat, gilt der Container als leer
    return true;
}

function hideImageElements(imgContainer, termImage) {
    if (imgContainer) {
        imgContainer.style.display = 'none';
        imgContainer.classList.add('hidden');
    }
    if (termImage) termImage.style.display = 'none';
    document.getElementById('concept-header')?.classList.remove('has-image');
}

function showImageElements(imgContainer, termImage) {
    if (imgContainer) {
        imgContainer.classList.remove('hidden');
        imgContainer.style.display = 'flex';
    }
    if (termImage) termImage.style.display = 'block';
    document.getElementById('concept-header')?.classList.add('has-image');
}

// ====================================================================================================
// Bilddatei verarbeiten
// ====================================================================================================

async function checkAndDisplayImage(fileName, imageBasePath) {
    logNot(`checkAndDisplayImage aufgerufen mit fileName: ${fileName}`);

    const imgContainer = document.getElementById('image-container');
    const termImage = document.getElementById('term-image');

    if (!fileName || !imageBasePath || !imgContainer || !termImage) {
        logWarning('Fehlender fileName oder HTML-Elemente nicht gefunden.');
        hideImageElements(imgContainer, termImage);
        return;
    }

    const imageUrl = `${imageBasePath}${fileName}`;
    logNot(`Versuche Bild zu laden von URL: ${imageUrl}`);

    try {
        const response = await fetch(imageUrl);
        if (response.ok) {
            logNot(`Bild erfolgreich geladen: ${imageUrl}`);
            termImage.src = imageUrl;
            termImage.alt = '';
            showImageElements(imgContainer, termImage); // Bildbereich wird nur angezeigt, wenn das Bild erfolgreich geladen wurde
        } else {
            logWarning(`Bild ${fileName} nicht gefunden.`);
            hideImageElements(imgContainer, termImage); // Bildbereich wird ausgeblendet, wenn das Bild nicht gefunden wurde
        }
    } catch (error) {
        logError('Fehler beim Laden des Bildes', error);
        hideImageElements(imgContainer, termImage); // Bildbereich wird bei einem Fehler ausgeblendet
    }
}
// ====================================================================================================
// TermMining
// ====================================================================================================
let savedText = ''; // Nimmte den Text auf, der in die Zwischenablage kopiert wurde.
let foundTerms = { preferred: {}, alternative: {}, rejected: {} }; // Nimmt die gefundenen Termini auf.
function termMining() {
    if (!searchField || !miningDiv) {
        handleError('Required elements for Term Mining function are missing');
        return;
    }

    miningDiv.innerHTML = '';

    // Wähle die Termliste
    const termList = sourceTermList;
    foundTerms = extractTermsFromText(savedText.trim(), termList, {
        onInvalidWeighting() {
            handleError('Unknown weighting', new Error('Unknown weighting value'));
        }
    });

    // Zeige die gefundenen Begriffe und deren Klassifikation (abgelehnt, alternativ, bevorzugt)
    displayMinedTerms(foundTerms);

    // Setze den Fokus auf die Ergebnisse
    miningDiv.focus();

}

function retrievePreferredTerm(conceptID, termList) {
    const preferredTerm = termList.find(term => term.conceptID === conceptID && term.weighting === 2);
    return preferredTerm ? preferredTerm.term : '–';
}

function displayMinedTerms(foundTerms) {
    const languageNames = {
        de: 'Deutsch',
        en: 'Englisch',
        fr: 'Französisch',
    };

    if (typeof sourceLanguage === 'undefined' || typeof targetLanguage === 'undefined') {
        console.error('sourceLanguage oder targetLanguage ist nicht definiert');
        return;
    }

    const hasFoundTerms = ['rejected', 'alternative', 'preferred']
        .some(category => Object.keys(foundTerms?.[category] || {}).length > 0);

    if (miningStatus) {
        miningStatus.textContent = '';
    }

    if (!hasFoundTerms) {
        const noTermsMessage = translations?.[guiLanguage]?.no_terms_found || 'No registered terms were detected in the text.';
        miningDiv.innerHTML = `<p class="empty-state" role="status">${noTermsMessage}</p>`;
        return;
    }

    const isTranslatorMode = document.getElementById("translator").classList.contains("active");
    const foundTermCount = ['rejected', 'alternative', 'preferred']
        .reduce((count, category) => count + Object.keys(foundTerms[category]).length, 0);
    if (miningStatus) {
        miningStatus.textContent = (translations?.[guiLanguage]?.terms_found || '{count} registered terms found.')
            .replace('{count}', foundTermCount);
    }
    const sourceLanguageName = languageNames[sourceLanguage.substring(0, 2)] || sourceLanguage;
    const targetLanguageName = languageNames[targetLanguage.substring(0, 2)] || targetLanguage;
    const foundTermLabel = translations?.[guiLanguage]?.found_term || 'Found term';
    const preferredDesignationLabel = translations?.[guiLanguage]?.preferred_designation || 'Preferred designation';
    const contextRows = [];

    const createTableRow = (term, count, category, preferredTerm, occurrences) => {
        let ratingClass = '';
        let ratingIcon = '';
        switch (category) {
            case 'rejected':
                ratingClass = 'rating-rejected';
                ratingIcon = ratingIcons.rejected;
                break;
            case 'alternative':
                ratingClass = 'rating-alternative';
                ratingIcon = ratingIcons.alternative;
                break;
            case 'preferred':
                ratingClass = 'rating-preferred';
                ratingIcon = ratingIcons.preferred;
                break;
        }

        const categoryLabel = translations?.[guiLanguage]?.[`${category}_heading`] || category;
        const occurrenceLabel = (translations?.[guiLanguage]?.[
            count === 1 ? 'occurrence_count_one' : 'occurrence_count_other'
        ] || (count === 1 ? '{count} occurrence' : '{count} occurrences')).replace('{count}', count);
        const contextRowId = `term-context-${contextRows.length + 1}`;
        const contexts = createTermContexts(savedText, occurrences);
        contextRows.push({ id: contextRowId, contexts });
        const occurrenceToggle = `<button type="button" class="term-context-toggle" aria-expanded="false" aria-controls="${contextRowId}">
                                      <span>${occurrenceLabel}</span>
                                      <span class="term-context-toggle-icon" aria-hidden="true">⌄</span>
                                  </button>`;
        const termResult = `<div class="term-result">
                                <span class="term-result-copy">
                                    <span class="term-result-label"><button type="button" class="term-clickable" data-concept-id="${term.conceptID}" data-source-language="${sourceLanguage}" data-target-language="${targetLanguage}">${term.originalTerm}</button></span>
                                    ${occurrenceToggle}
                                </span>
                                <span class="term-rating ${ratingClass}" role="img" aria-label="${categoryLabel}" title="${categoryLabel}">${ratingIcon}</span>
                            </div>`;
        const contextRow = `<tr id="${contextRowId}" class="term-context-row hidden">
                                <td colspan="2"><div class="term-context-list"></div></td>
                            </tr>`;

        if (!isTranslatorMode && term.originalTerm === preferredTerm) {
            return `<tr>
                        <td colspan="2" style="width: 100%;" data-label="${foundTermLabel}">${termResult}</td>
                    </tr>${contextRow}`;
        }

        const normalizedPreferredTerm = typeof preferredTerm === 'string' ? preferredTerm.trim() : '';
        const hasPreferredTerm = normalizedPreferredTerm !== '' && normalizedPreferredTerm !== '–' && normalizedPreferredTerm !== '-';
        const translation = hasPreferredTerm ? preferredTerm : '–';
        const preferredLabel = translations?.[guiLanguage]?.preferred_heading || 'Preferred';
        const preferredRating = hasPreferredTerm
            ? `<span class="term-rating rating-preferred" role="img" aria-label="${preferredLabel}" title="${preferredLabel}">${ratingIcons.preferred}</span>`
            : '';
        return `<tr>
                    <td style="width: 50%;" data-label="${foundTermLabel}">${termResult}</td>
                    <td style="width: 50%;" class="preferred-term-cell" data-label="${preferredDesignationLabel}">
                        <button type="button" class="preferred-term-content term-clickable" data-concept-id="${term.conceptID}" data-source-language="${sourceLanguage}" data-target-language="${targetLanguage}"><span class="preferred-term-label">${translation}</span>${preferredRating}</button>
                    </td>
                </tr>${contextRow}`;
    };

    const createCategorySection = (terms, category) => {
        if (Object.keys(terms).length > 0) {
            let sectionContent = '';
            Object.values(terms).forEach(({ conceptID, originalTerm, count, occurrences }) => {
                let preferredTerm;
                if (isTranslatorMode) {
                    preferredTerm = retrievePreferredTerm(conceptID, targetTermList);
                } else {
                    preferredTerm = retrievePreferredTerm(conceptID, sourceTermList);
                }
                sectionContent += createTableRow(
                    { conceptID, originalTerm },
                    count,
                    category,
                    preferredTerm,
                    occurrences
                );
            });
            return sectionContent;
        }
        return '';
    };

    const preferredLanguageName = isTranslatorMode ? targetLanguageName : sourceLanguageName;
    const legend = getRatingLegend();
    const legendContent = `
            <div class="term-legend" aria-label="${legend.label}">${legend.items}</div>`;
    let tableContent = `
            <div class="term-toolbar">${legendContent}</div>
            <table class="term-table">
                <thead>
                    <tr>
                        <th style="width: 50%;">Gefundene Termini (Anzahl)</th>
                        <th style="width: 50%;">Bevorzugte Termini</th>
                    </tr>
                    <tr>
                        <th style="width: 50%;">${sourceLanguageName}</th>
                        <th style="width: 50%;">${preferredLanguageName}</th>
                    </tr>
                </thead>
                <tbody>`;

    tableContent += createCategorySection(foundTerms.rejected, 'rejected');
    tableContent += createCategorySection(foundTerms.alternative, 'alternative');
    tableContent += createCategorySection(foundTerms.preferred, 'preferred');

    tableContent += '</tbody></table>';

    if (typeof miningDiv !== 'undefined' && miningDiv) {
        miningDiv.innerHTML = tableContent;

        contextRows.forEach(({ id, contexts }) => {
            const contextList = miningDiv.querySelector(`#${id} .term-context-list`);
            contexts.forEach((context, index) => {
                const contextParagraph = document.createElement('p');
                contextParagraph.classList.add('term-context');

                const positionLabel = document.createElement('span');
                positionLabel.classList.add('visually-hidden');
                positionLabel.textContent = `${(
                    translations?.[guiLanguage]?.occurrence_position || 'Occurrence {number}'
                ).replace('{number}', index + 1)}: `;

                const before = document.createTextNode(context.before);
                const match = document.createElement('mark');
                match.textContent = context.match;
                const after = document.createTextNode(context.after);
                contextParagraph.append(positionLabel, before, match, after);
                contextList?.appendChild(contextParagraph);
            });
        });

        const exportContainer = document.createElement('div');
        exportContainer.classList.add('export-actions');
        exportContainer.setAttribute('role', 'group');

        const exportLabel = translations?.[guiLanguage]?.export_results || 'Export results';
        exportContainer.setAttribute('aria-label', exportLabel);

        const exportHeading = document.createElement('span');
        exportHeading.classList.add('export-actions-label');
        exportHeading.textContent = exportLabel;
        exportContainer.appendChild(exportHeading);

        const createExportButton = (label, handler) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('export-button');
            button.textContent = label;
            button.addEventListener('click', handler);

            return button;
        };

        exportContainer.append(
            createExportButton('Excel', exportTermsToExcel),
            createExportButton('CSV', exportTermsToCsv),
            createExportButton('JSON', exportTerms)
        );
        miningDiv.querySelector('.term-toolbar').appendChild(exportContainer);

        miningDiv.querySelectorAll('.term-context-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const contextRow = miningDiv.querySelector(`#${button.getAttribute('aria-controls')}`);
                const willExpand = button.getAttribute('aria-expanded') !== 'true';
                button.setAttribute('aria-expanded', String(willExpand));
                contextRow?.classList.toggle('hidden', !willExpand);
            });
        });

        miningDiv.querySelectorAll('.term-clickable').forEach(element => {
            element.addEventListener('click', function () {
                const conceptID = this.getAttribute('data-concept-id');
                const sourceLanguage = this.getAttribute('data-source-language');
                const targetLanguage = this.getAttribute('data-target-language');

                showWiki(this.textContent, conceptID, sourceLanguage, targetLanguage);
            });
            element.addEventListener('mouseover', function () {
                this.style.textDecoration = 'underline';
            });
            element.addEventListener('mouseout', function () {
                this.style.textDecoration = 'none';
            });
        });
    } else {
        console.error('miningDiv ist nicht definiert');
    }
}

function exportTermsToExcel() {
    const { isTranslatorMode, preferredDesignationLanguage, rows } = createTermExportData();
    const sourceLanguageName = cachedLanguageOptions?.find(language => language.code === sourceLanguage)?.name || sourceLanguage;
    const preferredLanguageName = cachedLanguageOptions?.find(language => language.code === preferredDesignationLanguage)?.name
        || preferredDesignationLanguage;
    const reportTitle = translations?.[guiLanguage]?.export_report_title || 'Terminology review';
    const modeLabel = isTranslatorMode ? 'Translator' : 'Inspector';
    const termCount = rows.length;
    const occurrenceCount = rows.reduce((total, row) => total + row.count, 0);
    const createdAt = new Intl.DateTimeFormat(guiLanguage, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date());
    const labels = {
        mode: translations?.[guiLanguage]?.export_report_mode || 'Mode',
        language: translations?.[guiLanguage]?.export_report_language || 'Language',
        languages: translations?.[guiLanguage]?.export_report_languages || 'Languages',
        created: translations?.[guiLanguage]?.export_report_created || 'Created',
        result: translations?.[guiLanguage]?.export_report_result || 'Result',
        summary: translations?.[guiLanguage]?.export_report_summary || '{terms} distinct terms · {occurrences} occurrences',
        term: translations?.[guiLanguage]?.found_term || 'Found term',
        category: translations?.[guiLanguage]?.export_report_rating || 'Rating',
        count: translations?.[guiLanguage]?.export_report_count || 'Count',
        preferredDesignation: translations?.[guiLanguage]?.preferred_designation || 'Preferred designation'
    };
    const languageLabel = isTranslatorMode ? labels.languages : labels.language;
    const languageDescription = isTranslatorMode
        ? `${sourceLanguageName} (${sourceLanguage}) → ${preferredLanguageName} (${preferredDesignationLanguage})`
        : `${sourceLanguageName} (${sourceLanguage})`;
    const summary = labels.summary
        .replace('{terms}', termCount)
        .replace('{occurrences}', occurrenceCount);
    const sheetRows = [
        [reportTitle],
        [labels.mode, modeLabel],
        [languageLabel, languageDescription],
        [labels.created, createdAt],
        [labels.result, summary],
        [],
        [
            labels.term,
            labels.category,
            labels.count,
            labels.preferredDesignation
        ],
        ...rows.map(row => [
            row.term,
            translations?.[guiLanguage]?.[`${row.category}_heading`] || row.category,
            row.count,
            row.preferredDesignation
        ])
    ];

    /* global XLSX */
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const lastTableRow = sheetRows.length;

    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    worksheet['!cols'] = [
        { wch: 30 },
        { wch: 18 },
        { wch: 10 },
        { wch: 34 }
    ];
    worksheet['!rows'] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 10 }, { hpt: 24 }];
    worksheet['!autofilter'] = { ref: `A7:D${lastTableRow}` };

    workbook.Props = {
        Title: reportTitle,
        Subject: `${modeLabel}: ${sourceLanguage} → ${preferredDesignationLanguage}`,
        Author: 'flashterm',
        CreatedDate: new Date()
    };

    XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle.substring(0, 31));

    const sourceLang = sourceLanguage.replace('-', '_');
    const preferredLang = preferredDesignationLanguage.replace('-', '_');
    XLSX.writeFile(
        workbook,
        `flashterm_report_${sourceLang}-${preferredLang}.xlsx`,
        { cellStyles: true, compression: true }
    );
}

// ====================================================================================================
// Initialer UI- und Anwendungsstart
// ====================================================================================================
initializeEventListeners();
switchMode('wiki');
void initialize();

// ====================================================================================================
// Zentrale Logging-Funktion
// ====================================================================================================
function logNow(message) {
    console.log(message);
}

// eslint-disable-next-line no-unused-vars
function logNot(message) {
}

// eslint-disable-next-line no-unused-vars
function logAllways(message) {
    console.log(message);
}

function logError(message, error = null) {
    logWithLevel(error ? `${message}: ${error.message}` : message, 'ERROR');
}

function logWarning(message) {
    logWithLevel(message, 'WARN');
}

function logWithLevel(message, level) {
    console.log(`[${level}]: ${message}`);
}

function handleError(message, error) {
    if (miningDiv) {
        miningDiv.innerHTML = `<p class="error-state" role="alert">${message}</p>`;
    }
    logError(message, error);
}


function updateURLWithLanguages(source, target) {
    const url = new URL(window.location);
    url.searchParams.set('source', source);
    url.searchParams.set('target', target);
    history.replaceState(null, '', url.toString());
}

function setupLanguageToggle(toggleId, sourceContainerId, targetContainerId) {
    const toggleElement = document.getElementById(toggleId);
    const sourceContainer = document.getElementById(sourceContainerId);
    const targetContainer = document.getElementById(targetContainerId);

    if (!toggleElement || !sourceContainer || !targetContainer) {
        console.warn("Sprachelemente für", toggleId, "nicht gefunden.");
        return;
    }

    toggleElement.innerHTML = '';

    const sourceBtn = document.createElement('button');
    sourceBtn.textContent = 'de';
    sourceBtn.classList.add('lang-btn');
    sourceBtn.classList.add('active');

    const targetBtn = document.createElement('button');
    targetBtn.textContent = 'en';
    targetBtn.classList.add('lang-btn');

    toggleElement.appendChild(sourceBtn);
    toggleElement.appendChild(targetBtn);

    sourceBtn.addEventListener('click', () => {
        sourceContainer.classList.remove('hidden');
        targetContainer.classList.add('hidden');
        sourceBtn.classList.add('active');
        targetBtn.classList.remove('active');
    });

    targetBtn.addEventListener('click', () => {
        sourceContainer.classList.add('hidden');
        targetContainer.classList.remove('hidden');
        sourceBtn.classList.remove('active');
        targetBtn.classList.add('active');
    });
}


//====================================================================================================
// Links anzeigen
//====================================================================================================
function renderLinks(conceptData) {
    const sourceContainer = document.getElementById('links-container');
    const targetContainer = document.getElementById('links-container-target');

    if (!sourceContainer || !targetContainer) {
        console.warn('[renderLinks] HTML-Container für Links nicht gefunden.');
        return;
    }

    function createLinkList(links) {
        if (!Array.isArray(links) || links.length === 0) return '';
        return '<ul>' + links.map(l =>
            '<li><a href="' + l.link + '" target="_blank" rel="noopener">' + l.label + '</a></li>'
        ).join('') + '</ul>';
    }

    sourceContainer.innerHTML = createLinkList(conceptData.linksSource);
    targetContainer.innerHTML = createLinkList(conceptData.linksTarget);
}
