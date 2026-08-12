function getLanguageAvailability(language) {
    if (!language) {
        return {
            synonyms: false,
            definition: false,
            context: false,
            info: false,
            infobox: false,
            links: false
        };
    }

    return {
        synonyms: language.terms.length > 1,
        definition: Boolean(language.definition.text.trim() || language.definition.footnote.trim()),
        context: language.contexts.length > 0,
        info: language.information.length > 0,
        infobox: language.infobox.trim() !== '',
        // Preserve the historical links/hyperLink menu behavior until a separate bugfix.
        links: true
    };
}

export function getConceptSectionAvailability(concept, sourceLanguage, targetLanguage) {
    const source = getLanguageAvailability(
        concept.languages.find(language => language.code === sourceLanguage)
    );
    const target = getLanguageAvailability(
        concept.languages.find(language => language.code === targetLanguage)
    );

    return {
        synonyms: { source: source.synonyms, target: target.synonyms },
        definition: { source: source.definition, target: target.definition },
        context: { source: source.context, target: target.context },
        info: { source: source.info, target: target.info },
        infobox: { source: source.infobox, target: target.infobox },
        links: { source: source.links, target: target.links }
    };
}
