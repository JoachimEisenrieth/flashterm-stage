import assert from 'node:assert/strict';
import test from 'node:test';

import { getConceptSectionAvailability } from '../../src/app/concept-section-availability.js';

function createLanguage({
  code,
  terms = [],
  definition = { text: '', footnote: '' },
  contexts = [],
  information = [],
  infobox = '',
  links = []
}) {
  return {
    code,
    terms,
    definition,
    contexts,
    information,
    infobox,
    links,
    imageFileName: ''
  };
}

const unavailable = {
  synonyms: false,
  definition: false,
  context: false,
  info: false,
  infobox: false,
  links: false
};

test('reports section availability for complete source and target languages', () => {
  const concept = {
    id: 'TEST-COMPLETE',
    languages: [
      createLanguage({
        code: 'de-DE',
        terms: [
          { term: 'alpha term', weighting: 2 },
          { term: 'beta term', weighting: 1 }
        ],
        definition: { text: 'Source definition.', footnote: '' },
        contexts: [{ term: 'alpha term', context: 'Source context.', footnote: '' }],
        information: [{ term: 'alpha term', info: 'Source information.', footnote: '' }],
        infobox: 'Source infobox.',
        links: []
      }),
      createLanguage({
        code: 'en-GB',
        terms: [
          { term: 'gamma term', weighting: 2 },
          { term: 'delta term', weighting: 0 }
        ],
        definition: { text: '', footnote: 'Target footnote.' },
        contexts: [{ term: 'gamma term', context: 'Target context.', footnote: '' }],
        information: [{ term: 'gamma term', info: 'Target information.', footnote: '' }],
        infobox: 'Target infobox.',
        links: [{ label: 'target link', link: 'https://example.invalid/target' }]
      })
    ]
  };

  assert.deepEqual(getConceptSectionAvailability(concept, 'de-DE', 'en-GB'), {
    synonyms: { source: true, target: true },
    definition: { source: true, target: true },
    context: { source: true, target: true },
    info: { source: true, target: true },
    infobox: { source: true, target: true },
    links: { source: true, target: true }
  });
});

test('reports every section unavailable for a missing source language', () => {
  const concept = {
    id: 'TEST-MISSING-SOURCE',
    languages: [createLanguage({ code: 'en-GB' })]
  };

  const result = getConceptSectionAvailability(concept, 'de-DE', 'en-GB');

  assert.deepEqual(
    Object.fromEntries(Object.entries(result).map(([section, value]) => [section, value.source])),
    unavailable
  );
  assert.equal(result.links.target, true);
});

test('reports every section unavailable for a missing target language', () => {
  const concept = {
    id: 'TEST-MISSING-TARGET',
    languages: [createLanguage({ code: 'de-DE' })]
  };

  const result = getConceptSectionAvailability(concept, 'de-DE', 'en-GB');

  assert.deepEqual(
    Object.fromEntries(Object.entries(result).map(([section, value]) => [section, value.target])),
    unavailable
  );
  assert.equal(result.links.source, true);
});

test('preserves the historical synonym term-count rule', () => {
  const concept = {
    id: 'TEST-SYNONYMS',
    languages: [
      createLanguage({ code: 'zero-ZZ', terms: [] }),
      createLanguage({ code: 'one-OO', terms: [{ term: 'single term', weighting: 1 }] }),
      createLanguage({
        code: 'many-MM',
        terms: [
          { term: 'first term', weighting: 2 },
          { term: 'second term', weighting: 2 }
        ]
      })
    ]
  };

  assert.equal(getConceptSectionAvailability(concept, 'zero-ZZ', 'one-OO').synonyms.source, false);
  assert.equal(getConceptSectionAvailability(concept, 'zero-ZZ', 'one-OO').synonyms.target, false);
  assert.equal(getConceptSectionAvailability(concept, 'many-MM', 'one-OO').synonyms.source, true);
});

test('distinguishes definition, collection, and infobox emptiness', () => {
  const concept = {
    id: 'TEST-CONTENT',
    languages: [
      createLanguage({
        code: 'text-TT',
        definition: { text: 'Definition text.', footnote: '' },
        contexts: [{ term: '', context: '', footnote: '' }],
        information: [],
        infobox: ''
      }),
      createLanguage({
        code: 'note-NN',
        definition: { text: '', footnote: 'Definition footnote.' },
        contexts: [],
        information: [{ term: '', info: '', footnote: '' }],
        infobox: '   '
      }),
      createLanguage({
        code: 'empty-EE',
        definition: { text: '', footnote: '' },
        infobox: 'Visible infobox.'
      })
    ]
  };

  const textAndNote = getConceptSectionAvailability(concept, 'text-TT', 'note-NN');
  assert.deepEqual(textAndNote.definition, { source: true, target: true });
  assert.deepEqual(textAndNote.context, { source: true, target: false });
  assert.deepEqual(textAndNote.info, { source: false, target: true });
  assert.deepEqual(textAndNote.infobox, { source: false, target: false });

  const emptyAndText = getConceptSectionAvailability(concept, 'empty-EE', 'text-TT');
  assert.equal(emptyAndText.definition.source, false);
  assert.equal(emptyAndText.infobox.source, true);
});

test('keeps links available for existing records regardless of link content', () => {
  const concept = {
    id: 'TEST-LINKS',
    languages: [
      createLanguage({ code: 'de-DE', links: [] }),
      createLanguage({
        code: 'en-GB',
        links: [{ label: 'synthetic link', link: 'https://example.invalid/link' }]
      })
    ]
  };

  assert.deepEqual(getConceptSectionAvailability(concept, 'de-DE', 'en-GB').links, {
    source: true,
    target: true
  });
});

test('selects locale variants by their complete language codes', () => {
  const concept = {
    id: 'TEST-LOCALES',
    languages: [
      createLanguage({ code: 'xx-AA', infobox: '' }),
      createLanguage({ code: 'xx-BB', infobox: 'Regional content.' })
    ]
  };

  const result = getConceptSectionAvailability(concept, 'xx-BB', 'xx-AA');

  assert.deepEqual(result.infobox, { source: true, target: false });
});
