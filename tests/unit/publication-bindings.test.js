import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdditionalPublicationBindings } from '../../src/server/publication-bindings.js';
const entry = { id: 'second', sourceDatabase: 'Second', termbaseId: 'SECOND', termbaseName: 'Second', triggerToken: 'second-test-token-with-at-least-32-characters' };
const environment = { FLASHTERM_PUBLICATION_BINDINGS_FILE: '/protected/bindings.json', FLASHTERM_EXPORT_TRIGGER_TOKEN: 'first-test-token', FLASHTERM_FILEMAKER_DATABASE: 'First', FLASHTERM_PUBLISH_TERMBASE: 'FIRST', FLASHTERM_PUBLISH_TERMBASES: 'FIRST,SECOND', FLASHTERM_FILEMAKER_PASSWORD: 'test-password' };
const options = entries => ({ environment, dataDirectory: '/data', tenantId: 'tenant', store: {}, read: async () => JSON.stringify(entries) });
test('additional source uses a separate job directory and preserves shared FileMaker credentials', async () => {
    let args;
    const jobs = {};
    const result = await createAdditionalPublicationBindings({ ...options([entry]), createWorker: async value => { args = value; return jobs; } });
    assert.equal(args.environment.FLASHTERM_FILEMAKER_DATABASE, 'Second');
    assert.equal(args.environment.FLASHTERM_FILEMAKER_PASSWORD, 'test-password');
    assert.equal(args.environment.FLASHTERM_PUBLISH_TERMBASE, 'SECOND');
    assert.equal(args.jobDirectory, '/data/export-jobs-bindings/second');
    assert.deepEqual(result, [{ token: entry.triggerToken, jobs }]);
    assert.equal(environment.FLASHTERM_FILEMAKER_DATABASE, 'First');
});
test('rejects conflicting sources, targets, keys and unsafe paths before starting workers', async () => {
    for (const override of [{ id: '../escape' }, { sourceDatabase: 'FIRST' }, { termbaseId: 'FIRST' }, { triggerToken: 'first-test-token' }, { termbaseId: 'UNAPPROVED' }, { imageSource: 'bad' }]) {
        let started = false;
        await assert.rejects(createAdditionalPublicationBindings({ ...options([{ ...entry, ...override }]), createWorker: async () => { started = true; } }));
        assert.equal(started, false);
    }
    await assert.rejects(createAdditionalPublicationBindings({ ...options([entry, entry]) }));
});
test('keeps single-source setup unchanged and sanitizes parse errors', async () => {
    assert.deepEqual(await createAdditionalPublicationBindings({ environment: {} }), []);
    await assert.rejects(createAdditionalPublicationBindings({ ...options([]), read: async () => '{private-value' }), error => !error.message.includes('private-value'));
});
