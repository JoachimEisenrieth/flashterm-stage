import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    mkdtemp,
    readFile,
    rm,
    writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseCustomerBundleArguments } from '../../scripts/create-windows-customer-bundle.js';
import { createWindowsCustomerBundle } from '../../src/deployment/windows-customer-bundle.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function executableFixture(marker) {
    const data = Buffer.alloc(1024, marker);
    data.write('MZ', 0, 'ascii');
    return data;
}

function sha256(data) {
    return createHash('sha256').update(data).digest('hex').toUpperCase();
}

test('creates a customer bundle with private Node, WinSW and a verified runtime allowlist', async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-customer-bundle-'));
    try {
        const winSwData = executableFixture(1);
        const nodeData = executableFixture(2);
        const winSwPath = path.join(temporaryDirectory, 'WinSW-x64.exe');
        const nodePath = path.join(temporaryDirectory, 'node.exe');
        await writeFile(winSwPath, winSwData);
        await writeFile(nodePath, nodeData);

        const result = await createWindowsCustomerBundle({
            sourceRoot: repositoryRoot,
            outputDirectory: path.join(temporaryDirectory, 'output'),
            releaseId: 'CUSTOMER-TEST-1',
            winswExecutable: winSwPath,
            winswSha256: sha256(winSwData),
            nodeExecutable: nodePath,
            nodeSha256: sha256(nodeData)
        });
        const manifest = JSON.parse(await readFile(
            path.join(result.bundleDirectory, 'manifest.json'),
            'utf8'
        ));
        const manifestPaths = new Set(manifest.files.map(file => file.path));
        const installer = await readFile(
            path.join(result.bundleDirectory, 'install-flashterm-stage.ps1'),
            'utf8'
        );
        const runtimePackage = JSON.parse(await readFile(
            path.join(result.bundleDirectory, 'application', 'package.json'),
            'utf8'
        ));

        assert.equal(manifest.format, 'flashterm-stage-windows-customer-bundle');
        assert.equal(manifest.version, 1);
        assert.equal(manifest.releaseId, 'CUSTOMER-TEST-1');
        assert.equal(manifest.winSwSha256, sha256(winSwData));
        assert.equal(manifest.nodeSha256, sha256(nodeData));
        assert(manifestPaths.has('application/scripts/stage-server.js'));
        assert(manifestPaths.has('application/src/server/stage-api.js'));
        assert(manifestPaths.has('tools/WinSW-x64.exe'));
        assert(manifestPaths.has('tools/node.exe'));
        assert(manifestPaths.has('select-stage-certificate.ps1'));
        assert(manifestPaths.has('setup-stage.ps1'));
        assert(manifestPaths.has('application/scripts/check-filemaker-setup.js'));
        assert(manifestPaths.has('application/deploy/windows/configure-auto-publication.ps1'));
        assert(manifestPaths.has('application/deploy/windows/backup-stage-data.ps1'));
        assert(manifestPaths.has('application/deploy/windows/restore-stage-data.ps1'));
        assert(!manifestPaths.has('application/config.js'));
        assert(![...manifestPaths].some(file => file.split('/').some(part => part.startsWith('.'))));
        assert(![...manifestPaths].some(file => file.startsWith('application/tests/')));
        assert(![...manifestPaths].some(file => file.startsWith('application/docs/')));
        assert(manifestPaths.has('application/scripts/publish-backstage.js'));
        assert(manifestPaths.has('application/manual-de.html'));
        // Resolve imports from the isolated delivered tree, not the source checkout.
        execFileSync(process.execPath, ['--input-type=module', '-e',
            "await import('./scripts/stage-server.js'); await import('./src/deployment/filemaker-setup.js');"], {
            cwd: path.join(result.bundleDirectory, 'application'),
            stdio: 'pipe'
        });
        assert.equal(runtimePackage.type, 'module');
        assert.equal(runtimePackage.scripts, undefined);
        assert.match(installer, /FileMakerSiteUnchanged/);
        assert.match(installer, /BundledPrivateRuntime/);
        assert.match(installer, /trusted-intranet/);
        assert.match(installer, /trustedIntranetConfirmed/);
        assert.match(installer, /OIDC Client Secret/);
        assert.match(installer, /\[switch\]\s+\$Apply/);
        assert.doesNotMatch(installer, /iisreset|New-NetFirewallRule/i);

        await assert.rejects(() => createWindowsCustomerBundle({
            sourceRoot: repositoryRoot,
            outputDirectory: path.join(temporaryDirectory, 'output'),
            releaseId: 'CUSTOMER-TEST-1',
            winswExecutable: winSwPath,
            winswSha256: sha256(winSwData),
            nodeExecutable: nodePath,
            nodeSha256: sha256(nodeData)
        }), /already exists/);
    } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
    }
});

test('rejects an unapproved bundled executable before creating customer files', async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'flashterm-customer-reject-'));
    try {
        const winSwData = executableFixture(3);
        const nodeData = executableFixture(4);
        const winSwPath = path.join(temporaryDirectory, 'WinSW-x64.exe');
        const nodePath = path.join(temporaryDirectory, 'node.exe');
        await writeFile(winSwPath, winSwData);
        await writeFile(nodePath, nodeData);

        await assert.rejects(() => createWindowsCustomerBundle({
            sourceRoot: repositoryRoot,
            outputDirectory: path.join(temporaryDirectory, 'output'),
            releaseId: 'CUSTOMER-TEST-2',
            winswExecutable: winSwPath,
            winswSha256: sha256(winSwData),
            nodeExecutable: nodePath,
            nodeSha256: '0'.repeat(64)
        }), /Node\.js executable checksum/);
    } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
    }
});

test('parses all required customer bundle command options', () => {
    assert.deepEqual(parseCustomerBundleArguments([
        '--source', 'C:\\source',
        '--output', 'C:\\output',
        '--release', 'RELEASE-1',
        '--winsw', 'C:\\tools\\WinSW-x64.exe',
        '--winsw-sha256', 'A'.repeat(64),
        '--node', 'C:\\tools\\node.exe',
        '--node-sha256', 'B'.repeat(64)
    ]), {
        sourceRoot: 'C:\\source',
        outputDirectory: 'C:\\output',
        releaseId: 'RELEASE-1',
        winswExecutable: 'C:\\tools\\WinSW-x64.exe',
        winswSha256: 'A'.repeat(64),
        nodeExecutable: 'C:\\tools\\node.exe',
        nodeSha256: 'B'.repeat(64)
    });
});
