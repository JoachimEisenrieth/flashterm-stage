function createStageApiError(response) {
    const error = new Error(`Stage API request failed with HTTP ${response.status}.`);
    error.name = 'StageApiError';
    error.status = response.status;
    return error;
}

export function createStageTerminologyRepository({
    termbaseId,
    request = fetch
}) {
    const encodedTermbaseId = encodeURIComponent(termbaseId);
    const basePath = `/api/termbases/${encodedTermbaseId}`;

    async function requestJson(path) {
        const response = await request(path, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            throw createStageApiError(response);
        }
        return response.json();
    }

    return {
        async getTermbases() {
            const data = await requestJson('/api/termbases');
            return data.termbases;
        },

        async getLanguages(guiLanguage) {
            const query = new URLSearchParams({ guiLanguage });
            const data = await requestJson(`${basePath}/languages?${query}`);
            return data.languages;
        },

        async getTerms(language) {
            const query = new URLSearchParams({ language });
            const data = await requestJson(`${basePath}/terms?${query}`);
            return data.terms;
        },

        async getConcept(conceptId) {
            const response = await request(`${basePath}/concepts/${encodeURIComponent(conceptId)}`, {
                headers: { Accept: 'application/json' }
            });
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                throw createStageApiError(response);
            }
            const data = await response.json();
            return data.concept;
        }
    };
}
