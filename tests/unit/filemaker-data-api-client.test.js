import assert from 'node:assert/strict';
import test from 'node:test';

import { createFileMakerDataApiClient } from '../../src/publishing/filemaker-data-api-client.js';

function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

function assetResponse(data, contentType = 'image/png', status = 200) {
    const bytes = Buffer.from(data);
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers({
            'Content-Type': contentType,
            'Content-Length': String(bytes.length)
        }),
        async arrayBuffer() { return bytes; }
    };
}

test('opens one FileMaker session, performs encoded finds and always logs out', async () => {
    const calls = [];
    const client = createFileMakerDataApiClient({
        server: 'https://filemaker.example.test',
        database: 'Test Database',
        username: 'test-user',
        password: 'test-password',
        async request(url, options) {
            calls.push({ url, options });
            if (options.method === 'POST' && url.endsWith('/sessions')) {
                return response({ response: { token: 'TEST-SESSION-TOKEN' } });
            }
            if (options.method === 'DELETE') return response({ response: {} });
            return response({ response: { data: [{ fieldData: { value: 'test' } }] } });
        }
    });

    await assert.rejects(client.withSession(async ({ find }) => {
        assert.equal((await find('Test Layout', { field: 'value' })).length, 1);
        throw new Error('stop after find');
    }), /stop after find/);

    assert.equal(calls.length, 3);
    assert.match(calls[1].url, /databases\/Test%20Database\/layouts\/Test%20Layout\/_find$/);
    assert.deepEqual(JSON.parse(calls[1].options.body), {
        query: [{ field: 'value' }],
        limit: '10000',
        offset: '1'
    });
    assert.equal(calls[2].options.method, 'DELETE');
});

test('reads all FileMaker find pages using stable offsets', async () => {
    const offsets = [];
    const client = createFileMakerDataApiClient({
        server: 'https://filemaker.example.test',
        database: 'Test',
        username: 'user',
        password: 'password',
        recordLimit: 2,
        async request(url, options) {
            if (url.endsWith('/sessions') && options.method === 'POST') {
                return response({ response: { token: 'TOKEN' } });
            }
            if (options.method === 'DELETE') return response({ response: {} });
            const offset = JSON.parse(options.body).offset;
            offsets.push(offset);
            const data = offset === '1'
                ? [{ fieldData: { id: 1 } }, { fieldData: { id: 2 } }]
                : [{ fieldData: { id: 3 } }];
            return response({ response: { data, dataInfo: { foundCount: 3 } } });
        }
    });
    const records = await client.withSession(({ find }) => find('Layout', { id: '*' }));
    assert.deepEqual(records.map(record => record.fieldData.id), [1, 2, 3]);
    assert.deepEqual(offsets, ['1', '3']);
});

test('rejects a non-HTTPS FileMaker origin before sending credentials', () => {
    assert.throws(() => createFileMakerDataApiClient({
        server: 'http://filemaker.example.test',
        database: 'Test',
        username: 'user',
        password: 'password'
    }), /HTTPS/);
});

test('downloads encoded FileMaker image assets with validated type and size', async () => {
    const calls = [];
    const client = createFileMakerDataApiClient({
        server: 'https://filemaker.example.test',
        database: 'Test Database',
        username: 'user',
        password: 'password',
        async request(url, options) {
            calls.push({ url, options });
            return assetResponse('synthetic image', 'image/png; charset=binary');
        }
    });

    const asset = await client.downloadAsset('Test image.png');
    assert.equal(
        calls[0].url,
        'https://filemaker.example.test/public/RC_Data_FMS/Test%20Database/Files/Images/Test%20image.png'
    );
    assert.equal(asset.fileName, 'Test image.png');
    assert.equal(asset.contentType, 'image/png');
    assert.deepEqual(asset.data, Buffer.from('synthetic image'));
});

test('rejects unsafe, unsupported and oversized FileMaker assets', async () => {
    const unsupported = createFileMakerDataApiClient({
        server: 'https://filemaker.example.test',
        database: 'Test', username: 'user', password: 'password',
        async request() { return assetResponse('<svg/>', 'image/svg+xml'); }
    });
    await assert.rejects(unsupported.downloadAsset('../escape.png'), /file name is invalid/i);
    await assert.rejects(unsupported.downloadAsset('unsafe.svg'), /type is not supported/i);

    const oversized = createFileMakerDataApiClient({
        server: 'https://filemaker.example.test',
        database: 'Test', username: 'user', password: 'password',
        maximumAssetBytes: 3,
        async request() { return assetResponse('four', 'image/png'); }
    });
    await assert.rejects(oversized.downloadAsset('large.png'), /size limit/i);
});
