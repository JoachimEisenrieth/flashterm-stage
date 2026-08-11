const LANGUAGE_CACHE_VERSION = 2;

export function parseLanguageCache(serializedCache, guiLanguage) {
    try {
        const cache = JSON.parse(serializedCache);
        if (
            cache === null
            || typeof cache !== 'object'
            || Array.isArray(cache)
            || cache.version !== LANGUAGE_CACHE_VERSION
            || cache.guiLanguage !== guiLanguage
            || !Array.isArray(cache.languages)
        ) {
            return null;
        }
        return cache.languages;
    } catch {
        return null;
    }
}

export function serializeLanguageCache(guiLanguage, languages) {
    return JSON.stringify({
        version: LANGUAGE_CACHE_VERSION,
        guiLanguage,
        languages
    });
}
