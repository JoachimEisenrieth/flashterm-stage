// ====================================================================================================
// © 2025 Eisenrieth Digital Solutions. Alle Rechte vorbehalten.
// * Dateiname: filemaker-api.js
// * Version: 1.3.0
// * Datum: 2025-07-19
// * Autor: Joachim Eisenrieth
// * Beschreibung: Zentrale Steuerung der Kommunikation mit FileMaker
// ====================================================================================================

import { config } from './config.js'; 
export { config };

// ====================================================================================================
// In FileMaker einloggen
// ====================================================================================================
export async function loginToFileMaker() {
    if (!config) {
        throw new Error('Configuration is missing.');
    }

    try {
        const { server, database, username, password } = config;
        const loginUrl = `${server}/fmi/data/vLatest/databases/${database}/sessions`;
        const loginData = JSON.stringify({ fmDataSource: [{ database, username, password }] });

        console.log(`Login-URL: ${loginUrl}`);
        console.log(`Login-Daten: ${loginData}`);

        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + btoa(`${username}:${password}`)  // Basisauthentifizierung
            },
            body: loginData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP-Fehler beim Login: ${response.status} - ${response.statusText}`);
            console.error(`Server-Antwort: ${errorText}`);
            throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        const token = data.response.token;

        if (!token) {
            throw new Error('Token konnte nicht abgerufen werden.');
        }

        // Setze die Ablaufzeit auf 15 Minuten (900 Sekunden) nach dem Login
        const expiresInSeconds = 900;  // 15 Minuten (FileMaker Vorgabe)
        const expirationTime = new Date().getTime() + (expiresInSeconds * 1000);  // Ablaufzeit berechnen
        sessionStorage.setItem('fmToken', token);
        sessionStorage.setItem('fmTokenExpiration', expirationTime.toString());

        // console.log('Token erfolgreich abgerufen und gespeichert:', token);
        // console.log('Ablaufzeit des Tokens gesetzt auf:', new Date(expirationTime).toLocaleString());

        return token;

    } catch (error) {
        console.error('Login-Fehler:', error.message || error);
        throw new Error('Login fehlgeschlagen. Bitte überprüfe die Zugangsdaten.');
    }
}

// ====================================================================================================
// Token abrufen bzw. erneuern
// ====================================================================================================
export async function renewFileMakerToken() {
    let token = sessionStorage.getItem('fmToken');
    let expirationTime = sessionStorage.getItem('fmTokenExpiration');

    if (!token || isFileMakerTokenExpired(expirationTime)) {
        console.log('Token abgelaufen oder nicht vorhanden. Hole neues Token...');
        token = await loginToFileMaker();  // Hole ein neues Token, wenn es abgelaufen ist
        expirationTime = new Date().getTime() + 15 * 60 * 1000; // Ablaufzeit auf 15 Minuten setzen
        sessionStorage.setItem('fmToken', token);
        sessionStorage.setItem('fmTokenExpiration', expirationTime.toString());
        // console.log('Neues Token erhalten:', token);
        // console.log('Neues Ablaufdatum gesetzt:', new Date(expirationTime).toLocaleString());
    } else {
        // Ablaufzeit nach jeder Nutzung verlängern
        expirationTime = new Date().getTime() + 15 * 60 * 1000; // Ablaufzeit auf 15 Minuten setzen
        sessionStorage.setItem('fmTokenExpiration', expirationTime.toString());
        // console.log('Token ist noch gültig. Ablaufdatum wurde verlängert:', new Date(expirationTime).toLocaleString());
    }
    return token;
}

//====================================================================================================
// Prüfen, ob Token abgelaufen ist
//====================================================================================================
export function isFileMakerTokenExpired(expirationTime) {
    const now = new Date().getTime();

    // console.log('Aktuelle Zeit:', new Date(now).toLocaleString());
    // console.log('Token Ablaufzeit:', expirationTime ? new Date(parseInt(expirationTime)).toLocaleString() : 'Kein Ablaufzeitpunkt gefunden');

    if (!expirationTime || isNaN(expirationTime)) {
        console.warn('Kein gültiges Ablaufdatum für das Token gefunden.');
        return true;  // Wenn keine oder ungültige Ablaufzeit vorhanden ist, betrachte das Token als abgelaufen
    }
    return now > parseInt(expirationTime);  // Vergleiche die aktuelle Zeit mit der Ablaufzeit
}

//====================================================================================================
// Sprachoptionen abrufen
//====================================================================================================
export async function fetchAvailableLanguages(guiLanguageCode) {
    const { server, database } = config;
    const token = await renewFileMakerToken();  // Stelle sicher, dass ein gültiges Token vorhanden ist

    const dataUrl = `${server}/fmi/data/vLatest/databases/${database}/layouts/languageAPI/_find`;
    const query = JSON.stringify({ query: [{ guiLanguageCode }] });

    // console.log('Lade Sprachen für GUI-Sprache:', guiLanguageCode);
    // console.log('Anfrage-URL:', dataUrl);
    // console.log('Verwendetes Token:', token);  // Token wird verwendet

    try {
        const response = await fetch(dataUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Verwende das richtige Token
            },
            body: query
        });

        if (response.ok) {
            const data = await response.json();
            const availableLanguages = data.response.data;
            console.log('Sprachdaten erfolgreich abgerufen:', availableLanguages);

            // Sprachen im SessionStorage speichern
            sessionStorage.setItem('availableLanguages', JSON.stringify(availableLanguages));

            return availableLanguages;
        } else {
            const errorText = await response.text();
            console.error(`HTTP Fehler: ${response.status}`);
            console.error(`Fehlernachricht: ${errorText}`);
            throw new Error(`HTTP Fehler: ${response.status}`);
        }
    } catch (error) {
        throw new Error(`Fehler beim Laden der Sprachdaten: ${error.message}`);
    }
}

//====================================================================================================
// Termini abrufen
//====================================================================================================
export async function getFileMakerTerms(languageCode) {
    const { server, database } = config;
    const dataUrl = `${server}/fmi/data/vLatest/databases/${database}/layouts/termAPI/_find`;
    const query = JSON.stringify({ query: [{ languageCode }] });

    // console.log(`[TermAPI] Anfrage-URL: ${dataUrl}`);
    // console.log(`[TermAPI] Query: ${query}`);

    try {
        // Token überprüfen und ggf. erneuern
        const token = await renewFileMakerToken();

        const response = await fetch(dataUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`  // Gültiges Token verwenden
            },
            body: query
        });

        if (response.ok) {
            const data = await response.json();
            console.log('[TermAPI] Daten erfolgreich von FileMaker abgerufen:', data);
            return data.response.data;
        } else {
            const errorText = await response.text();
            console.error(`[TermAPI] HTTP-Fehler: ${response.status} - ${response.statusText}`);
            console.error(`[TermAPI] Fehlernachricht: ${errorText}`);
            throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error('Fetch-Datenfehler:', error);
        throw new Error(`Fetch data error: ${error.message}`);
    }
}

//====================================================================================================
// Begriffe abrufen
//====================================================================================================
export async function getFileMakerConceptDetails(config, conceptID) {
    const { server, database } = config;
    const url = `${server}/fmi/data/vLatest/databases/${database}/layouts/definitionAPI/_find`;

    const query = {
        query: [
            {
                conceptID: conceptID
            }
        ]
    };

    console.log('[definitionAPI] Sende Anfrage mit conceptID:', conceptID);
    console.log('[definitionAPI] POST-URL:', url);
    console.log('[definitionAPI] Abfrageinhalt:', query);

    try {
        // Token überprüfen und ggf. erneuern
        const token = await renewFileMakerToken();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`  // Gültiges Token verwenden
            },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        // console.log('[definitionAPI] Antwortdaten:', data);  // strukturiert
        console.log('[definitionAPI] Antwortdaten (formatiert):\n' + JSON.stringify(data, null, 2)); // optional formatiert

        if (data.response && data.response.data && data.response.data.length > 0) {
            console.log(`[definitionAPI] ${data.response.data.length} Begriffe erfolgreich geladen für conceptID: ${conceptID}`);

            return data.response.data.map(item => {
                const termDetails = item.fieldData;
                if (termDetails.termlist) {
                    try {
                        termDetails.terms = JSON.parse(termDetails.termlist);
                    } catch (e) {
                        console.log('[definitionAPI] Fehler beim Parsen von "termlist":', e);
                    }
                }
                return termDetails;
            });
        } else {
            console.warn(`[definitionAPI] Keine Begriffe gefunden für conceptID: ${conceptID}`);
            return null;
        }
    } catch (error) {
        console.error('[definitionAPI] Fehler beim Abrufen der Begriffe:', error);
        return null;
    }
}

//====================================================================================================
// Logout
//====================================================================================================
export async function logoutFromFileMaker() {
    const token = sessionStorage.getItem('fmToken');
    if (!token) return;  // Falls kein Token vorhanden ist, nichts tun

    try {
        const { server, database } = config;  // Hole die Server- und Datenbankinformationen aus deiner Konfiguration
        const logoutUrl = `${server}/fmi/data/vLatest/databases/${database}/sessions/${token}`;

        const response = await fetch(logoutUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            console.log('Token erfolgreich invalidiert.');
            sessionStorage.removeItem('fmToken');  // Entferne das Token aus dem sessionStorage
        } else {
            console.error(`Fehler bei der Token-Invalidierung: ${response.status}`);
        }
    } catch (error) {
        console.error('Fehler beim Abmelden:', error);
    }
}
