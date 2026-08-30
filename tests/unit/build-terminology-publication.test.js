import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTerminologyPublication } from '../../src/publishing/build-terminology-publication.js';

test('builds and validates a versioned publication from the repository contract', async () => {
    const repository = {
        async getLanguages(guiLanguage) {
            return [
                { code: 'xx-XX', name: guiLanguage === 'de-DE' ? 'Alpha DE' : 'Alpha EN', isSource: true },
                { code: 'yy-YY', name: guiLanguage === 'de-DE' ? 'Beta DE' : 'Beta EN', isSource: false }
            ];
        },
        async getTerms(language) {
            return [{ conceptID: 1001, term: `${language} term`, weighting: 2 }];
        },
        async getConcept(conceptId) {
            return {
                id: conceptId,
                languages: ['xx-XX', 'yy-YY'].map(code => ({
                    code,
                    terms: [{ term: `${code} term`, weighting: 2 }],
                    definition: { text: '', footnote: '' },
                    contexts: [],
                    information: [],
                    infobox: '',
                    links: [],
                    imageFileName: ''
                }))
            };
        }
    };

    const publication = await buildTerminologyPublication({
        repository,
        tenantId: 'TENANT',
        termbaseId: 'TERMBASE',
        termbaseName: 'Terminology',
        publicationId: 'PUBLICATION-1',
        revision: '1',
        publishedAt: '2026-08-21T10:00:00.000Z'
    });

    assert.equal(publication.termbase.sourceLanguage, 'xx-XX');
    assert.deepEqual(publication.termbase.languages[0].names, {
        'de-DE': 'Alpha DE',
        'en-GB': 'Alpha EN'
    });
    assert.deepEqual(publication.concepts.map(concept => concept.id), ['1001']);
    assert.deepEqual(publication.termsByLanguage['xx-XX'].map(term => term.conceptID), ['1001']);
});

test('stops publication when a referenced concept cannot be loaded', async () => {
    const repository = {
        async getLanguages() { return [{ code: 'xx-XX', name: 'Alpha', isSource: true }]; },
        async getTerms() { return [{ conceptID: 'MISSING', term: 'term', weighting: 2 }]; },
        async getConcept() { return null; }
    };
    await assert.rejects(
        buildTerminologyPublication({
            repository,
            tenantId: 'TENANT',
            termbaseId: 'TERMBASE',
            termbaseName: 'Terminology',
            publicationId: 'PUBLICATION-1',
            revision: '1',
            publishedAt: '2026-08-21T10:00:00.000Z',
            guiLanguages: ['de-DE']
        }),
        /MISSING/
    );
});
