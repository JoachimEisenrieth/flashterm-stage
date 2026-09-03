import assert from 'node:assert/strict';
import test from 'node:test';

import { createTermContexts, extractTermsFromText } from '../../src/app/term-mining.js';

function records(result, category) {
    return Object.values(result[category]).map(({ occurrences, ...record }) => record);
}

function recordsWithOccurrences(result, category) {
    return Object.values(result[category]);
}

test('classifies and counts terminology without depending on capitalization or accents', () => {
    const result = extractTermsFromText(
        'Der Vernebler, der VERNEBLER und ein Verneblér.',
        [
            { conceptID: 'DEVICE', term: 'Vernebler', weighting: 2 },
            { conceptID: 'DEVICE', term: 'Inhalationsgerät', weighting: 1 },
            { conceptID: 'DEVICE', term: 'Dampfgerät', weighting: 0 }
        ]
    );

    assert.deepEqual(records(result, 'preferred'), [{
        count: 3,
        conceptID: 'DEVICE',
        originalTerm: 'Vernebler'
    }]);
    assert.deepEqual(records(result, 'alternative'), []);
    assert.deepEqual(records(result, 'rejected'), []);
    assert.deepEqual(
        recordsWithOccurrences(result, 'preferred')[0].occurrences.map(({ start, end }) => (
            'Der Vernebler, der VERNEBLER und ein Verneblér.'.slice(start, end)
        )),
        ['Vernebler', 'VERNEBLER', 'Verneblér']
    );
});

test('uses Unicode-aware term boundaries for Latin and non-Latin scripts', () => {
    const result = extractTermsFromText(
        'Maske Masken; маска масками; قناع وقناع.',
        [
            { conceptID: 'DE', term: 'Maske', weighting: 2 },
            { conceptID: 'UK', term: 'маска', weighting: 2 },
            { conceptID: 'AR', term: 'قناع', weighting: 2 }
        ]
    );

    assert.deepEqual(records(result, 'preferred').map(record => record.conceptID).sort(), [
        'AR',
        'DE',
        'UK'
    ]);
    assert.ok(records(result, 'preferred').every(record => record.count === 1));
});

test('recognizes terms containing punctuation without matching longer words', () => {
    const result = extractTermsFromText(
        'C++ wird eingesetzt, C++Builder aber separat benannt.',
        [{ conceptID: 'LANGUAGE', term: 'C++', weighting: 2 }]
    );

    assert.equal(records(result, 'preferred')[0].count, 1);
});

test('keeps the longest terminology match at an overlapping position', () => {
    const result = extractTermsFromText(
        'Der PARI Filter wird ersetzt.',
        [
            { conceptID: 'FILTER', term: 'Filter', weighting: 2 },
            { conceptID: 'PARI-FILTER', term: 'PARI Filter', weighting: 1 }
        ]
    );

    assert.deepEqual(records(result, 'preferred'), []);
    assert.deepEqual(records(result, 'alternative'), [{
        count: 1,
        conceptID: 'PARI-FILTER',
        originalTerm: 'PARI Filter'
    }]);
});

test('mines a realistic German inspector paragraph', () => {
    const result = extractTermsFromText(
        'Vor der Inhalation wird die Maske am Vernebler befestigt. Danach wird der Vernebler gereinigt.',
        [
            { conceptID: 'INHALATION', term: 'Inhalation', weighting: 2 },
            { conceptID: 'MASK', term: 'Maske', weighting: 2 },
            { conceptID: 'NEBULISER', term: 'Vernebler', weighting: 2 }
        ]
    );

    assert.deepEqual(
        records(result, 'preferred').map(record => [record.originalTerm, record.count]),
        [['Inhalation', 1], ['Vernebler', 2], ['Maske', 1]]
    );
});

test('mines a realistic English translator paragraph without double-counting nested terms', () => {
    const result = extractTermsFromText(
        'Connect the nebuliser mask to the air inlet. Check the nebuliser mask before use.',
        [
            { conceptID: 'MASK', term: 'mask', weighting: 2 },
            { conceptID: 'NEBULISER-MASK', term: 'nebuliser mask', weighting: 2 },
            { conceptID: 'AIR-INLET', term: 'air inlet', weighting: 1 }
        ]
    );

    assert.deepEqual(records(result, 'preferred'), [{
        count: 2,
        conceptID: 'NEBULISER-MASK',
        originalTerm: 'nebuliser mask'
    }]);
    assert.deepEqual(records(result, 'alternative'), [{
        count: 1,
        conceptID: 'AIR-INLET',
        originalTerm: 'air inlet'
    }]);
});

test('retains separate concepts for an ambiguous designation', () => {
    const result = extractTermsFromText(
        'Die Bank wird geprüft.',
        [
            { conceptID: 'FINANCE', term: 'Bank', weighting: 2 },
            { conceptID: 'SEAT', term: 'Bank', weighting: 2 },
            { conceptID: 'FINANCE', term: 'Bank', weighting: 2 }
        ]
    );

    assert.deepEqual(records(result, 'preferred'), [
        { count: 1, conceptID: 'FINANCE', originalTerm: 'Bank' },
        { count: 1, conceptID: 'SEAT', originalTerm: 'Bank' }
    ]);
});

test('ignores incomplete records and reports unsupported weighting values once', () => {
    const invalidRecords = [];
    const result = extractTermsFromText(
        'Alpha Beta',
        [
            { conceptID: 'EMPTY', term: '   ', weighting: 2 },
            { conceptID: 'UNKNOWN', term: 'Alpha', weighting: 9 },
            { conceptID: 'VALID', term: 'Beta', weighting: 2 }
        ],
        { onInvalidWeighting: record => invalidRecords.push(record) }
    );

    assert.equal(invalidRecords.length, 1);
    assert.equal(invalidRecords[0].conceptID, 'UNKNOWN');
    assert.equal(records(result, 'preferred')[0].conceptID, 'VALID');
});

test('creates ordered, deduplicated and safely separated text contexts', () => {
    const text = 'Vorbereitung. Die <Maske> wird am Gerät befestigt. Danach wird die Maske gereinigt.';
    const firstStart = text.indexOf('Maske');
    const secondStart = text.lastIndexOf('Maske');
    const contexts = createTermContexts(text, [
        { start: secondStart, end: secondStart + 5 },
        { start: firstStart, end: firstStart + 5 },
        { start: firstStart, end: firstStart + 5 }
    ], 18);

    assert.equal(contexts.length, 2);
    assert.equal(contexts[0].match, 'Maske');
    assert.equal(contexts[1].match, 'Maske');
    assert.match(contexts[0].before, /</);
    assert.match(contexts[0].after, /> wird am Gerät/);
    assert.ok(contexts[0].after.endsWith('…'));
});
