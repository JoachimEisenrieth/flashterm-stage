// Without a selection, resolve the publication default; legacy single masters remain valid.
export function getSourceLanguage(languages, selectedCode = null) {
    if (!Array.isArray(languages)) return null;
    const sources = languages.filter(language => language?.isSource === true);
    const defaults = languages.filter(language => language?.isDefaultSource === true);
    if (defaults.length > 1 || defaults.some(language => language.isSource !== true)) return null;
    const defaultSource = defaults[0] ?? (sources.length === 1 ? sources[0] : null);
    if (!defaultSource) return null;
    return sources.find(language => language.code === selectedCode) ?? defaultSource;
}

// Load both lists before the caller changes its active language state.
export async function loadLanguagePair(repository, languages, sourceCode, targetCode, mode = 'wiki') {
    if (!languages.some(language => language.code === sourceCode && (mode !== 'wiki' || language.isSource === true))
        || (mode !== 'inspector' && !languages.some(language => language.code === targetCode && language.code !== sourceCode))) {
        throw new Error('Invalid source/target language selection.');
    }
    const [sourceTerms, targetTerms] = await Promise.all([
        repository.getTerms(sourceCode), mode === 'inspector' ? Promise.resolve([]) : repository.getTerms(targetCode)
    ]);
    if (mode !== 'wiki' && sourceTerms.length === 0) throw new Error('No terms available for review language.');
    return { sourceTerms, targetTerms };
}
