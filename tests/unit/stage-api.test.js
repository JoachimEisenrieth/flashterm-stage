import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    createStageServer,
    isPublicAppPath,
    parseDefaultTargetLanguages,
    pathsResolveToSameFile
} from '../../scripts/stage-server.js';
import { createSessionManager } from '../../src/server/auth-session.js';
import { createFilePublicationStore } from '../../src/server/file-publication-store.js';
import { createStageAuth } from '../../src/server/stage-auth.js';

const publicationFixtureUrl = new URL(
    '../fixtures/terminology-publication-v1.json',
    import.meta.url
);
const publicationFixture = JSON.parse(await readFile(publicationFixtureUrl, 'utf8'));
const TEST_TOKEN = 'TEST-PUBLISH-TOKEN';

test('parses configured default target languages by termbase', () => {
    assert.deepEqual(
        parseDefaultTargetLanguages('{" PARIPHARMA ":" en-GB "}'),
        { PARIPHARMA: 'en-GB' }
    );
    assert.throws(
        () => parseDefaultTargetLanguages('{"PARIPHARMA":""}'),
        /termbase ID and language code/
    );
});

test('exposes only browser assets from the application directory', () => {
    for (const pathname of [
        '/',
        '/index.html',
        '/manual-de.html',
        '/flashterm.js',
        '/json/translations.json',
        '/svg/logo-grau.svg',
        '/src/app/terminology-repository.js',
        '/src/domain/terminology.js',
        '/src/infrastructure/filemaker-concept-records.js',
        '/src/repositories/stage-terminology-repository.js'
    ]) {
        assert.equal(isPublicAppPath(pathname), true, pathname);
    }
    for (const pathname of [
        '/package.json',
        '/config.example.js',
        '/scripts/stage-server.js',
        '/src/server/stage-auth.js',
        '/src/publishing/filemaker-data-api-client.js',
        '/tests/fixtures/terminology-publication-v1.json',
        '/deploy/windows/service.env.example',
        '/.git/config',
        '/src/app/../server/stage-auth.js',
        '/src/app/%2e%2e/server/stage-auth.js',
        '/src/app\\..\\server\\stage-auth.js'
    ]) {
        assert.equal(isPublicAppPath(pathname), false, pathname);
    }
});

test('recognizes the Stage entry script through a release directory link', async t => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-link-'));
    const actualDirectory = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
    const linkedDirectory = path.join(temporaryDirectory, 'current');
    await symlink(actualDirectory, linkedDirectory, process.platform === 'win32' ? 'junction' : 'dir');
    t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));

    assert.equal(await pathsResolveToSameFile(
        path.join(linkedDirectory, 'scripts', 'stage-server.js'),
        path.join(actualDirectory, 'scripts', 'stage-server.js')
    ), true);
});

async function listen(server) {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function createFixtureServer(t, {
    publishToken = TEST_TOKEN,
    publishTermbaseIds = ['*']
} = {}) {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-api-'));
    const store = createFilePublicationStore({ dataDirectory });
    const server = createStageServer({
        store,
        tenantId: 'TEST-TENANT',
        publishToken,
        publishTermbaseIds
    });
    t.after(async () => {
        await close(server);
        await rm(dataDirectory, { recursive: true, force: true });
    });
    return { origin: await listen(server), store };
}

function adminHeaders() {
    return {
        Authorization: `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
    };
}

test('reports health and starts with no active termbases', async t => {
    const { origin } = await createFixtureServer(t);

    const healthResponse = await fetch(`${origin}/api/health`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { status: 'ok' });

    const termbaseResponse = await fetch(`${origin}/api/termbases`);
    assert.equal(termbaseResponse.status, 200);
    assert.deepEqual(await termbaseResponse.json(), { termbases: [] });
});

test('keeps publishing disabled when no token is configured', async t => {
    const { origin } = await createFixtureServer(t, { publishToken: '' });

    const response = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publicationFixture)
    });

    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, 'PUBLISHING_DISABLED');
});

test('requires the publishing token for every administrative route', async t => {
    const { origin } = await createFixtureServer(t);

    const response = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publicationFixture)
    });

    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'UNAUTHORIZED');
});

test('restricts a publication token to configured termbases', async t => {
    const { origin } = await createFixtureServer(t, {
        publishTermbaseIds: ['ALLOWED-TERMBASE']
    });
    const response = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(publicationFixture)
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'FORBIDDEN');
});

test('publishes, activates, reads and lists a terminology revision', async t => {
    const { origin } = await createFixtureServer(t);

    const publishResponse = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(publicationFixture)
    });
    assert.equal(publishResponse.status, 201);

    const retryResponse = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(publicationFixture)
    });
    assert.equal(retryResponse.status, 200);

    const imageBytes = Buffer.from('synthetic png bytes');
    const assetResponse = await fetch(
        `${origin}/api/admin/termbases/TEST-TERMBASE/publications/TEST-PUBLICATION-001/assets/TEST-001.png`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'image/png'
            },
            body: imageBytes
        }
    );
    assert.equal(assetResponse.status, 201);
    assert.equal((await assetResponse.json()).size, imageBytes.length);
    const assetRetryResponse = await fetch(
        `${origin}/api/admin/termbases/TEST-TERMBASE/publications/TEST-PUBLICATION-001/assets/TEST-001.png`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'image/png'
            },
            body: imageBytes
        }
    );
    assert.equal(assetRetryResponse.status, 200);

    const assetListResponse = await fetch(
        `${origin}/api/admin/termbases/TEST-TERMBASE/publications/TEST-PUBLICATION-001/assets`,
        { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
    );
    assert.deepEqual(
        (await assetListResponse.json()).assets.map(asset => asset.fileName),
        ['TEST-001.png']
    );

    const activationResponse = await fetch(
        `${origin}/api/admin/termbases/TEST-TERMBASE/activations`,
        {
            method: 'POST',
            headers: adminHeaders(),
            body: JSON.stringify({ publicationId: 'TEST-PUBLICATION-001' })
        }
    );
    assert.equal(activationResponse.status, 201);

    const termbasesResponse = await fetch(`${origin}/api/termbases`);
    assert.deepEqual((await termbasesResponse.json()).termbases.map(item => item.id), [
        'TEST-TERMBASE'
    ]);

    const metadataResponse = await fetch(`${origin}/api/termbases/TEST-TERMBASE`);
    assert.equal((await metadataResponse.json()).publication.revision, '1');

    const languagesResponse = await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/languages?guiLanguage=de-DE`
    );
    assert.deepEqual((await languagesResponse.json()).languages[0], {
        code: 'xx-XX',
        name: 'Alphasprache',
        isSource: true
    });

    const termsResponse = await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/terms?language=xx-XX`
    );
    assert.equal((await termsResponse.json()).terms[0].conceptID, 'TEST-001');

    const conceptResponse = await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/concepts/TEST-001`
    );
    assert.equal((await conceptResponse.json()).concept.id, 'TEST-001');

    const missingConceptResponse = await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/concepts/TEST-MISSING`
    );
    assert.equal(missingConceptResponse.status, 404);

    const imageResponse = await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/assets/TEST-001.png`
    );
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get('content-type'), 'image/png');
    assert.equal(imageResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), imageBytes);

    const publicationsResponse = await fetch(
        `${origin}/api/admin/termbases/TEST-TERMBASE/publications`,
        { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
    );
    assert.deepEqual(
        (await publicationsResponse.json()).publications.map(item => item.id),
        ['TEST-PUBLICATION-001']
    );
});

test('rejects publications for a different configured tenant', async t => {
    const { origin } = await createFixtureServer(t);
    const publication = structuredClone(publicationFixture);
    publication.publication.tenantId = 'OTHER-TENANT';

    const response = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify(publication)
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'INVALID_ID');
});

test('serves the browser app with a public config for the active termbase', async t => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-data-'));
    const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-root-'));
    await writeFile(path.join(rootDirectory, 'index.html'), '<h1>flashterm stage</h1>');
    const store = createFilePublicationStore({ dataDirectory });
    await store.savePublication(structuredClone(publicationFixture));
    await store.savePublicationAsset('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001', { fileName: 'TEST-001.png', contentType: 'image/png', data: Buffer.from('test image') });
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    const server = createStageServer({
        store,
        tenantId: 'TEST-TENANT',
        publishToken: TEST_TOKEN,
        rootDirectory,
        defaultTargetLanguages: {
            'TEST-TERMBASE': 'yy-YY',
            'HIDDEN-TERMBASE': 'zz-ZZ'
        }
    });
    t.after(async () => {
        await close(server);
        await rm(dataDirectory, { recursive: true, force: true });
        await rm(rootDirectory, { recursive: true, force: true });
    });
    const origin = await listen(server);

    const appResponse = await fetch(`${origin}/`);
    assert.equal(appResponse.status, 200);
    assert.equal(await appResponse.text(), '<h1>flashterm stage</h1>');

    const configResponse = await fetch(`${origin}/config.js`);
    const configSource = await configResponse.text();
    const browserConfig = JSON.parse(
        configSource.match(/^export const config = (.*);\n$/s)[1]
    );
    assert.deepEqual(browserConfig, {
        dataSource: 'published',
        termbaseId: 'TEST-TERMBASE',
        publicationId: 'TEST-PUBLICATION-001',
        initialSourceLanguage: 'xx-XX',
        initialTargetLanguage: 'yy-YY',
        initialTargetLanguages: {
            'TEST-TERMBASE': 'yy-YY'
        }
    });
    assert.equal(configSource.includes(TEST_TOKEN), false);
    assert.equal(configSource.includes('username'), false);
    assert.equal(configSource.includes('password'), false);
});

test('trusted-intranet grants every reachable client read access without a login', async t => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-trusted-'));
    const store = createFilePublicationStore({ dataDirectory });
    await store.savePublication(structuredClone(publicationFixture));
    await store.savePublicationAsset('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001', { fileName: 'TEST-001.png', contentType: 'image/png', data: Buffer.from('test image') });
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    const auth = createStageAuth({ mode: 'trusted-intranet' });
    const server = createStageServer({
        store,
        tenantId: 'TEST-TENANT',
        auth,
        publishToken: 'test-publish-token'
    });
    t.after(async () => {
        await close(server);
        await rm(dataDirectory, { recursive: true, force: true });
    });
    const origin = await listen(server);

    assert.equal(auth.required, false);
    const listResponse = await fetch(`${origin}/api/termbases`);
    assert.equal(listResponse.status, 200);
    assert.deepEqual((await listResponse.json()).termbases.map(item => item.id), [
        'TEST-TERMBASE'
    ]);
    assert.deepEqual(await (await fetch(`${origin}/api/session`)).json(), {
        user: { displayName: 'Intranet' }
    });
    const loginResponse = await fetch(`${origin}/auth/login?returnTo=%2Fflashterm.html`, {
        redirect: 'manual'
    });
    assert.equal(loginResponse.status, 303);
    assert.equal(loginResponse.headers.get('location'), '/flashterm.html');

    const publicationResponse = await fetch(`${origin}/api/admin/publications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publicationFixture)
    });
    assert.equal(publicationResponse.status, 401);
});

test('rejects an unknown Stage access mode', () => {
    assert.throws(() => createStageAuth({ mode: 'intranet' }), /Unknown Stage authentication mode/);
});

test('clears the local session and redirects OIDC logout through the provider', async () => {
    let responseStatus;
    let responseHeaders;
    let ended = false;
    const auth = createStageAuth({
        mode: 'oidc',
        publicOrigin: 'https://stage.example.test',
        sessionManager: {
            getSession() { return null; },
            clearSession() { return 'flashterm_session=; Max-Age=0'; }
        },
        oidcClient: {
            createLogoutUrl(returnTo) {
                assert.equal(returnTo, 'https://stage.example.test/');
                return 'https://identity.example.test/v2/logout?client_id=TEST';
            }
        }
    });
    const handled = await auth.handle(
        {
            method: 'POST',
            headers: {
                host: 'stage.example.test',
                origin: 'https://stage.example.test'
            }
        },
        {
            writeHead(status, headers) {
                responseStatus = status;
                responseHeaders = headers;
            },
            end() { ended = true; }
        },
        new URL('https://stage.example.test/auth/logout')
    );

    assert.equal(handled, true);
    assert.equal(responseStatus, 303);
    assert.equal(responseHeaders.Location, 'https://identity.example.test/v2/logout?client_id=TEST');
    assert.deepEqual(responseHeaders['Set-Cookie'], ['flashterm_session=; Max-Age=0']);
    assert.equal(ended, true);
});

test('requires a person session and enforces termbase grants on every read route', async t => {
    const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-stage-auth-'));
    const store = createFilePublicationStore({ dataDirectory });
    await store.savePublication(structuredClone(publicationFixture));
    await store.savePublicationAsset(
        'TEST-TENANT',
        'TEST-TERMBASE',
        'TEST-PUBLICATION-001',
        {
            fileName: 'TEST-001.png',
            contentType: 'image/png',
            data: Buffer.from('authenticated image')
        }
    );
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    const auth = createStageAuth({
        mode: 'development',
        sessionManager: createSessionManager(),
        developmentIdentity: {
            subject: 'TEST-PERSON',
            displayName: 'Test Person',
            groups: ['test'],
            termbaseIds: ['TEST-TERMBASE']
        }
    });
    const server = createStageServer({ store, tenantId: 'TEST-TENANT', auth });
    t.after(async () => {
        await close(server);
        await rm(dataDirectory, { recursive: true, force: true });
    });
    const origin = await listen(server);

    assert.equal((await fetch(`${origin}/api/termbases`)).status, 401);
    assert.equal((await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/assets/TEST-001.png`
    )).status, 401);
    const loginPage = await fetch(`${origin}/auth/login?returnTo=%2F`, { redirect: 'manual' });
    const loginCookie = loginPage.headers.getSetCookie()[0].split(';', 1)[0];
    const state = (await loginPage.text()).match(/name="state" value="([^"]+)"/)[1];
    const loginResponse = await fetch(`${origin}/auth/dev-login`, {
        method: 'POST',
        redirect: 'manual',
        headers: { Cookie: loginCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ state })
    });
    assert.equal(loginResponse.status, 303);
    const sessionCookie = loginResponse.headers.getSetCookie()
        .find(value => value.startsWith('flashterm_session='))
        .split(';', 1)[0];
    const headers = { Cookie: sessionCookie };

    const listResponse = await fetch(`${origin}/api/termbases`, { headers });
    assert.deepEqual((await listResponse.json()).termbases.map(item => item.id), ['TEST-TERMBASE']);
    assert.equal((await fetch(`${origin}/api/termbases/TEST-TERMBASE`, { headers })).status, 200);
    assert.equal((await fetch(
        `${origin}/api/termbases/TEST-TERMBASE/assets/TEST-001.png`,
        { headers }
    )).status, 200);
    assert.equal((await fetch(`${origin}/api/termbases/NOT-GRANTED`, { headers })).status, 404);
    assert.deepEqual(await (await fetch(`${origin}/api/session`, { headers })).json(), {
        user: { displayName: 'Test Person' }
    });
});


test('serves the default source marker for multiple master languages', async t => {
    const { origin, store } = await createFixtureServer(t);
    const publication = structuredClone(publicationFixture);
    publication.termbase.languages[1].isSource = true;
    await store.savePublication(publication);
    await store.savePublicationAsset('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001', { fileName: 'TEST-001.png', contentType: 'image/png', data: Buffer.from('test image') });
    await store.activatePublication('TEST-TENANT', 'TEST-TERMBASE', 'TEST-PUBLICATION-001');
    const response = await fetch(`${origin}/api/termbases/TEST-TERMBASE/languages?guiLanguage=de-DE`);
    assert.equal(response.status, 200);
    const { languages } = await response.json();
    assert.deepEqual(languages.map(({code, isSource, isDefaultSource}) => ({code, isSource, isDefaultSource})), [
        {code: 'xx-XX', isSource: true, isDefaultSource: true},
        {code: 'yy-YY', isSource: true, isDefaultSource: false}
    ]);
});
