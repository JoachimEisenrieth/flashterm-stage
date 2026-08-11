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
