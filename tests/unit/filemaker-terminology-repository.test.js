import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createFileMakerTerminologyRepository } from '../../src/repositories/filemaker-terminology-repository.js';

const languageFixtureUrl = new URL('../fixtures/filemaker-language-response.json', import.meta.url);
const languageFixture = JSON.parse(await readFile(languageFixtureUrl, 'utf8'));

const termFixtureUrl = new URL('../fixtures/filemaker-term-list.json', import.meta.url);
const termFixture = JSON.parse(await readFile(termFixtureUrl, 'utf8'));

const conceptApiResult = [
  {
    languageCode: 'xx-XX',
    terms: [
      { term: 'alpha term', weighting: 2 },
      { term: 'beta term', weighting: 1 }
    ],
    definition: '[{"definition":"Synthetic repository definition.","footnote":"Synthetic repository footnote."}]',
    context: '[{"term":"alpha term","context":"Synthetic repository context.","footnote":""}]',
    info: '[{"term":"alpha term","info":"Synthetic repository information.","footnote":""}]',
    hyperLink: '[{"label":"synthetic repository link","link":"https://example.invalid/TEST-REPOSITORY"}]',
    infobox: 'Synthetic repository infobox.',
    fileName: 'TEST-REPOSITORY.png'
  }
];

function createFakes({
  languages = languageFixture.response.data,
  terms = termFixture.response.data,
  concept = conceptApiResult
} = {}) {
  const calls = {
    languages: [],
    terms: [],
    concept: []
  };

  return {
    calls,
    dependencies: {
      async fetchLanguages(...args) {
        calls.languages.push(args);
        return languages;
      },
      async fetchTerms(...args) {
        calls.terms.push(args);
        return terms;
      },
      async fetchConcept(...args) {
        calls.concept.push(args);
        return concept;
      }
    }
  };
}

test('getLanguages calls only the language API and returns mapped languages', async () => {
  const { calls, dependencies } = createFakes();
  const repository = createFileMakerTerminologyRepository(dependencies);

  const result = await repository.getLanguages('ui-XX');

  assert.deepEqual(calls, {
    languages: [['ui-XX']],
    terms: [],
    concept: []
  });
  assert.deepEqual(result, [
    { code: 'xx-XX', name: 'Alpha language' },
    { code: 'yy-YY', name: 'Beta language' },
    { code: 'zz-ZZ', name: 'Gamma language' }
  ]);
});

test('getTerms calls only the term API and returns mapped terms', async () => {
  const { calls, dependencies } = createFakes();
  const repository = createFileMakerTerminologyRepository(dependencies);

  const result = await repository.getTerms('xx-XX');

  assert.deepEqual(calls, {
    languages: [],
    terms: [['xx-XX']],
    concept: []
  });
  assert.deepEqual(result, [
    { conceptID: 'TEST-001', term: 'alpha term', weighting: 2 },
    { conceptID: 'TEST-001', term: 'beta term', weighting: 1 },
    { conceptID: 'TEST-002', term: 'gamma term', weighting: 0 }
  ]);
});

test('getConcept calls only the concept API and returns a mapped concept', async () => {
  const { calls, dependencies } = createFakes();
  const repository = createFileMakerTerminologyRepository(dependencies);

  const result = await repository.getConcept('TEST-REPOSITORY');

  assert.deepEqual(calls, {
    languages: [],
    terms: [],
    concept: [['TEST-REPOSITORY']]
  });
  assert.deepEqual(result, {
    id: 'TEST-REPOSITORY',
    languages: [
      {
        code: 'xx-XX',
        terms: [
          { term: 'alpha term', weighting: 2 },
          { term: 'beta term', weighting: 1 }
        ],
        definition: {
          text: 'Synthetic repository definition.',
          footnote: 'Synthetic repository footnote.'
        },
        contexts: [
          {
            term: 'alpha term',
            context: 'Synthetic repository context.',
            footnote: ''
          }
        ],
        information: [
          {
            term: 'alpha term',
            info: 'Synthetic repository information.',
            footnote: ''
          }
        ],
        infobox: 'Synthetic repository infobox.',
        links: [
          {
            label: 'synthetic repository link',
            link: 'https://example.invalid/TEST-REPOSITORY'
          }
        ],
        imageFileName: 'TEST-REPOSITORY.png'
      }
    ]
  });
});

test('getConcept preserves the existing null result without mapping it', async () => {
  const { calls, dependencies } = createFakes({ concept: null });
  const repository = createFileMakerTerminologyRepository(dependencies);

  assert.equal(await repository.getConcept('TEST-MISSING'), null);
  assert.deepEqual(calls, {
    languages: [],
    terms: [],
    concept: [['TEST-MISSING']]
  });
});

test('getConcept rejects the entire concept when an unused language record has no terms', async () => {
  const { calls, dependencies } = createFakes({
    concept: [
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
    ]
  });
  const repository = createFileMakerTerminologyRepository(dependencies);

  await assert.rejects(
    repository.getConcept('TEST-UNUSED-MISSING-TERMS'),
    TypeError
  );
  assert.deepEqual(calls, {
    languages: [],
    terms: [],
    concept: [['TEST-UNUSED-MISSING-TERMS']]
  });
});

for (const { method, argument, dependency } of [
  { method: 'getLanguages', argument: 'ui-XX', dependency: 'fetchLanguages' },
  { method: 'getTerms', argument: 'xx-XX', dependency: 'fetchTerms' },
  { method: 'getConcept', argument: 'TEST-ERROR', dependency: 'fetchConcept' }
]) {
  test(`${method} propagates the original API error`, async () => {
    const expectedError = new Error(`Synthetic ${method} failure`);
    const { dependencies } = createFakes();
    dependencies[dependency] = async () => {
      throw expectedError;
    };
    const repository = createFileMakerTerminologyRepository(dependencies);

    await assert.rejects(
      repository[method](argument),
      error => error === expectedError
    );
  });
}
