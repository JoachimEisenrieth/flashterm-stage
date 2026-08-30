import { getImageBasePath } from './image-path.js';

export function usesPublishedTerminology(config) {
    return config?.dataSource === 'published';
}

export function resolvePublishedTermbaseConfig(config, search = '') {
    if (!usesPublishedTerminology(config)) {
        return config;
    }

    const requestedTermbaseId = new URLSearchParams(search).get('termbase')?.trim();
    return requestedTermbaseId
        ? { ...config, termbaseId: requestedTermbaseId }
        : config;
}

export function getTermbaseSelectionUrl(currentUrl, termbaseId) {
    const url = new URL(currentUrl);
    url.searchParams.set('termbase', termbaseId);
    url.searchParams.delete('source');
    url.searchParams.delete('target');
    return url.toString();
}

export function getTerminologyCacheKey(config) {
    if (usesPublishedTerminology(config)) {
        const termbaseId = typeof config?.termbaseId === 'string'
            ? config.termbaseId.trim()
            : '';
        const publicationId = typeof config?.publicationId === 'string'
            ? config.publicationId.trim()
            : '';
        const termbaseKey = termbaseId
            ? `languageData:termbase:${termbaseId}`
            : 'languageData:termbase';
        return publicationId
            ? `${termbaseKey}:publication:${publicationId}`
            : termbaseKey;
    }

    const databaseName = typeof config?.database === 'string' ? config.database.trim() : '';
    return databaseName ? `languageData:${databaseName}` : 'languageData';
}

export function getTerminologyImageBasePath(config, fallbackOrigin = '') {
    if (usesPublishedTerminology(config)) {
        const termbaseId = typeof config?.termbaseId === 'string'
            ? config.termbaseId.trim()
            : '';
        if (!termbaseId || !fallbackOrigin) {
            return '';
        }
        return new URL(
            `/api/termbases/${encodeURIComponent(termbaseId)}/assets/`,
            fallbackOrigin
        ).toString();
    }

    return getImageBasePath(config?.server, config?.database, fallbackOrigin);
}
