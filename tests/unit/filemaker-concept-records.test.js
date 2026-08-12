import assert from 'node:assert/strict';
import test from 'node:test';

import { mapConcept } from '../../src/domain/terminology.js';
import { normalizeFileMakerConceptRecords } from '../../src/infrastructure/filemaker-concept-records.js';

test('normalizes missing, empty, and explicitly empty concept termlists', () => {
  const records = normalizeFileMakerConceptRecords([
    { fieldData: { languageCode: 'de-DE' } },
    { fieldData: { languageCode: 'en-GB', termlist: '' } },
    { fieldData: { languageCode: 'fr-FR', termlist: '[]' } }
  ]);

  assert.deepEqual(records.map(({ terms }) => terms), [[], [], []]);
});

test('normalizes invalid concept termlist JSON and reports it without payload data', () => {
  let invalidTermlistCount = 0;

  const [record] = normalizeFileMakerConceptRecords(
    [{ fieldData: { languageCode: 'de-DE', termlist: 'invalid JSON' } }],
    () => {
      invalidTermlistCount += 1;
    }
  );

  assert.deepEqual(record.terms, []);
  assert.equal(invalidTermlistCount, 1);
});

test('preserves a valid parsed concept termlist array', () => {
  const expectedTerms = [
    { term: 'alpha term', weighting: 2 },
    { term: 'beta term', weighting: 1 }
  ];
  const [record] = normalizeFileMakerConceptRecords([
    {
      fieldData: {
        languageCode: 'de-DE',
        termlist: JSON.stringify(expectedTerms)
      }
    }
  ]);

  assert.deepEqual(record.terms, expectedTerms);
});

test('keeps a multi-language concept mapable when one termlist is invalid', () => {
  const records = normalizeFileMakerConceptRecords([
    {
      fieldData: {
        languageCode: 'de-DE',
        termlist: '[{"term":"source term","weighting":2}]'
      }
    },
    {
      fieldData: {
        languageCode: 'en-GB',
        termlist: '[{"term":"target term","weighting":2}]'
      }
    },
    {
      fieldData: {
        languageCode: 'fr-FR',
        termlist: 'invalid JSON'
      }
    }
  ]);

  const concept = mapConcept('TEST-MULTILINGUAL', records);

  assert.deepEqual(concept.languages.map(({ code, terms }) => ({ code, terms })), [
    { code: 'de-DE', terms: [{ term: 'source term', weighting: 2 }] },
    { code: 'en-GB', terms: [{ term: 'target term', weighting: 2 }] },
    { code: 'fr-FR', terms: [] }
  ]);
});
