import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createStageTerminologyRepository
} from '../../src/repositories/stage-terminology-repository.js';

function jsonResponse(body, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async json() {
            return body;
        }
    };
}

test('loads languages, terms and concepts from the stage API contract', async () => {
    const calls = [];
    const repository = createStageTerminologyRepository({
        termbaseId: 'TEST TERMBASE',
        async request(url, options) {
            calls.push({ url, options });
            if (url.includes('/languages?')) {
                return jsonResponse({
                    languages: [{ code: 'xx-XX', name: 'Alpha', isSource: true }]
                });
            }
            if (url.includes('/terms?')) {
                return jsonResponse({
                    terms: [{ conceptID: 'TEST-001', term: 'alpha', weighting: 2 }]
                });
            }
            return jsonResponse({ concept: { id: 'TEST/001', languages: [] } });
        }
    });

    assert.deepEqual(await repository.getLanguages('de-DE'), [
        { code: 'xx-XX', name: 'Alpha', isSource: true }
    ]);
    assert.deepEqual(await repository.getTerms('xx-XX'), [
        { conceptID: 'TEST-001', term: 'alpha', weighting: 2 }
    ]);
    assert.deepEqual(await repository.getConcept('TEST/001'), {
        id: 'TEST/001',
        languages: []
    });
    assert.deepEqual(calls.map(call => call.url), [
        '/api/termbases/TEST%20TERMBASE/languages?guiLanguage=de-DE',
        '/api/termbases/TEST%20TERMBASE/terms?language=xx-XX',
        '/api/termbases/TEST%20TERMBASE/concepts/TEST%2F001'
    ]);
    assert.ok(calls.every(call => call.options.headers.Accept === 'application/json'));
});

test('lists all active termbases through the public stage endpoint', async () => {
    const repository = createStageTerminologyRepository({
        termbaseId: 'TEST-TERMBASE',
        async request(url) {
            assert.equal(url, '/api/termbases');
            return jsonResponse({ termbases: [{ id: 'TEST-TERMBASE', name: 'Test' }] });
        }
    });

    assert.deepEqual(await repository.getTermbases(), [
        { id: 'TEST-TERMBASE', name: 'Test' }
    ]);
});

test('maps a missing stage concept to the existing null contract', async () => {
    const repository = createStageTerminologyRepository({
        termbaseId: 'TEST-TERMBASE',
        async request() {
            return jsonResponse({ error: 'NOT_FOUND' }, 404);
        }
    });

    assert.equal(await repository.getConcept('TEST-MISSING'), null);
});

for (const method of ['getTermbases', 'getLanguages', 'getTerms', 'getConcept']) {
    test(`${method} reports a failed stage API response without exposing its body`, async () => {
        const repository = createStageTerminologyRepository({
            termbaseId: 'TEST-TERMBASE',
            async request() {
                return jsonResponse({ sensitive: 'TEST-PAYLOAD' }, 503);
            }
        });

        await assert.rejects(
            repository[method]('TEST'),
            error => error.name === 'StageApiError'
                && error.status === 503
                && !error.message.includes('TEST-PAYLOAD')
        );
    });
}
