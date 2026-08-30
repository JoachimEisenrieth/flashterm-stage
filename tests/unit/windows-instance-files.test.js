import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { parseWindowsInstanceArguments } from '../../scripts/create-windows-instance-files.js';
import {
    buildWindowsInstanceFiles,
    writeWindowsInstanceFiles
} from '../../src/deployment/windows-instance-files.js';

test('renders isolated Windows files for internet and intranet instances', () => {
    const internet = buildWindowsInstanceFiles({
        instanceId: 'internet',
        port: 8100,
        publicOrigin: 'https://stage.example.org'
    });
    const intranet = buildWindowsInstanceFiles({
        instanceId: 'intranet',
        port: 8200,
        publicOrigin: 'https://stage.intern.example.org'
    });

    assert.equal(internet.serviceId, 'flashterm-stage-internet');
    assert.equal(intranet.serviceId, 'flashterm-stage-intranet');
    assert.notEqual(internet.settingsPath, intranet.settingsPath);
    assert.notEqual(internet.dataDirectory, intranet.dataDirectory);
    assert.match(intranet.files['service.env.example'], /FLASHTERM_STAGE_PORT=8200/);
    assert.match(intranet.files['service.env.example'], /FLASHTERM_STAGE_PUBLIC_ORIGIN=https:\/\/stage\.intern\.example\.org/);
    assert.match(intranet.files['iis/web.config'], /127\.0\.0\.1:8200/);
    assert.match(
        intranet.files['flashterm-stage-intranet-service.xml'],
        /<id>flashterm-stage-intranet<\/id>/
    );
    assert.doesNotMatch(intranet.files['service.env.example'], /stage\.example\.org/);
});

test('rejects ambiguous or unsafe Windows instance parameters', () => {
    assert.throws(() => buildWindowsInstanceFiles({
        instanceId: 'Intranet',
        port: 8200,
        publicOrigin: 'https://stage.intern.example.org'
    }), /instanceId/);
    assert.throws(() => buildWindowsInstanceFiles({
        instanceId: 'intranet',
        port: 80,
        publicOrigin: 'https://stage.intern.example.org'
    }), /port/);
    assert.throws(() => buildWindowsInstanceFiles({
        instanceId: 'intranet',
        port: 8200,
        publicOrigin: 'http://stage.intern.example.org'
    }), /HTTPS origin/);
    assert.throws(() => buildWindowsInstanceFiles({
        instanceId: 'intranet',
        port: 8200,
        publicOrigin: 'https://stage.intern.example.org/subpath'
    }), /without credentials, path, query or fragment/);
    assert.throws(() => buildWindowsInstanceFiles({
        instanceId: 'intranet',
        port: 8200,
        publicOrigin: 'https://stage.intern.example.org',
        dataDirectory: 'relative\\data'
    }), /absolute Windows path/);
});

test('writes a complete bundle once and parses the documented CLI options', async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-instance-'));
    try {
        const options = parseWindowsInstanceArguments([
            '--instance', 'intranet',
            '--port', '8200',
            '--origin', 'https://stage.intern.example.org',
            '--output', temporaryDirectory,
            '--tenant', 'INTRANET-TENANT',
            '--termbase', 'INTERNAL-TERMBASE'
        ]);
        const result = await writeWindowsInstanceFiles(options);
        const settings = await readFile(
            path.join(result.outputDirectory, 'service.env.example'),
            'utf8'
        );
        const proxy = await readFile(
            path.join(result.outputDirectory, 'iis', 'web.config'),
            'utf8'
        );

        assert.match(settings, /FLASHTERM_STAGE_TENANT=INTRANET-TENANT/);
        assert.match(settings, /FLASHTERM_PUBLISH_TERMBASES=INTERNAL-TERMBASE/);
        assert.match(proxy, /127\.0\.0\.1:8200/);
        await assert.rejects(() => writeWindowsInstanceFiles(options), /already exists/);
    } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
    }
});
