const CATEGORY_BY_WEIGHTING = new Map([
    [2, 'preferred'],
    [1, 'alternative'],
    [0, 'rejected']
]);

const WORD_CHARACTER = String.raw`\p{L}\p{M}\p{N}_`;

function normalizeForMatching(value) {
    return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeTextWithOffsets(value) {
    let normalizedText = '';
    const startOffsets = [];
    const endOffsets = [];
    let originalOffset = 0;

    for (const character of value) {
        const normalizedCharacter = normalizeForMatching(character);
        normalizedText += normalizedCharacter;
        for (let index = 0; index < normalizedCharacter.length; index += 1) {
            startOffsets.push(originalOffset);
            endOffsets.push(originalOffset + character.length);
        }
        originalOffset += character.length;
    }

    return { normalizedText, startOffsets, endOffsets };
}

function escapeRegularExpression(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTermPattern(term) {
    return new RegExp(
        `(?<![${WORD_CHARACTER}])${escapeRegularExpression(term)}(?![${WORD_CHARACTER}])`,
        'giu'
    );
}

function createTermGroups(termList, onInvalidWeighting) {
    const groups = new Map();

    termList.forEach(record => {
        if (!record || typeof record.term !== 'string' || record.term.trim() === '') {
            return;
        }

        const category = CATEGORY_BY_WEIGHTING.get(record.weighting);
        if (!category) {
            onInvalidWeighting(record);
            return;
        }

        const normalizedTerm = normalizeForMatching(record.term.trim());
        const groupKey = normalizedTerm.toLocaleLowerCase();
        const group = groups.get(groupKey) ?? {
            normalizedTerm,
            records: [],
            recordKeys: new Set()
        };
        const recordKey = `${String(record.conceptID)}\u0000${record.weighting}`;

        if (!group.recordKeys.has(recordKey)) {
            group.recordKeys.add(recordKey);
            group.records.push({
                category,
                conceptID: record.conceptID,
                originalTerm: record.term.trim()
            });
        }
        groups.set(groupKey, group);
    });

    return [...groups.values()].sort((first, second) => (
        second.normalizedTerm.length - first.normalizedTerm.length
    ));
}

function selectLongestOccurrences(occurrences) {
    const selected = [];

    occurrences
        .sort((first, second) => (
            (second.end - second.start) - (first.end - first.start)
            || first.start - second.start
        ))
        .forEach(occurrence => {
            const isCoveredByLongerTerm = selected.some(selectedOccurrence => (
                selectedOccurrence.start <= occurrence.start
                && selectedOccurrence.end >= occurrence.end
                && selectedOccurrence.end - selectedOccurrence.start > occurrence.end - occurrence.start
            ));

            if (!isCoveredByLongerTerm) {
                selected.push(occurrence);
            }
        });

    return selected;
}

export function extractTermsFromText(text, termList, { onInvalidWeighting = () => {} } = {}) {
    const foundTerms = { preferred: {}, alternative: {}, rejected: {} };
    if (typeof text !== 'string' || !Array.isArray(termList) || text.trim() === '') {
        return foundTerms;
    }

    const { normalizedText, startOffsets, endOffsets } = normalizeTextWithOffsets(text);
    const termGroups = createTermGroups(termList, onInvalidWeighting);
    const occurrences = [];

    termGroups.forEach(group => {
        const pattern = createTermPattern(group.normalizedTerm);
        let match;

        while ((match = pattern.exec(normalizedText)) !== null) {
            occurrences.push({
                start: match.index,
                end: match.index + match[0].length,
                originalStart: startOffsets[match.index],
                originalEnd: endOffsets[match.index + match[0].length - 1],
                group
            });
        }
    });

    selectLongestOccurrences(occurrences).forEach(({ group, originalStart, originalEnd }) => {
        group.records.forEach(record => {
            const resultKey = `${group.normalizedTerm.toLocaleLowerCase()}\u0000${String(record.conceptID)}\u0000${record.category}`;
            const existingResult = foundTerms[record.category][resultKey];

            if (existingResult) {
                existingResult.count += 1;
                existingResult.occurrences.push({ start: originalStart, end: originalEnd });
                return;
            }

            foundTerms[record.category][resultKey] = {
                count: 1,
                conceptID: record.conceptID,
                originalTerm: record.originalTerm,
                occurrences: [{ start: originalStart, end: originalEnd }]
            };
        });
    });

    return foundTerms;
}

export function createTermContexts(text, occurrences, contextRadius = 64) {
    if (typeof text !== 'string' || !Array.isArray(occurrences)) return [];

    const radius = Number.isInteger(contextRadius) && contextRadius >= 0 ? contextRadius : 64;
    const uniqueOccurrences = new Map();
    occurrences.forEach(occurrence => {
        const start = occurrence?.start;
        const end = occurrence?.end;
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > text.length) {
            return;
        }
        uniqueOccurrences.set(`${start}:${end}`, { start, end });
    });

    return [...uniqueOccurrences.values()]
        .sort((first, second) => first.start - second.start)
        .map(({ start, end }) => {
            let contextStart = Math.max(0, start - radius);
            let contextEnd = Math.min(text.length, end + radius);

            if (contextStart > 0) {
                const nextWhitespace = text.slice(contextStart, start).search(/\s/u);
                contextStart = nextWhitespace >= 0 ? contextStart + nextWhitespace + 1 : start;
            }
            if (contextEnd < text.length) {
                const precedingText = text.slice(end, contextEnd);
                const lastWhitespace = precedingText.search(/\s+\S*$/u);
                contextEnd = lastWhitespace >= 0 ? end + lastWhitespace : end;
            }

            return {
                before: `${contextStart > 0 ? '…' : ''}${text.slice(contextStart, start)}`,
                match: text.slice(start, end),
                after: `${text.slice(end, contextEnd)}${contextEnd < text.length ? '…' : ''}`
            };
        });
}
