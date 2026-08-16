import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { mapConcept, mapLanguages } from '../../src/domain/terminology.js';

const languageFixtureUrl = new URL('../fixtures/filemaker-language-response.json', import.meta.url);
const languageFixture = JSON.parse(await readFile(languageFixtureUrl, 'utf8'));

const conceptFixtureUrl = new URL('../fixtures/filemaker-concept-response.json', import.meta.url);
const conceptFixture = JSON.parse(await readFile(conceptFixtureUrl, 'utf8'));
const conceptRecords = conceptFixture.response.data.map(({ fieldData }) => ({
  ...fieldData,
  terms: JSON.parse(fieldData.termlist)
}));

test('maps multiple FileMaker language records to internal languages', () => {
  assert.deepEqual(mapLanguages(languageFixture.response.data), [
    { code: 'xx-XX', name: 'Alpha language', isSource: true },
    { code: 'yy-YY', name: 'Beta language', isSource: false },
    { code: 'zz-ZZ', name: 'Gamma language', isSource: false }
  ]);
});

test('characterizes structural language mapping edge cases', () => {
  assert.deepEqual(mapLanguages([]), []);
  assert.deepEqual(mapLanguages([{ fieldData: {} }]), [
    { code: undefined, name: undefined, isSource: false }
  ]);
  assert.throws(() => mapLanguages([{}]), TypeError);
});

test('maps FileMaker concept records to the language-neutral concept model', () => {
  assert.deepEqual(mapConcept('TEST-001', conceptRecords), {
    id: 'TEST-001',
    languages: [
      {
        code: 'xx-XX',
        terms: [
          { term: 'alpha term', weighting: 2 },
          { term: 'beta term', weighting: 1 }
        ],
        definition: {
          text: 'Synthetic definition for alpha term.',
          footnote: 'Synthetic footnote.'
        },
        contexts: [
          {
            term: 'alpha term',
            context: 'Synthetic context for testing.',
            footnote: ''
          }
        ],
        information: [
          {
            term: 'alpha term',
            info: 'Synthetic information for testing.',
            footnote: ''
          }
        ],
        infobox: '# Synthetic infobox\n\nTest-only content.',
        links: [
          {
            label: 'synthetic link',
            link: 'https://example.invalid/TEST-001'
          }
        ],
        imageFileName: 'TEST-001.png'
      },
      {
        code: 'yy-YY',
        terms: [
          { term: 'delta term', weighting: 2 }
        ],
        definition: {
          text: 'Synthetic target definition.',
          footnote: ''
        },
        contexts: [],
        information: [],
        infobox: '',
        links: [],
        imageFileName: ''
      }
    ]
  });
});

test('maps an empty concept record array to an empty language collection', () => {
  assert.deepEqual(mapConcept('TEST-EMPTY', []), {
    id: 'TEST-EMPTY',
    languages: []
  });
});

test('preserves optional-field fallbacks and existing definition whitespace semantics', () => {
  const result = mapConcept('TEST-EMPTY', [
    {
      languageCode: 'xx-XX',
      terms: [],
      definition: '[{"definition":"   ","footnote":"  retained footnote  "}]',
      context: '',
      info: null,
      hyperLink: [],
      infobox: null,
      fileName: undefined
    }
  ]);

  assert.deepEqual(result, {
    id: 'TEST-EMPTY',
    languages: [
      {
        code: 'xx-XX',
        terms: [],
        definition: {
          text: '',
          footnote: '  retained footnote  '
        },
        contexts: [],
        information: [],
        infobox: '',
        links: [],
        imageFileName: ''
      }
    ]
  });
});

test('preserves empty fallbacks for malformed optional JSON fields', () => {
  const result = mapConcept('TEST-MALFORMED', [
    {
      languageCode: 'xx-XX',
      terms: [],
      definition: 'invalid JSON',
      context: 'invalid JSON',
      info: 'invalid JSON',
      hyperLink: 'invalid JSON'
    }
  ]);

  assert.deepEqual(result.languages[0], {
    code: 'xx-XX',
    terms: [],
    definition: { text: '', footnote: '' },
    contexts: [],
    information: [],
    infobox: '',
    links: [],
    imageFileName: ''
  });
});

test('throws when a single concept record has no terms', () => {
  assert.throws(
    () => mapConcept('TEST-MISSING-TERMS', [{ languageCode: 'xx-XX' }]),
    TypeError
  );
});

test('throws when an otherwise unused language record has no terms', () => {
  assert.throws(
    () => mapConcept('TEST-UNUSED-MISSING-TERMS', [
      {
        languageCode: 'de-DE',
        terms: [{ term: 'source term', weighting: 2 }]
      },
      {
        languageCode: 'en-GB',
        terms: [{ term: 'target term', weighting: 2 }]
      },
      {
        languageCode: 'fr-FR'
      }
    ]),
    TypeError
  );
});

test('maps an explicitly empty concept terms array', () => {
  const result = mapConcept('TEST-EMPTY-TERMS', [
    {
      languageCode: 'de-DE',
      terms: []
    }
  ]);

  assert.deepEqual(result.languages[0].terms, []);
});
