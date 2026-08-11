import { mapConcept, mapLanguages, parseTermList } from '../domain/terminology.js';

export function createFileMakerTerminologyRepository({
    fetchLanguages,
    fetchTerms,
    fetchConcept
}) {
    return {
        async getLanguages(guiLanguage) {
            const records = await fetchLanguages(guiLanguage);
            return mapLanguages(records);
        },

        async getTerms(language) {
            const records = await fetchTerms(language);
            return parseTermList(records);
        },

        async getConcept(conceptId) {
            const records = await fetchConcept(conceptId);
            if (records === null) {
                return null;
            }
            return mapConcept(conceptId, records);
        }
    };
}
