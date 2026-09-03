export function createInternationalPreferredTerms(concept, languages = []) {
    const conceptLanguages = new Map(
        (concept?.languages ?? []).map(language => [language.code, language])
    );

    return languages
        .map(language => {
            const conceptLanguage = conceptLanguages.get(language.code);
            const preferredTerm = conceptLanguage?.terms.find(term => (
                term.weighting === 2 && typeof term.term === 'string' && term.term.trim() !== ''
            ))?.term.trim() ?? '';

            return {
                code: language.code,
                name: language.name || language.code,
                preferredTerm
            };
        })
        .sort((first, second) => first.code.localeCompare(second.code));
}
