import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    TerminologyPublicationError,
    validateTerminologyPublication
} from '../../src/domain/terminology-publication.js';
import {
    createPublishedTerminologyRepository
} from '../../src/repositories/published-terminology-repository.js';

const publicationFixtureUrl = new URL(
    '../fixtures/terminology-publication-v1.json',
    import.meta.url
);
const publicationFixture = JSON.parse(await readFile(publicationFixtureUrl, 'utf8'));

function clonePublication() {
    return structuredClone(publicationFixture);
}

test('accepts a structurally valid version 1 publication', () => {
    const publication = clonePublication();

    assert.equal(validateTerminologyPublication(publication), publication);
});

test('rejects a publication whose term references an unknown concept', () => {
    const publication = clonePublication();
    publication.termsByLanguage['xx-XX'][0].conceptID = 'TEST-MISSING';

    assert.throws(
        () => validateTerminologyPublication(publication),
        error => error instanceof TerminologyPublicationError
            && error.message.includes('references an unknown concept')
    );
});

test('rejects a publication with an inconsistent source language', () => {
    const publication = clonePublication();
    publication.termbase.sourceLanguage = 'yy-YY';

    assert.throws(
        () => validateTerminologyPublication(publication),
        error => error instanceof TerminologyPublicationError
            && error.message.includes('language marked as source')
    );
});

test('published repository exposes the existing terminology repository contract', async () => {
    const calls = [];
    const repository = createPublishedTerminologyRepository({
        async loadPublication() {
            calls.push('load');
            return clonePublication();
        }
    });

    assert.deepEqual(await repository.getLanguages('de-DE'), [
        { code: 'xx-XX', name: 'Alphasprache', isSource: true },
        { code: 'yy-YY', name: 'Betasprache', isSource: false }
    ]);
    assert.deepEqual(await repository.getTerms('xx-XX'), [
        { conceptID: 'TEST-001', term: 'alpha term', weighting: 2 }
    ]);
    assert.equal((await repository.getConcept('TEST-001')).id, 'TEST-001');
    assert.equal(await repository.getConcept('TEST-MISSING'), null);
    assert.deepEqual(await repository.getPublicationMetadata(), {
        id: 'TEST-PUBLICATION-001',
        tenantId: 'TEST-TENANT',
        termbaseId: 'TEST-TERMBASE',
        revision: '1',
        publishedAt: '2026-08-21T10:00:00.000Z',
        name: 'Synthetic terminology',
        sourceLanguage: 'xx-XX',
        assetBasePath: '/api/termbases/TEST-TERMBASE/assets/'
    });
    assert.deepEqual(calls, ['load']);
});

test('published repository retries loading after a failed publication validation', async () => {
    let attempts = 0;
    const repository = createPublishedTerminologyRepository({
        async loadPublication() {
            attempts += 1;
            if (attempts === 1) {
                return { schemaVersion: 999 };
            }
            return clonePublication();
        }
    });

    await assert.rejects(repository.getLanguages('en-GB'), TerminologyPublicationError);
    assert.equal((await repository.getLanguages('en-GB'))[0].name, 'Alpha language');
    assert.equal(attempts, 2);
});
