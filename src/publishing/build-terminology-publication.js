import { validateTerminologyPublication } from '../domain/terminology-publication.js';

function mergeLanguages(languageSets) {
    const languages = new Map();
    for (const { guiLanguage, values } of languageSets) {
        for (const language of values) {
            const existing = languages.get(language.code);
            if (existing && existing.isSource !== language.isSource) {
                throw new Error(`Source-language marker differs for ${language.code}.`);
            }
            languages.set(language.code, {
                code: language.code,
                isSource: language.isSource,
                names: { ...existing?.names, [guiLanguage]: language.name }
            });
        }
    }
    return [...languages.values()].sort((first, second) => first.code.localeCompare(second.code));
}

export async function buildTerminologyPublication({
    repository,
    tenantId,
    termbaseId,
    termbaseName,
    publicationId,
    revision,
    publishedAt,
    guiLanguages = ['de-DE', 'en-GB'],
    loadConcepts = null
}) {
    const languageSets = [];
    for (const guiLanguage of guiLanguages) {
        languageSets.push({
            guiLanguage,
            values: await repository.getLanguages(guiLanguage)
        });
    }
    const languages = mergeLanguages(languageSets);
    const sourceLanguages = languages.filter(language => language.isSource);
    if (sourceLanguages.length !== 1) {
        throw new Error('Publication requires exactly one source language.');
    }

    const termsByLanguage = {};
    const conceptIds = new Set();
    for (const language of languages) {
        const terms = (await repository.getTerms(language.code)).map(term => ({
            ...term,
            conceptID: String(term.conceptID)
        })).sort((first, second) => (
            first.conceptID.localeCompare(second.conceptID)
            || first.term.localeCompare(second.term)
            || first.weighting - second.weighting
        ));
        termsByLanguage[language.code] = terms;
        terms.forEach(term => conceptIds.add(term.conceptID));
    }

    const sortedConceptIds = [...conceptIds].sort();
    const loadedConcepts = loadConcepts
        ? await loadConcepts(sortedConceptIds)
        : await Promise.all(sortedConceptIds.map(conceptId => repository.getConcept(conceptId)));
    const conceptsById = new Map(loadedConcepts
        .filter(Boolean)
        .map(concept => [String(concept.id), concept]));
    const concepts = [];
    for (const conceptId of sortedConceptIds) {
        const concept = conceptsById.get(conceptId);
        if (!concept) throw new Error(`Concept ${conceptId} was referenced but could not be loaded.`);
        concepts.push({
            ...concept,
            id: String(concept.id),
            languages: [...concept.languages]
                .sort((first, second) => first.code.localeCompare(second.code))
                .map(language => ({
                    ...language,
                    terms: [...language.terms].sort((first, second) => (
                        first.term.localeCompare(second.term)
                        || first.weighting - second.weighting
                    ))
                }))
        });
    }

    return validateTerminologyPublication({
        schemaVersion: 1,
        publication: {
            id: publicationId,
            tenantId,
            termbaseId,
            revision,
            publishedAt
        },
        termbase: {
            name: termbaseName,
            sourceLanguage: sourceLanguages[0].code,
            assetBasePath: `/api/termbases/${encodeURIComponent(termbaseId)}/assets/`,
            languages
        },
        termsByLanguage,
        concepts
    });
}
