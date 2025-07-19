// term-mining.js

import { showWiki } from './flashterm.js';

// Hauptfunktion, die das Term-Mining auslöst
export function termMining(savedText, sourceTermList, miningDiv, searchField, sourceLanguage, targetLanguage, targetTermList) {
    if (!searchField || !miningDiv) {
        console.error('Required elements for Term Mining function are missing');
        return;
    }

    miningDiv.innerHTML = '';

    const foundTerms = extractTermsFromText(savedText.trim(), sourceTermList);

    displayMinedTerms(foundTerms, miningDiv, sourceLanguage, targetLanguage, sourceTermList, targetTermList);

    miningDiv.focus();

    setupExportClickHandlers();

    return foundTerms;
}

// Funktion zum Finden von Begriffen im übergebenen Text
export function extractTermsFromText(text, termList) {
    const foundTerms = { preferred: {}, alternative: {}, rejected: {} };
    const termOccurrences = {};
    const normalizedText = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const sortedTermList = [...termList].sort((a, b) => b.term.length - a.term.length);

    sortedTermList.forEach(term => {
        const normalizedTerm = term.term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        try {
            const regex = new RegExp(`\\b${sanitizeRegexString(normalizedTerm)}\\b`, 'gi');
            let match;
            while ((match = regex.exec(normalizedText)) !== null) {
                const foundTerm = match[0];
                let category;
                switch (term.weighting) {
                    case 2: category = 'preferred'; break;
                    case 1: category = 'alternative'; break;
                    case 0: category = 'rejected'; break;
                    default:
                        console.error('Unknown weighting:', term.weighting);
                        continue;
                }
                if (!termOccurrences[foundTerm]) {
                    termOccurrences[foundTerm] = [];
                }
                termOccurrences[foundTerm].push({
                    position: match.index,
                    category,
                    conceptID: term.conceptID,
                    originalTerm: term.term,
                    preferredTerm: category !== 'preferred' ? retrievePreferredTerm(term.conceptID, termList) : ''
                });
            }
        } catch (e) {
            console.error('Regex Error', e);
        }
    });

    for (const term in termOccurrences) {
        const occurrences = termOccurrences[term];
        occurrences.forEach(occurrence => {
            if (!isPartOfLongerTerm(occurrence.position, term, termOccurrences)) {
                if (!foundTerms[occurrence.category][term]) {
                    foundTerms[occurrence.category][term] = {
                        count: 0,
                        conceptID: occurrence.conceptID,
                        originalTerm: occurrence.originalTerm,
                        preferredTerm: occurrence.preferredTerm
                    };
                }
                foundTerms[occurrence.category][term].count += 1;
            }
        });
    }

    return foundTerms;
}

// Hilfsfunktion zum Escapen von RegEx-Zeichen
export function sanitizeRegexString(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Prüft, ob ein Begriff Teil eines längeren Fundes ist
export function isPartOfLongerTerm(position, term, termOccurrences) {
    for (const longerTerm in termOccurrences) {
        if (longerTerm.length > term.length) {
            const occurrences = termOccurrences[longerTerm];
            for (const occurrence of occurrences) {
                if (occurrence.position <= position &&
                    occurrence.position + longerTerm.length >= position + term.length) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Gibt den bevorzugten Begriff eines Konzepts zurück
export function retrievePreferredTerm(conceptID, termList) {
    const preferredTerm = termList.find(term => term.conceptID === conceptID && term.weighting === 2);
    return preferredTerm ? preferredTerm.term : '–';
}

// Fügt Export-Listener nur einmal hinzu
export function setupExportClickHandlers() {
    const exportIcons = document.querySelectorAll('.export-icon');
    exportIcons.forEach(icon => {
        if (!icon.hasListener) {
            icon.addEventListener('click', exportTableToExcel);
            icon.hasListener = true;
        }
    });
}

// Zeigt alle gefundenen Begriffe gruppiert und mit Symbolen an
export function displayMinedTerms(foundTerms, miningDiv, sourceLanguage, targetLanguage, sourceTermList, targetTermList) {
    const languageNames = {
        de: 'Deutsch',
        en: 'Englisch',
        fr: 'Französisch',
    };

    const isTranslatorMode = document.getElementById("translator").classList.contains("active");
    const sourceLanguageName = languageNames[sourceLanguage.substring(0, 2)] || sourceLanguage;
    const targetLanguageName = languageNames[targetLanguage.substring(0, 2)] || targetLanguage;

    const createTableRow = (term, count, category, preferredTerm) => {
        let symbol = '';
        switch (category) {
            case 'rejected': symbol = '🚫'; break;
            case 'alternative': symbol = '⭐'; break;
            case 'preferred': symbol = '⭐⭐'; break;
        }

        if (!isTranslatorMode && term.originalTerm === preferredTerm) {
            return `<tr><td colspan="2" style="width: 100%;">${symbol} <span class="term-clickable" data-concept-id="${term.conceptID}" data-source-language="${sourceLanguage}" data-target-language="${targetLanguage}">${term.originalTerm}</span> (${count})</td></tr>`;
        }

        const translation = preferredTerm || '–';
        return `<tr>
            <td style="width: 50%;">${symbol} <span class="term-clickable" data-concept-id="${term.conceptID}" data-source-language="${sourceLanguage}" data-target-language="${targetLanguage}">${term.originalTerm}</span> (${count})</td>
            <td style="width: 50%;" class="term-clickable" data-concept-id="${term.conceptID}" data-source-language="${sourceLanguage}" data-target-language="${targetLanguage}">${translation}</td>
        </tr>`;
    };

    const createCategorySection = (terms, category) => {
        return Object.entries(terms).map(([termKey, { conceptID, originalTerm, count }]) => {
            const termList = isTranslatorMode ? targetTermList : sourceTermList;
            const preferredTerm = retrievePreferredTerm(conceptID, termList);
            return createTableRow({ conceptID, originalTerm }, count, category, preferredTerm);
        }).join('');
    };

    const preferredLanguageName = isTranslatorMode ? targetLanguageName : sourceLanguageName;
    let tableContent = `
        <table class="term-table">
            <thead>
                <tr><th>Gefundene Termini (Anzahl)</th><th>Bevorzugte Termini</th></tr>
                <tr><th>${sourceLanguageName}</th><th>${preferredLanguageName}</th></tr>
            </thead>
            <tbody>
                ${createCategorySection(foundTerms.rejected, 'rejected')}
                ${createCategorySection(foundTerms.alternative, 'alternative')}
                ${createCategorySection(foundTerms.preferred, 'preferred')}
            </tbody>
        </table>`;

    miningDiv.innerHTML = tableContent;

    const iconContainer = document.createElement('div');
    iconContainer.style.position = 'relative';

    const exportIcon = document.createElement('img');
    exportIcon.src = 'svg/export-icon-light.svg';
    exportIcon.classList.add('export-icon');
    iconContainer.appendChild(exportIcon);
    miningDiv.appendChild(iconContainer);

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        exportIcon.src = 'svg/export-icon-dark.svg';
    }

    exportIcon.addEventListener('click', exportTableToExcel);

    document.querySelectorAll('.term-clickable').forEach(element => {
        element.addEventListener('click', function () {
            const conceptID = this.getAttribute('data-concept-id');
            const sourceLanguage = this.getAttribute('data-source-language');
            const targetLanguage = this.getAttribute('data-target-language');
            showWiki(this.textContent, conceptID, sourceLanguage, targetLanguage);
        });
        element.addEventListener('mouseover', () => element.style.textDecoration = 'underline');
        element.addEventListener('mouseout', () => element.style.textDecoration = 'none');
    });
}

// Exportiert die Tabelle nach Excel
function exportTableToExcel() {
    const table = document.querySelector('.term-table');
    if (!table) {
        console.error('No table found to export');
        return;
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Termini');
    XLSX.writeFile(workbook, 'mined_terms.xlsx');
}