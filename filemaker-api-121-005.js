// ====================================================================================================
// © 2025 Eisenrieth Digital Solutions. Alle Rechte vorbehalten.
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
            console.error(`HTTP-Fehler beim Login: ${response.status} - ${response.statusText}`);
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

        // console.log('Ablaufzeit des Tokens gesetzt auf:', new Date(expirationTime).toLocaleString());

        return token;

    } catch (error) {
        console.error('Login-Fehler.');
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
            console.log('Sprachdaten erfolgreich abgerufen.');

            // Sprachen im SessionStorage speichern
            sessionStorage.setItem('availableLanguages', JSON.stringify(availableLanguages));

            return availableLanguages;
        } else {
            console.error(`HTTP Fehler: ${response.status}`);
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
            console.log('[TermAPI] Daten erfolgreich von FileMaker abgerufen.');
            return data.response.data;
        } else {
            console.error(`[TermAPI] HTTP-Fehler: ${response.status} - ${response.statusText}`);
            throw new Error(`HTTP error: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Termini.');
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
        if (data.response && data.response.data && data.response.data.length > 0) {
            console.log('[definitionAPI] Begriffsdetails erfolgreich geladen.');

            return data.response.data.map(item => {
                const termDetails = item.fieldData;
                if (termDetails.termlist) {
                    try {
                        termDetails.terms = JSON.parse(termDetails.termlist);
                    } catch (e) {
                        console.error('[definitionAPI] Fehler beim Parsen der Terminliste.');
                    }
                }
                return termDetails;
            });
        } else {
            console.warn('[definitionAPI] Keine Begriffsdetails gefunden.');
            return null;
        }
    } catch (error) {
        console.error('[definitionAPI] Fehler beim Abrufen der Begriffsdetails.');
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
        console.error('Fehler beim Abmelden.');
    }
}
