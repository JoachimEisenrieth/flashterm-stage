import assert from 'node:assert/strict';
import test from 'node:test';

import { createStagePublicationClient } from '../../src/publishing/stage-publication-client.js';

function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

test('publishes and activates through the separate administrative credential', async () => {
    const calls = [];
    const client = createStagePublicationClient({
        origin: 'http://127.0.0.1:8100',
        publishToken: 'TEST-TOKEN',
        async request(url, options) {
            calls.push({ url, options });
            return response({ ok: true }, options.method === 'POST' ? 201 : 200);
        }
    });
    await client.publish({ publication: { id: 'PUBLICATION' } });
    await client.uploadAsset('TERM BASE', 'PUBLICATION', {
        fileName: 'test image.png',
        contentType: 'image/png',
        data: Buffer.from('image')
    });
    await client.activate('TERM BASE', 'PUBLICATION');

    assert.deepEqual(calls.map(call => call.url), [
        'http://127.0.0.1:8100/api/admin/publications',
        'http://127.0.0.1:8100/api/admin/termbases/TERM%20BASE/publications/PUBLICATION/assets/test%20image.png',
        'http://127.0.0.1:8100/api/admin/termbases/TERM%20BASE/activations'
    ]);
    assert.ok(calls.every(call => call.options.headers.Authorization === 'Bearer TEST-TOKEN'));
    assert.equal(calls[1].options.method, 'PUT');
    assert.equal(calls[1].options.headers['Content-Type'], 'image/png');
});

test('requires HTTPS for a non-loopback Stage server', () => {
    assert.throws(() => createStagePublicationClient({
        origin: 'http://stage.example.test',
        publishToken: 'TEST'
    }), /HTTPS/);
});
