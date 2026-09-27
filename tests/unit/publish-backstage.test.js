import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { publishBackstage } from '../../scripts/publish-backstage.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

function imageResponse(data, contentType = 'image/png') {
    const bytes = Buffer.from(data);
    return {
        ok: true,
        status: 200,
        headers: new Headers({
            'Content-Type': contentType,
            'Content-Length': String(bytes.length)
        }),
        async arrayBuffer() { return bytes; }
    };
}

for (const imageSource of ['public', 'container']) test(`builds and activates a publication using ${imageSource} images`, async () => {
    const stageCalls = [];
    let definitionCalls = 0;
    const environment = {
        FLASHTERM_FILEMAKER_SERVER: 'https://filemaker.example.test',
        FLASHTERM_FILEMAKER_DATABASE: 'TEST-DATABASE',
        FLASHTERM_FILEMAKER_IMAGE_SOURCE: imageSource,
        FLASHTERM_FILEMAKER_USERNAME: 'TEST-USER',
        FLASHTERM_FILEMAKER_PASSWORD: 'TEST-PASSWORD',
        FLASHTERM_STAGE_ORIGIN: 'http://127.0.0.1:8100',
        FLASHTERM_PUBLISH_TOKEN: 'TEST-PUBLISH-TOKEN',
        FLASHTERM_STAGE_TENANT: 'TEST-TENANT',
        FLASHTERM_PUBLISH_TERMBASE: 'TEST-TERMBASE',
        FLASHTERM_PUBLISH_TERMBASE_NAME: 'Synthetic terminology',
        FLASHTERM_PUBLISH_ID: 'TEST-PUBLICATION-CLI',
        FLASHTERM_PUBLISH_REVISION: '2',
        FLASHTERM_PUBLISH_AT: '2026-08-21T12:00:00.000Z'
    };
    const result = await publishBackstage({
        environment,
        args: ['--activate'],
        async fileMakerRequest(url, options) {
            if (url.includes('/public/RC_Data_FMS/') || url.includes('/Streaming/')) {
                return imageResponse('synthetic image');
            }
            if (url.endsWith('/sessions') && options.method === 'POST') {
                return response({ response: { token: 'TEST-SESSION' } });
            }
            if (options.method === 'DELETE') return response({ response: {} });
            const body = JSON.parse(options.body);
            if (url.includes('/languageAPI/')) {
                const guiLanguage = body.query[0].guiLanguageCode;
                return response({ response: { data: [
                    { fieldData: { languageCode: 'xx-XX', language: `Alpha ${guiLanguage}`, source: 'xx-XX' } },
                    { fieldData: { languageCode: 'yy-YY', language: `Beta ${guiLanguage}`, source: 'xx-XX' } }
                ] } });
            }
            if (url.includes('/termAPI/')) {
                const language = body.query[0].languageCode;
                return response({ response: { data: [{
                    fieldData: { termlist: JSON.stringify([['TEST-001', `${language} term`, 2]]) }
                }] } });
            }
            if (url.includes('/imageAPI/')) return response({ response: { data: [{ fieldData: {
                ID: 'TEST-001', figureFileName: 'original.png',
                figure: 'https://filemaker.example.test/Streaming/original.png?temporary=TEST-REFERENCE'
            } }] } });
            definitionCalls += 1;
            assert.equal(body.query[0].conceptID, '*');
            return response({ response: { data: [
                { fieldData: {
                    conceptID: 'TEST-001', languageCode: 'xx-XX',
                    termlist: '[{"term":"xx-XX term","weighting":2}]',
                    definition: '[{"definition":"Definition","footnote":""}]',
                    context: '[]', info: '[]', hyperLink: '[]', infobox: '', fileName: 'TEST.png'
                } },
                { fieldData: {
                    conceptID: 'TEST-001', languageCode: 'yy-YY',
                    termlist: '[{"term":"yy-YY term","weighting":2}]',
                    definition: '[{"definition":"Definition","footnote":""}]',
                    context: '[]', info: '[]', hyperLink: '[]', infobox: '', fileName: ''
                } }
            ] } });
        },
        async stageRequest(url, options) {
            stageCalls.push({ url, options });
            return response({ ok: true }, 201);
        }
    });

    assert.deepEqual(result, {
        publicationId: 'TEST-PUBLICATION-CLI',
        termbaseId: 'TEST-TERMBASE',
        languages: 2,
        concepts: 1,
        terms: 2,
        assets: 1,
        transferred: true,
        activated: true
    });
    assert.equal(stageCalls.length, 3);
    if (imageSource === 'container') {
        const sent = JSON.parse(stageCalls[0].options.body);
        assert.equal(sent.concepts[0].languages[0].imageFileName, 'concept-TEST-001.png');
        assert.equal(sent.concepts[0].languages[1].imageFileName, 'concept-TEST-001.png');
        assert.ok(!stageCalls[0].options.body.includes('TEST-REFERENCE'));
    }
    assert.equal(definitionCalls, 1);
    assert.equal(JSON.parse(stageCalls[0].options.body).publication.id, 'TEST-PUBLICATION-CLI');
    assert.equal(stageCalls[1].options.method, 'PUT');
    assert.equal(stageCalls[1].options.headers['Content-Type'], 'image/png');
    assert.deepEqual(stageCalls[1].options.body, Buffer.from('synthetic image'));
    assert.match(stageCalls[2].url, /\/activations$/);
});

test('executes the publisher CLI when launched through a directory link', {
    skip: process.platform === 'win32'
}, t => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'flashterm-publisher-link-'));
    t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));
    const linkedProject = path.join(temporaryDirectory, 'current');
    symlinkSync(projectRoot, linkedProject, 'dir');

    const result = spawnSync(
        process.execPath,
        [path.join(linkedProject, 'scripts', 'publish-backstage.js')],
        {
            cwd: linkedProject,
            encoding: 'utf8',
            env: { ...process.env, FLASHTERM_FILEMAKER_SERVER: '' }
        }
    );

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Publication failed \(Error\)\./);
});
