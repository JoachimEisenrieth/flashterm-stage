// ====================================================================================================
// © 2025 Eisenrieth Digital Solutions. Alle Rechte vorbehalten.
// * Dateiname: flashterm.js
// * Version: 1.3.0
// * Datum: 2025-07-19
// * Autor: Joachim Eisenrieth
// * Beschreibung: Zentrales Script zu Steuerung der flashterm-stage
// ====================================================================================================

import { loginToFileMaker, getFileMakerTerms, fetchAvailableLanguages, getFileMakerConceptDetails } from './filemaker-api.js';
import { config } from './config.js';  // Konfiguration importieren
import {
  termMining,
  extractTermsFromText,
  sanitizeRegexString,
  retrievePreferredTerm,
  displayMinedTerms
} from './term-mining.js';


const langParams = getLanguageParamsFromURL();
let sourceLanguage = langParams.source;
let targetLanguage = langParams.target;

let translations;
let sourceTermList = [];
let targetTermList = [];
let searchMode = 'contains';

const clearButton = document.getElementById('clear-icon');
const closeIcon = document.getElementById('close-icon');
const loadingIndicator = document.getElementById('loading');
const miningDiv = document.getElementById('mining-container');
const searchField = document.getElementById('search-field');

const wiki = document.getElementById("wiki");
const inspector = document.getElementById("inspector");
const translator = document.getElementById("translator");

let term = '';
let guiLanguage = '';

let selectedTerm = '';
let selectedConceptID = '';

let selectedSuggestionIndex = -1;

let savedText = '';
let foundTerms = '';

initialize();

switchMode("wiki");
searchField.focus();

// ====================================================================================================
// Initialisierung
// ====================================================================================================
async function initialize() {
    try {
        // An FileMaker anmelden
        await loginToFileMaker();

        // GUI-Sprache basierend auf der Browsersprache festlegen
        guiLanguage = (navigator.language || navigator.userLanguage).startsWith('de') ? 'de-DE' : 'en-GB';

        // GUI-Übersetzungen für die gewählte Sprache laden
        await loadGuiTranslations(guiLanguage);

        // Sprachoptionen für das GUI laden und cachen
        await fetchAndCacheLanguageOptions(guiLanguage);

        // Quell-Termini für die Ausgangssprache laden
        await fetchSourceTermList(sourceLanguage);

        // Ziel-Termini für die Zielsprache laden
        await fetchTargetTermList(targetLanguage);

        // Titel des Tabs entsprechend den Sprachen setzen
        setTitle(sourceLanguage, targetLanguage);

        // Hier die Modustexte aktualisieren
        updateModeText(); // <--- Hinzufügen

        // Event-Listener für UI-Elemente initialisieren
        initializeEventListeners();

    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
    }
}

// ====================================================================================================
// Event Listener initialisieren
// ====================================================================================================
async function initializeEventListeners() {

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

    // -------------------------------------------------------------------------------------------------
    // Suchfeld und Vorschläge-Handling
    // -------------------------------------------------------------------------------------------------
    if (clearButton) {
        clearButton.addEventListener('click', clearTextInput); // Button zum Löschen des Suchfelds
    }

    if (searchField && !searchField.hasListeners) {
        searchField.addEventListener('input', (event) => handleInputEvent(event, 'input'));  // Event bei Benutzereingabe
        searchField.addEventListener('paste', (event) => handleInputEvent(event, 'paste'));  // Event bei Einfügen von Text
        searchField.addEventListener('keydown', (event) => handleKeyPressEvent(event));     // Event bei Tastatureingaben
        searchField.hasListeners = true;
    } else if (!searchField) {
        handleError('Text input element not found');
    }

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
                    suggestionsWrapper.style.display = 'none';
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
                    suggestionsWrapper.style.display = 'none';
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
    document.getElementById('profile-icon').addEventListener('click', async function () {

        // Modales Fenster öffnen
        document.getElementById('language-modal').style.display = 'block';

        try {
            // Sprachoptionen laden
            const languageData = await fetchAvailableLanguages(guiLanguage);
            populateLanguageOptions(languageData);  // Optionen in das Dropdown einfügen
        } catch (error) {
            console.error('Fehler beim Laden der Sprachoptionen:', error);
        }
    });

    document.querySelector('.close').addEventListener('click', function () {
        document.getElementById('language-modal').style.display = 'none';
    });

    document.getElementById('saveLanguageBtn').addEventListener('click', function () {
        const selectedLanguage = document.getElementById('language-selector').value;
        switchTargetLanguage(selectedLanguage);  // Funktion zur Zielsprache wechseln
        document.getElementById('language-modal').style.display = 'none';
    });

    setupLanguageToggle('language-toggle-links', 'links-container', 'links-container-target');


    // -------------------------------------------------------------------------------------------------
    // Logout
    // ------------------------------------------------------------------------------------------------- 
    // document.getElementById('logout-button').addEventListener('click', logout);

}

// ====================================================================================================
// Verwende initialSourceLanguage und initialTargetLanguage aus config.js
// ====================================================================================================
function getLanguageParamsFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        source: params.get('source') || config.initialSourceLanguage,
        target: params.get('target') || config.initialTargetLanguage || ''
    };
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
        el.classList.toggle('highlighted', i === index);
    });
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
    } catch (error) {
        logError('Error while loading the translations file.', error);
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
    wiki.classList.remove("active");
    inspector.classList.remove("active");
    translator.classList.remove("active");
    document.getElementById("mining-container").style.display = "none";
    document.getElementById("wiki-container").style.display = "none";

    if (mode === "wiki") {
        wiki.classList.add("active");
    } else if (mode === "inspector") {
        inspector.classList.add("active");
    } else if (mode === "translator") {
        translator.classList.add("active");
    }

    if (mode === "wiki") {
        document.getElementById("wiki-container").style.display = "block";
        if (searchField && searchField.value.trim()) {
            runTermMining();
        } else {
            document.getElementById('search-field').placeholder = 'Suche...';
        }
    } else if (mode === "inspector" || mode === "translator") {
        document.getElementById("mining-container").style.display = "block";
        if (!savedText) {
            document.getElementById('search-field').placeholder = 'Fügen Sie Text per Zwischenablage ein.';
            return;
        } else {
            displayMinedTerms(foundTerms, miningDiv, sourceLanguage, targetLanguage, sourceTermList, targetTermList);
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
    languageData.sort((a, b) => a.fieldData.language.localeCompare(b.fieldData.language));

    // Durch die sortierten Sprachdaten iterieren und Optionen hinzufügen
    languageData.forEach(language => {
        if (language.fieldData && language.fieldData.languageCode !== sourceLanguage) {
            const option = document.createElement('option');
            option.value = language.fieldData.languageCode;
            option.text = `${language.fieldData.language} (${language.fieldData.languageCode})`;

            // Überprüfen, ob die aktuelle Option der Zielsprache entspricht
            if (language.fieldData.languageCode === currentTargetLanguage) {
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
    try {
        console.log(`Lade Begriffe für die Zielsprache: ${targetLanguage}`);
        await fetchTargetTermList(targetLanguage);
        console.log('Zielsprach-Begriffe erfolgreich geladen');
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
    } else {
        console.log('Nutzer ist nicht im Wiki-Modus. Keine Aktualisierung des Wiki-Inhalts erforderlich.');
    }
}

// ====================================================================================================
// Suchfeld
// ====================================================================================================
function handleInputEvent(event, eventType) {
    try {
        const currentMode = getCurrentMode();
        const query = event.target.value.trim();

        // console.log(`Event Type: ${eventType}`);
        // console.log(`Current Mode: ${currentMode}`);
        // console.log(`Query: "${query}"`);

        if (eventType === 'input') {
            if (query !== "" && (currentMode === 'wiki' || currentMode === 'inspector')) {
                switchMode('wiki');
            }
            showSuggestions(sourceTermList, query);
            toggleClearButton();
        } else if (eventType === 'paste') {
            setTimeout(() => {
                const query = event.target.value.trim(); // Abrufen des Wertes nach dem Einfügen

                // Speichern des eingefügten Textes
                savedText = query;
                // console.log('Text saved after paste:', savedText);

                // Leeren des Suchfeldes
                searchField.value = '';
                searchField.dispatchEvent(new Event('input')); // Löst das Input-Event aus

                if (query !== "") {
                    switchMode('inspector');
                }
                runTermMining();
            }, 10); // Eine kurze Verzögerung, um sicherzustellen, dass der eingefügte Wert verfügbar ist
        }
    } catch (error) {
        handleError(`Error in ${eventType} event listener`, error);
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
                runTermMining();
                toggleClearButton();
            }
        }
    } catch (error) {
        logError('Fehler bei Tastatureingabe', error);
    }
}

function toggleClearButton() {
    if (searchField.value.trim() !== "") {
        clearButton.style.display = 'block';
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
        const data = await getFileMakerTerms(language);
        sourceTermList = parseTermList(data);
        console.log(`Termliste geladen: ${language}`);
    } catch (error) {
        console.error('Fehler beim Laden der Termliste:', error);
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
        const data = await getFileMakerTerms(language);
        targetTermList = parseTermList(data);
        console.log(`Termliste geladen: ${language}`);
    } catch (error) {
        console.error('Fehler beim Laden der Termliste:', error);
    } finally {
        hideLoadingIndicator();
    }
}

// ====================================================================================================
// Sprachoptionen laden
// ====================================================================================================
let cachedLanguageOptions = null;
async function fetchAndCacheLanguageOptions(guiLanguage) {
    // Überprüfe, ob die Sprachdaten bereits im SessionStorage vorhanden sind
    const cachedData = sessionStorage.getItem('languageData');
    if (cachedData) {
        cachedLanguageOptions = JSON.parse(cachedData);
        return; // Keine API-Abfrage nötig
    }

    try {
        // Wenn keine zwischengespeicherten Daten im SessionStorage vorhanden sind, hole sie vom Server
        cachedLanguageOptions = await fetchAvailableLanguages(guiLanguage);
        if (cachedLanguageOptions && cachedLanguageOptions.length > 0) {
            // Speichere die Daten im SessionStorage für zukünftige Sitzungen
            sessionStorage.setItem('languageData', JSON.stringify(cachedLanguageOptions));
        } else {
            logWarning('Keine Sprachdaten gefunden.');
        }
    } catch (error) {
        handleError('Fehler beim Abrufen der Sprachdaten', error);
    }
}

//====================================================================================================
// Parst eine Liste von Objekten und extrahiert Begriffe aus dem 'termlist'-Feld.
//====================================================================================================
function parseTermList(data) {
    return data.flatMap(item => {
        const termlistField = item.fieldData.termlist;
        if (termlistField) {
            try {
                const terms = JSON.parse(termlistField);
                return terms.map(term => ({
                    conceptID: term[0],
                    term: term[1],
                    weighting: term[2]
                }));
            } catch (e) {
                handleError('Error parsing termlistField', e);
            }
        }
        return [];
    });
}

function showSuggestions(sourceTermList, query) {
    const suggestionsDiv = document.getElementById('suggestions');

    if (!suggestionsDiv) {
        return;
    }

    suggestionsDiv.innerHTML = '';

    if (query.length === 0) {
        if (!hasMoved) {
            suggestionsWrapper.style.display = 'none';
        }
        return;
    }

    const normalizedQuery = query.normalize('NFD').replace(/[̀-ͯ]/g, '');
    try {
        const regex = new RegExp(searchMode === 'contains' ? sanitizeRegexString(normalizedQuery) : `^${sanitizeRegexString(normalizedQuery)}`, 'i');

        const matchedTerms = sourceTermList.filter(term => regex.test(term.term.normalize('NFD').replace(/[̀-ͯ]/g, '')));

        if (matchedTerms.length === 0) {
            if (!hasMoved) {
                suggestionsWrapper.style.display = 'none';
            }
            return;
        }

        matchedTerms.forEach(term => {
            const div = document.createElement('div');
            div.classList.add('suggestion');

            if (term.weighting === 0) {
                div.classList.add('rejected-suggestion');
            }

            div.innerHTML = highlightMatch(term.term, query);

            div.addEventListener('click', () => {
                if (!hasMoved) {
                    suggestionsWrapper.style.display = 'none';
                }
                showWiki(term.term, term.conceptID, sourceLanguage, targetLanguage);
            });

            suggestionsDiv.appendChild(div);
        });

        const allSuggestions = suggestionsDiv.querySelectorAll('.suggestion');
        selectedSuggestionIndex = -1;
        highlightSuggestionAtIndex(selectedSuggestionIndex, allSuggestions);

        suggestionsWrapper.style.display = 'block';

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
    if (!searchField || !sourceTermList.length) {
        alert('Die JSON-Datei wurde nicht geladen oder ist leer.');
        return;
    }

    const text = searchField.value.trim();
    if (!text) {
        alert('Bitte geben Sie einen Text ein.');
        return;
    }

    const foundTerms = extractTermsFromText(text);
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
                term,
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

function clearTextInput() {
    if (searchField && miningDiv) {
        searchField.value = ''; // Leert das Suchfeld
        searchField.dispatchEvent(new Event('input')); // Löst das 'input'-Event aus
        miningDiv.innerHTML = ''; // Leert die Ergebnisliste
        toggleClearButton();
    }
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

        const sourceLanguageData = cachedLanguageOptions.find(lang => lang.fieldData.languageCode === sourceLanguage);
        const targetLanguageData = cachedLanguageOptions.find(lang => lang.fieldData.languageCode === targetLanguage);

        const sourceLanguageName = sourceLanguageData
            ? sourceLanguageData.fieldData.language
            : sourceLanguage.toUpperCase();
        const targetLanguageName = targetLanguageData
            ? targetLanguageData.fieldData.language
            : targetLanguage.toUpperCase();

        // Hier werden zwei schmale Leerzeichen (&thinsp;) verwendet
        const wikiText = `${sourceLanguageName} &thinsp;&thinsp;|&thinsp;&thinsp; ${targetLanguageName}`;
        const inspectorText = `${sourceLanguageName}`;
        const translatorText = `${sourceLanguageName} ➔ ${targetLanguageName}`;

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
        { selector: '#loading', key: 'loading' }
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
}

// ====================================================================================================
// Wiki
// ====================================================================================================
export async function showWiki(term, conceptID, sourceLanguage, targetLanguage) {

    selectedTerm = term;
    selectedConceptID = conceptID;

    if (!conceptID) {
        console.log('Kein gültiger conceptID vorhanden. showWiki wird nicht ausgeführt.');
        return;  // Funktion wird abgebrochen, wenn kein conceptID vorhanden ist
    }

    try {
        // Begriffsdetails abrufen
        const conceptDetails = await getFileMakerConceptDetails(config, conceptID);

        if (!conceptDetails || conceptDetails === 'null') {
            console.error('Keine Begriffsdetails verfügbar.');
            return;
        }

        const parsedConceptDetails = typeof conceptDetails === 'string' ? JSON.parse(conceptDetails) : conceptDetails;
        if (!parsedConceptDetails || parsedConceptDetails.length === 0) {
            console.error('Keine Begriffsdetails verfügbar');
            return;
        }

        createWikiLanguageMenus(parsedConceptDetails);
        prepareConceptDetails(parsedConceptDetails, sourceLanguage, targetLanguage, config.imagePath);

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
function createWikiLanguageMenus(parsedConceptDetails) {
    const sections = ['synonyms', 'definition', 'context', 'info', 'infobox', 'links']; // Wiki-Abschnitte

    sections.forEach(section => {
        createLanguageMenuForSection(section, parsedConceptDetails); // Verwende die bereits erstellte Funktion
    });
}

// Funktion zur Erstellung eines Sprachmenüs 
function createLanguageMenuForSection(section, parsedConceptDetails) {
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
    const sourceContentExists = parsedConceptDetails.some(detail =>
        detail.languageCode === sourceLanguage && (
            section === 'synonyms'
                ? detail.terms.length > 1 // Synonyme sind nur vorhanden, wenn mehr als ein Terminus existiert
                : detail[section]?.trim() !== '' // Für andere Abschnitte prüfen wir, ob Inhalte vorhanden sind
        )
    );
    if (sourceContentExists) {
        availableLanguages.push(sourceLanguage);
    }

    // Prüfe, ob für die Zielsprache Inhalte vorhanden sind
    const targetContentExists = parsedConceptDetails.some(detail =>
        detail.languageCode === targetLanguage && (
            section === 'synonyms'
                ? detail.terms.length > 1 // Synonyme sind nur vorhanden, wenn mehr als ein Terminus existiert
                : detail[section]?.trim() !== '' // Für andere Abschnitte prüfen wir, ob Inhalte vorhanden sind
        )
    );
    if (targetContentExists) {
        availableLanguages.push(targetLanguage);
    }

    // Vorhandene Sprachen als Buttons anzeigen
    languageToggleElement.innerHTML = '';  // Leeren, falls vorherige Einträge existieren
    allLanguages.forEach((lang, index) => {
        const langCode = lang.substring(0, 2);
        const button = document.createElement('button');
        button.classList.add('language-option');

        // Wenn die Sprache verfügbar ist, zeige den Sprachcode
        if (availableLanguages.includes(lang)) {
            button.textContent = langCode;
            button.setAttribute('data-lang', langCode);

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
            button.textContent = '–';
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
function prepareConceptDetails(details, sourceLanguage, targetLanguage, imagePath) {
    if (!details) {
        console.error('Keine Details verfügbar, um angezeigt zu werden');
        return;
    }

    // Daten sammeln und strukturieren
    const conceptData = {
        preferredTermSource: '–',
        preferredTermTarget: '–',
        synonymsSource: { alternative: [], rejected: [] },
        synonymsTarget: { alternative: [], rejected: [] },
        definitionSource: '',
        definitionTarget: '',
        footnoteSource: [],
        footnoteTarget: [],
        contextDataSource: [],
        contextDataTarget: [],
        infoDataSource: [],
        infoDataTarget: [],
        infoboxContentSource: '',
        infoboxContentTarget: '',
        linksSource: [],
        linksTarget: [],
        fileName: ''
    };

    // Verarbeite die Sprachdaten für die Ausgangssprache
    details.forEach(detail => {
        if (detail.languageCode === sourceLanguage) {
            extractAndProcessConceptData(detail, conceptData, 'source');
            conceptData.preferredTermSource = detail.terms.find(term => term.weighting === 2)?.term || 'Keine Übersetzung';
            conceptData.infoboxContentSource = detail.infobox || '';
            conceptData.fileName = detail.fileName || '';
        }

        // Verarbeite die Sprachdaten für die Zielsprache, falls vorhanden
        if (targetLanguage && detail.languageCode === targetLanguage) {
            extractAndProcessConceptData(detail, conceptData, 'target');
            conceptData.preferredTermTarget = detail.terms.find(term => term.weighting === 2)?.term || 'Keine Übersetzung';
            conceptData.infoboxContentTarget = detail.infobox || '';  // Zielsprache Infobox-Daten speichern
        }
    });

    // Übergabe der strukturierten Daten an updateDOMElements
    updateDOMElements(conceptData, targetLanguage, imagePath);
}

function extractAndProcessConceptData(detail, conceptData, type) {
    // Verarbeitung der Definition und Fußnoten
    if (detail.definition) {
        try {
            const definitionObject = JSON.parse(detail.definition)[0];  // Erstes Element aus dem Array extrahieren
            if (type === 'source') {
                if (definitionObject.definition.trim()) {
                    conceptData.definitionSource = definitionObject.definition;
                }
                if (definitionObject.footnote.trim()) {
                    conceptData.footnoteSource.push(definitionObject.footnote);
                }
            } else if (type === 'target') {
                if (definitionObject.definition.trim()) {
                    conceptData.definitionTarget = definitionObject.definition;
                }
                if (definitionObject.footnote.trim()) {
                    conceptData.footnoteTarget.push(definitionObject.footnote);
                }
            }
        } catch (e) {
            console.error('Fehler beim Parsen der Definition:', e);
        }
    }

    // Synonyme
    detail.terms.forEach(term => {
        if (term.weighting === 1) {
            type === 'source' ? conceptData.synonymsSource.alternative.push(term.term) : conceptData.synonymsTarget.alternative.push(term.term);
        } else if (term.weighting === 0) {
            type === 'source' ? conceptData.synonymsSource.rejected.push(term.term) : conceptData.synonymsTarget.rejected.push(term.term);
        }
    });

    // Komtext
    if (detail.context) {
        try {
            const parsedContext = JSON.parse(detail.context);
            type === 'source' ? conceptData.contextDataSource.push(...parsedContext) : conceptData.contextDataTarget.push(...parsedContext);
        } catch (e) {
            console.error('Fehler beim Parsen der Kontextdaten:', e);
        }
    }

    // Info
    if (detail.info) {
        try {
            const parsedInfo = JSON.parse(detail.info);
            type === 'source' ? conceptData.infoDataSource.push(...parsedInfo) : conceptData.infoDataTarget.push(...parsedInfo);
        } catch (e) {
            console.error('Fehler beim Parsen der Infodaten:', e);
        }
    }

    // HyperLinks
    function convertHyperLinks(hyperLinks = []) {
        /*  Erwartetes Format aus FileMaker:
            [
            { "label": "…", "link": "…" },
            …
            ]                                                   */
        return hyperLinks.map(entry => ({
            label: entry.label,
            link: entry.link
        }));
    }

    if (detail.hyperLink) {
        try {
            const parsedLinks = Array.isArray(detail.hyperLink)
                ? detail.hyperLink          // kommt als Array
                : JSON.parse(detail.hyperLink); // kommt als JSON-String

            if (type === 'source') {
                conceptData.linksSource.push(...convertHyperLinks(parsedLinks));
            } else {
                conceptData.linksTarget.push(...convertHyperLinks(parsedLinks));
            }
        } catch (e) {
            console.error('Fehler beim Parsen der HyperLinks:', e);
        }
    }

}

function updateDOMElements(conceptData, targetLanguage, imagePath) {
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
        const termTitle = `${preferredTermSource}${preferredTermTarget ? ` | <span class="target-language">${preferredTermTarget}</span>` : ''}`;
        const stars = `<span style="float: right;">⭐⭐</span>`;
        termTitleElement.innerHTML = `${stars}${termTitle}`;
    }

    // Bild anzeigen
    checkAndDisplayImage(fileName, imagePath);

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

// ====================================================================================================
// Synonyme darstellen
// ====================================================================================================

function generateSynonymsContent(synonyms) {
    if (synonyms.alternative.length === 0 && synonyms.rejected.length === 0) {
        return '';
    }
    let content = '<table class="synonyms-table">';

    const alternativeIcon = '⭐'; // Symbol für Alternativbegriffe
    synonyms.alternative.forEach(term => {
        const isSelected = term === selectedTerm; // Überprüfen, ob dies die gewählte Benennung ist
        content += `<tr><td>${alternativeIcon}</td><td><span class="${isSelected ? 'highlighted-term' : ''}">${term}</span></td></tr>`;
    });

    const rejectedIcon = '🚫'; // Symbol für abgelehnte Begriffe
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
    if (imgContainer) imgContainer.style.display = 'none';
    if (termImage) termImage.style.display = 'none';
}

function showImageElements(imgContainer, termImage) {
    if (imgContainer) imgContainer.style.display = 'block';
    if (termImage) termImage.style.display = 'block';
}

// ====================================================================================================
// Bilddatei verarbeiten
// ====================================================================================================

async function checkAndDisplayImage(fileName, imagePath) {
    logNot(`checkAndDisplayImage aufgerufen mit fileName: ${fileName}`);

    const imgContainer = document.getElementById('image-container');
    const termImage = document.getElementById('term-image');

    if (!fileName || !imgContainer || !termImage) {
        logWarning('Fehlender fileName oder HTML-Elemente nicht gefunden.');
        hideImageElements(imgContainer, termImage);
        return;
    }

    const imageUrl = `${imagePath}${fileName}`;
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
// Direkter Wechsel der Modi durch Klick
// ====================================================================================================
document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', function () {
        document.querySelector('.mode-option.active').classList.remove('active');
        this.classList.add('active');
        // Weitere Aktionen für den Moduswechsel hier
    });
});

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
        miningDiv.innerHTML = `<p>${message}</p>`;
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
// Termmining
//====================================================================================================
function runTermMining() {
    foundTerms = termMining(savedText, sourceTermList, miningDiv, searchField, sourceLanguage, targetLanguage, targetTermList);
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
