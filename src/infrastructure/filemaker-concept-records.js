export function normalizeFileMakerConceptRecords(records, onInvalidTermlist = () => {}) {
    return records.map(item => {
        const termDetails = item.fieldData;
        termDetails.terms = [];

        if (termDetails.termlist) {
            try {
                const parsedTerms = JSON.parse(termDetails.termlist);
                if (Array.isArray(parsedTerms)) {
                    termDetails.terms = parsedTerms;
                }
            } catch {
                onInvalidTermlist();
            }
        }

        return termDetails;
    });
}
