import assert from 'node:assert/strict';
import test from 'node:test';

import { createConceptViewModel } from '../../src/app/concept-view-model.js';

function createLanguage({
  code,
  terms = [],
  definition = { text: '', footnote: '' },
  contexts = [],
  information = [],
  infobox = '',
  links = [],
  imageFileName = ''
}) {
  return {
    code,
    terms,
    definition,
    contexts,
    information,
    infobox,
    links,
    imageFileName
  };
}

test('maps complete source and target languages to the existing view model', () => {
  const sourceContext = { term: 'alpha term', context: 'Source context.', footnote: 'Source context note.' };
  const targetContext = { term: 'delta term', context: 'Target context.', footnote: '' };
  const sourceInfo = { term: 'alpha term', info: 'Source information.', footnote: '' };
  const targetInfo = { term: 'delta term', info: 'Target information.', footnote: 'Target info note.' };
  const sourceLink = { label: 'source link', link: 'https://example.invalid/source' };
  const targetLink = { label: 'target link', link: 'https://example.invalid/target' };
  const concept = {
    id: 'TEST-001',
    languages: [
      createLanguage({
        code: 'xx-XX',
        terms: [
          { term: 'alpha term', weighting: 2 },
          { term: 'beta term', weighting: 1 },
          { term: 'gamma term', weighting: 0 }
        ],
        definition: { text: 'Source definition.', footnote: 'Source footnote.' },
        contexts: [sourceContext],
        information: [sourceInfo],
        infobox: 'Source infobox.',
        links: [sourceLink],
        imageFileName: 'TEST-001.png'
      }),
      createLanguage({
        code: 'yy-YY',
        terms: [
          { term: 'delta term', weighting: 2 },
          { term: 'epsilon term', weighting: 1 },
          { term: 'zeta term', weighting: 0 }
        ],
        definition: { text: 'Target definition.', footnote: 'Target footnote.' },
        contexts: [targetContext],
        information: [targetInfo],
        infobox: 'Target infobox.',
        links: [targetLink],
        imageFileName: 'TARGET-MUST-NOT-BE-USED.png'
      })
    ]
  };

  assert.deepEqual(createConceptViewModel(concept, 'xx-XX', 'yy-YY'), {
    preferredTermSource: 'alpha term',
    preferredTermTarget: 'delta term',
    synonymsSource: { alternative: ['beta term'], rejected: ['gamma term'] },
    synonymsTarget: { alternative: ['epsilon term'], rejected: ['zeta term'] },
    definitionSource: 'Source definition.',
    definitionTarget: 'Target definition.',
    footnoteSource: ['Source footnote.'],
    footnoteTarget: ['Target footnote.'],
    contextDataSource: [sourceContext],
    contextDataTarget: [targetContext],
    infoDataSource: [sourceInfo],
    infoDataTarget: [targetInfo],
    infoboxContentSource: 'Source infobox.',
    infoboxContentTarget: 'Target infobox.',
    linksSource: [sourceLink],
    linksTarget: [targetLink],
    fileName: 'TEST-001.png'
  });
});

test('keeps source defaults when the source language record is missing', () => {
  const concept = {
    id: 'TEST-MISSING-SOURCE',
    languages: [createLanguage({
      code: 'yy-YY',
      terms: [{ term: 'target term', weighting: 2 }],
      imageFileName: 'TARGET-MUST-NOT-BE-USED.png'
    })]
  };

  const result = createConceptViewModel(concept, 'xx-XX', 'yy-YY');

  assert.equal(result.preferredTermSource, '–');
  assert.deepEqual(result.synonymsSource, { alternative: [], rejected: [] });
  assert.equal(result.definitionSource, '');
  assert.deepEqual(result.footnoteSource, []);
  assert.deepEqual(result.contextDataSource, []);
  assert.deepEqual(result.infoDataSource, []);
  assert.equal(result.infoboxContentSource, '');
  assert.deepEqual(result.linksSource, []);
  assert.equal(result.fileName, '');
  assert.equal(result.preferredTermTarget, 'target term');
});

test('keeps target defaults when the target language record is missing', () => {
  const concept = {
    id: 'TEST-MISSING-TARGET',
    languages: [createLanguage({
      code: 'xx-XX',
      terms: [{ term: 'source term', weighting: 2 }]
    })]
  };

  const result = createConceptViewModel(concept, 'xx-XX', 'yy-YY');

  assert.equal(result.preferredTermSource, 'source term');
  assert.equal(result.preferredTermTarget, '–');
  assert.deepEqual(result.synonymsTarget, { alternative: [], rejected: [] });
  assert.equal(result.definitionTarget, '');
  assert.deepEqual(result.footnoteTarget, []);
  assert.deepEqual(result.contextDataTarget, []);
  assert.deepEqual(result.infoDataTarget, []);
  assert.equal(result.infoboxContentTarget, '');
  assert.deepEqual(result.linksTarget, []);
});

test('uses the existing fallback when present language records have no preferred term', () => {
  const concept = {
    id: 'TEST-NO-PREFERRED',
    languages: [
      createLanguage({ code: 'xx-XX', terms: [{ term: 'source alternative', weighting: 1 }] }),
      createLanguage({ code: 'yy-YY', terms: [{ term: 'target rejected', weighting: 0 }] })
    ]
  };

  const result = createConceptViewModel(concept, 'xx-XX', 'yy-YY');

  assert.equal(result.preferredTermSource, 'Keine Übersetzung');
  assert.equal(result.preferredTermTarget, 'Keine Übersetzung');
  assert.deepEqual(result.synonymsSource, { alternative: ['source alternative'], rejected: [] });
  assert.deepEqual(result.synonymsTarget, { alternative: [], rejected: ['target rejected'] });
});

test('preserves empty optional domain fields', () => {
  const concept = {
    id: 'TEST-EMPTY',
    languages: [
      createLanguage({ code: 'xx-XX', terms: [] }),
      createLanguage({ code: 'yy-YY', terms: [] })
    ]
  };

  assert.deepEqual(createConceptViewModel(concept, 'xx-XX', 'yy-YY'), {
    preferredTermSource: 'Keine Übersetzung',
    preferredTermTarget: 'Keine Übersetzung',
    synonymsSource: { alternative: [], rejected: [] },
    synonymsTarget: { alternative: [], rejected: [] },
    definitionSource: '',
    definitionTarget: '',
    footnoteSource: [],
    footnoteTarget: [],
    contextDataSource: [],
    contextDataTarget: [],
    infoDataSource: [],
    infoDataTarget: [],
    infoboxContentSource: '',
    infoboxContentTarget: '',
    linksSource: [],
    linksTarget: [],
    fileName: ''
  });
});

test('selects languages by complete code without reducing locale variants', () => {
  const concept = {
    id: 'TEST-LOCALES',
    languages: [
      createLanguage({
        code: 'xx-AA',
        terms: [{ term: 'regional source', weighting: 2 }],
        imageFileName: 'SOURCE-AA.png'
      }),
      createLanguage({
        code: 'xx-BB',
        terms: [{ term: 'regional target', weighting: 2 }],
        imageFileName: 'TARGET-BB.png'
      })
    ]
  };

  const result = createConceptViewModel(concept, 'xx-BB', 'xx-AA');

  assert.equal(result.preferredTermSource, 'regional target');
  assert.equal(result.preferredTermTarget, 'regional source');
  assert.equal(result.fileName, 'TARGET-BB.png');
});
