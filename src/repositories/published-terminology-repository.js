import { validateTerminologyPublication } from '../domain/terminology-publication.js';

function selectLocalizedName(names, guiLanguage, code) {
    return names[guiLanguage]
        ?? names[guiLanguage?.split('-')[0]]
        ?? Object.values(names)[0]
        ?? code;
}

export function createPublishedTerminologyRepository({ loadPublication }) {
    let publicationPromise;

    async function getPublication() {
        publicationPromise ??= Promise.resolve(loadPublication())
            .then(validateTerminologyPublication)
            .catch(error => {
                publicationPromise = undefined;
                throw error;
            });
        return publicationPromise;
    }

    return {
        async getLanguages(guiLanguage) {
            const publication = await getPublication();
            return publication.termbase.languages.map(language => ({
                code: language.code,
                name: selectLocalizedName(language.names, guiLanguage, language.code),
                isSource: language.isSource,
                ...(publication.termbase.languages.filter(item => item.isSource).length > 1
                    || language.isDefaultSource !== undefined ? {
                    isDefaultSource: language.code === publication.termbase.sourceLanguage
                } : {})
            }));
        },

        async getTerms(language) {
            const publication = await getPublication();
            return publication.termsByLanguage[language] ?? [];
        },

        async getConcept(conceptId) {
            const publication = await getPublication();
            return publication.concepts.find(concept => concept.id === conceptId) ?? null;
        },

        async getPublicationMetadata() {
            const publication = await getPublication();
            return {
                ...publication.publication,
                name: publication.termbase.name,
                sourceLanguage: publication.termbase.sourceLanguage,
                assetBasePath: publication.termbase.assetBasePath
            };
        }
    };
}
