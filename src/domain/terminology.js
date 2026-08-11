export function parseTermList(data) {
    return data.flatMap(item => {
        const termlistField = item.fieldData.termlist;
        if (termlistField) {
            const terms = JSON.parse(termlistField);
            return terms.map(term => ({
                conceptID: term[0],
                term: term[1],
                weighting: term[2]
            }));
        }
        return [];
    });
}

export function mapLanguages(records) {
    return records.map(record => ({
        code: record.fieldData.languageCode,
        name: record.fieldData.language
    }));
}

export function mapConcept(conceptId, records) {
    return {
        id: conceptId,
        languages: records.map(detail => {
            const definition = {
                text: '',
                footnote: ''
            };

            if (detail.definition) {
                try {
                    const definitionObject = JSON.parse(detail.definition)[0];
                    if (definitionObject.definition.trim()) {
                        definition.text = definitionObject.definition;
                    }
                    if (definitionObject.footnote.trim()) {
                        definition.footnote = definitionObject.footnote;
                    }
                } catch {
                    // Preserve the existing empty definition fallback.
                }
            }

            let contexts = [];
            if (detail.context) {
                try {
                    contexts = [...JSON.parse(detail.context)];
                } catch {
                    // Preserve the existing empty context fallback.
                }
            }

            let information = [];
            if (detail.info) {
                try {
                    information = [...JSON.parse(detail.info)];
                } catch {
                    // Preserve the existing empty information fallback.
                }
            }

            let links = [];
            if (detail.hyperLink) {
                try {
                    const parsedLinks = Array.isArray(detail.hyperLink)
                        ? detail.hyperLink
                        : JSON.parse(detail.hyperLink);
                    links = parsedLinks.map(entry => ({
                        label: entry.label,
                        link: entry.link
                    }));
                } catch {
                    // Preserve the existing empty links fallback.
                }
            }

            return {
                code: detail.languageCode,
                terms: detail.terms.map(term => ({
                    term: term.term,
                    weighting: term.weighting
                })),
                definition,
                contexts,
                information,
                infobox: detail.infobox || '',
                links,
                imageFileName: detail.fileName || ''
            };
        })
    };
}
