import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
    createFilePublicationStore,
    PublicationStoreError
} from '../../src/server/file-publication-store.js';

const publicationFixtureUrl = new URL(
    '../fixtures/terminology-publication-v1.json',
    import.meta.url
);
const publicationFixture = JSON.parse(await readFile(publicationFixtureUrl, 'utf8'));

function clonePublication() {
    return structuredClone(publicationFixture);
}

async function saveFixtureImage(store, publicationId) {
    await store.savePublicationAsset('TEST-TENANT', 'TEST-TERMBASE', publicationId, {
        fileName: 'TEST-001.png', contentType: 'image/png', data: Buffer.from('test image')
    });
}

async function createFixtureStore(t) {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-store-'));
    t.after(() => rm(dataDirectory, { recursive: true, force: true }));
    return {
        dataDirectory,
        store: createFilePublicationStore({ dataDirectory, now: () => 1_777_777_777_000 })
    };
}

test('stores a publication immutably and accepts an identical retry', async t => {
    const { dataDirectory, store } = await createFixtureStore(t);
    const publication = clonePublication();

    assert.deepEqual(await store.savePublication(publication), {
        created: true,
        publicationId: 'TEST-PUBLICATION-001'
    });
    assert.deepEqual(await store.savePublication(clonePublication()), {
        created: false,
        publicationId: 'TEST-PUBLICATION-001'
    });

    const storedPath = path.join(
        dataDirectory,
        'tenants',
        'TEST-TENANT',
        'termbases',
        'TEST-TERMBASE',
        'publications',
        'TEST-PUBLICATION-001',
        'publication.json'
    );
    assert.deepEqual(JSON.parse(await readFile(storedPath, 'utf8')), publication);
});

test('rejects different content for an existing publication ID', async t => {
    const { store } = await createFixtureStore(t);
    await store.savePublication(clonePublication());
    const changed = clonePublication();
    changed.termbase.name = 'Changed terminology';

    await assert.rejects(
        store.savePublication(changed),
        error => error instanceof PublicationStoreError && error.code === 'CONFLICT'
    );
});

test('activates revisions atomically and rolls back by adding a new activation', async t => {
    const { store } = await createFixtureStore(t);
    const first = clonePublication();
    const second = clonePublication();
    second.publication.id = 'TEST-PUBLICATION-002';
    second.publication.revision = '2';
    second.publication.publishedAt = '2026-08-21T11:00:00.000Z';
    second.termbase.name = 'Synthetic terminology revision 2';

    await store.savePublication(first);
    await store.savePublication(second);
    await saveFixtureImage(store, first.publication.id);
    await saveFixtureImage(store, second.publication.id);
    await assert.rejects(
        store.getActivePublication('TEST-TENANT', 'TEST-TERMBASE'),
        error => error instanceof PublicationStoreError && error.code === 'NOT_FOUND'
    );

    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    assert.equal(
        (await store.getActivePublication('TEST-TENANT', 'TEST-TERMBASE')).publication.revision,
        '1'
    );

    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-002');
    assert.equal(
        (await store.getActivePublication('TEST-TENANT', 'TEST-TERMBASE')).publication.revision,
        '2'
    );

    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    assert.equal(
        (await store.getActivePublication('TEST-TENANT', 'TEST-TERMBASE')).publication.revision,
        '1'
    );
    assert.deepEqual(
        (await store.listPublications('TEST-TENANT', 'TEST-TERMBASE')).map(item => item.id),
        ['TEST-PUBLICATION-001', 'TEST-PUBLICATION-002']
    );
});

test('lists only termbases with an active publication', async t => {
    const { store } = await createFixtureStore(t);
    await store.savePublication(clonePublication());

    assert.deepEqual(await store.listTermbases('TEST-TENANT'), []);
    await saveFixtureImage(store, 'TEST-PUBLICATION-001');
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    assert.deepEqual(await store.listTermbases('TEST-TENANT'), [
        {
            id: 'TEST-TERMBASE',
            name: 'Synthetic terminology',
            sourceLanguage: 'xx-XX',
            publication: publicationFixture.publication
        }
    ]);
});

test('rejects identifiers that could escape the data directory', async t => {
    const { store } = await createFixtureStore(t);
    const publication = clonePublication();
    publication.publication.tenantId = '../TEST-TENANT';

    await assert.rejects(
        store.savePublication(publication),
        error => error instanceof PublicationStoreError && error.code === 'INVALID_ID'
    );
});

test('stores publication assets by hash and accepts only identical retries', async t => {
    const { dataDirectory, store } = await createFixtureStore(t);
    await store.savePublication(clonePublication());
    const asset = {
        fileName: 'TEST-001.png',
        contentType: 'image/png',
        data: Buffer.from('synthetic image bytes')
    };

    const created = await store.savePublicationAsset(
        'TEST-TENANT',
        'TEST-TERMBASE',
        'TEST-PUBLICATION-001',
        asset
    );
    assert.equal(created.created, true);
    assert.equal(created.fileName, asset.fileName);
    assert.equal(created.size, asset.data.length);
    assert.match(created.sha256, /^[a-f0-9]{64}$/);
    assert.equal((await store.savePublicationAsset(
        'TEST-TENANT',
        'TEST-TERMBASE',
        'TEST-PUBLICATION-001',
        asset
    )).created, false);

    const stored = await store.getPublicationAsset(
        'TEST-TENANT',
        'TEST-TERMBASE',
        'TEST-PUBLICATION-001',
        asset.fileName
    );
    assert.deepEqual(stored.data, asset.data);
    assert.deepEqual((await store.listPublicationAssets(
        'TEST-TENANT',
        'TEST-TERMBASE',
        'TEST-PUBLICATION-001'
    )).map(({ fileName, contentType, size }) => ({ fileName, contentType, size })), [{
        fileName: 'TEST-001.png',
        contentType: 'image/png',
        size: asset.data.length
    }]);

    const publicationDirectory = path.join(
        dataDirectory,
        'tenants',
        'TEST-TENANT',
        'termbases',
        'TEST-TERMBASE',
        'publications',
        'TEST-PUBLICATION-001'
    );
    await assert.rejects(
        readFile(path.join(publicationDirectory, 'assets', asset.fileName)),
        error => error?.code === 'ENOENT'
    );
    await assert.rejects(
        store.savePublicationAsset(
            'TEST-TENANT',
            'TEST-TERMBASE',
            'TEST-PUBLICATION-001',
            { ...asset, data: Buffer.from('different bytes') }
        ),
        error => error instanceof PublicationStoreError && error.code === 'CONFLICT'
    );
});

test('rejects unsafe publication asset names, types and empty data', async t => {
    const { store } = await createFixtureStore(t);
    await store.savePublication(clonePublication());
    const save = asset => store.savePublicationAsset(
        'TEST-TENANT',
        'TEST-TERMBASE',
        'TEST-PUBLICATION-001',
        asset
    );

    await assert.rejects(save({
        fileName: '../escape.png', contentType: 'image/png', data: Buffer.from('x')
    }), /file name is invalid/i);
    await assert.rejects(save({
        fileName: 'unsafe.svg', contentType: 'image/svg+xml', data: Buffer.from('x')
    }), /type is not supported/i);
    await assert.rejects(save({
        fileName: 'empty.png', contentType: 'image/png', data: Buffer.alloc(0)
    }), error => error instanceof PublicationStoreError && error.code === 'INVALID_ASSET');
});

test('missing and damaged images cannot replace the active publication', async t => {
    const { dataDirectory, store } = await createFixtureStore(t);
    const first = clonePublication();
    first.concepts.forEach(c => c.languages.forEach(l => { l.imageFileName = ''; }));
    await store.savePublication(first);
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', first.publication.id);
    const second = clonePublication(); second.publication.id = 'WITH-IMAGE';
    await store.savePublication(second);
    await assert.rejects(store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'WITH-IMAGE'), e => e.code === 'INVALID_ASSET');
    assert.equal((await store.getActivePublication('TEST-TENANT', 'TEST-TERMBASE')).publication.id, first.publication.id);
    await saveFixtureImage(store, 'WITH-IMAGE');
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'WITH-IMAGE');
    const asset = await store.getPublicationAsset('TEST-TENANT', 'TEST-TERMBASE', 'WITH-IMAGE', 'TEST-001.png');
    await rm(path.join(dataDirectory, 'tenants', 'TEST-TENANT', 'termbases', 'TEST-TERMBASE', 'publications', 'WITH-IMAGE', 'assets', 'blobs', asset.sha256));
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', first.publication.id);
    await assert.rejects(store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'WITH-IMAGE'), e => e.code === 'INVALID_ASSET');
    assert.equal((await store.getActivePublication('TEST-TENANT', 'TEST-TERMBASE')).publication.id, first.publication.id);
});
