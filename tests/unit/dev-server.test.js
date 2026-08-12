import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import test from 'node:test';

import { createDevelopmentServer } from '../../scripts/dev-server.js';

const fixtureConfig = {
    server: 'https://filemaker.test.example',
    database: 'TEST_DATABASE',
    username: 'TEST_USER',
    password: 'TEST_PASSWORD',
    imagePath: 'https://images.test.example/',
    initialSourceLanguage: 'de-DE',
    initialTargetLanguage: 'en-GB'
};

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

test('serves static project files', async t => {
    const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-dev-server-'));
    const server = createDevelopmentServer({ rootDirectory, config: fixtureConfig });
    t.after(async () => {
        await close(server);
        await rm(rootDirectory, { recursive: true, force: true });
    });
    await writeFile(path.join(rootDirectory, 'index.html'), '<h1>Flashterm test</h1>');

    const origin = await listen(server);
    const response = await fetch(`${origin}/`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.equal(await response.text(), '<h1>Flashterm test</h1>');
});

test('virtual config changes only the browser server value', async t => {
    const server = createDevelopmentServer({ rootDirectory: process.cwd(), config: fixtureConfig });
    t.after(() => close(server));
    const origin = await listen(server);

    const response = await fetch(`${origin}/config.js`);
    const source = await response.text();
    const browserConfig = JSON.parse(source.match(/^export const config = (.*);\n$/s)[1]);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(browserConfig, { ...fixtureConfig, server: '' });
    assert.equal(source.includes(fixtureConfig.server), false);
});

test('proxies FileMaker methods, headers, bodies, and responses without proxying other paths', async t => {
    const calls = [];
    function proxyRequest(url, options, callback) {
        const request = new PassThrough();
        const body = [];
        request.on('data', chunk => body.push(chunk));
        request.on('finish', () => {
            calls.push({
                url: url.href,
                method: options.method,
                headers: options.headers,
                body: Buffer.concat(body).toString()
            });
            const response = Readable.from([JSON.stringify({ result: 'TEST' })]);
            response.statusCode = 200;
            response.headers = {
                'content-type': 'application/json',
                'x-test-response': 'present'
            };
            callback(response);
        });
        return request;
    }

    const rootDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-dev-server-'));
    await writeFile(path.join(rootDirectory, 'index.html'), 'static');
    const server = createDevelopmentServer({ rootDirectory, config: fixtureConfig, proxyRequest });
    t.after(async () => {
        await close(server);
        await rm(rootDirectory, { recursive: true, force: true });
    });
    const origin = await listen(server);

    for (const method of ['OPTIONS', 'POST', 'GET', 'DELETE']) {
        const response = await fetch(`${origin}/fmi/data/vLatest/test?mode=TEST`, {
            method,
            headers: {
                'Authorization': 'Bearer TEST_TOKEN',
                'Content-Type': 'application/json'
            },
            body: method === 'POST' ? JSON.stringify({ test: true }) : undefined
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('x-test-response'), 'present');
        assert.deepEqual(await response.json(), { result: 'TEST' });
    }

    const staticResponse = await fetch(`${origin}/`);
    assert.equal(await staticResponse.text(), 'static');
    assert.equal(calls.length, 4);
    assert.deepEqual(calls.map(call => call.method), ['OPTIONS', 'POST', 'GET', 'DELETE']);
    assert.equal(calls[0].url, 'https://filemaker.test.example/fmi/data/vLatest/test?mode=TEST');
    assert.equal(calls[1].headers.authorization, 'Bearer TEST_TOKEN');
    assert.equal(calls[1].headers['content-type'], 'application/json');
    assert.equal(calls[1].body, JSON.stringify({ test: true }));
});

test('rejects non-HTTPS FileMaker upstream servers', () => {
    assert.throws(
        () => createDevelopmentServer({
            rootDirectory: process.cwd(),
            config: { ...fixtureConfig, server: 'http://filemaker.test.example' }
        }),
        /requires an HTTPS upstream server/
    );
});
