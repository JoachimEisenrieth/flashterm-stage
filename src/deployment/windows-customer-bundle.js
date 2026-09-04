import { createHash } from 'node:crypto';
import {
    access,
    cp,
    mkdir,
    readFile,
    readdir,
    stat,
    writeFile
} from 'node:fs/promises';
import path from 'node:path';

const RELEASE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const SHA256_PATTERN = /^[A-Fa-f0-9]{64}$/;
const RUNTIME_PATHS = [
    'index.html',
    'flashterm.html',
    'flashterm.css',
    'flashterm.js',
    'filemaker-api.js',
    'flashterm-dark.ico',
    'flashterm-light.ico',
    'json',
    'svg',
    'scripts/stage-server.js',
    'scripts/create-windows-instance-files.js',
    'src/app',
    'src/deployment/windows-instance-files.js',
    'src/domain',
    'src/infrastructure',
    'src/repositories',
    'src/server',
    'deploy/windows/start-stage.ps1',
    'deploy/windows/test-stage-health.ps1'
];
const INSTALLER_FILES = [
    'install-flashterm-stage.ps1',
    'customer-settings.example.json',
    'README.txt'
];

function requireString(value, name) {
    if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
        throw new Error(`${name} must be a non-empty single-line string.`);
    }
    return value.trim();
}

async function exists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function sha256(filePath) {
    const data = await readFile(filePath);
    return createHash('sha256').update(data).digest('hex').toUpperCase();
}

async function listFiles(directory, relativeDirectory = '') {
    const entries = await readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const relativePath = path.posix.join(relativeDirectory.replaceAll('\\', '/'), entry.name);
        if (entry.isDirectory()) {
            files.push(...await listFiles(directory, relativePath));
        } else if (entry.isFile()) {
            files.push(relativePath);
        }
    }
    return files;
}

async function copyRequired(sourceRoot, relativePath, targetRoot) {
    const sourcePath = path.join(sourceRoot, ...relativePath.split('/'));
    if (!await exists(sourcePath)) {
        throw new Error(`Required bundle source is missing: ${relativePath}`);
    }
    const targetPath = path.join(targetRoot, ...relativePath.split('/'));
    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, {
        recursive: true,
        errorOnExist: true,
        force: false,
        filter: candidatePath => !path.basename(candidatePath).startsWith('.')
    });
}

export async function createWindowsCustomerBundle({
    sourceRoot,
    outputDirectory,
    releaseId,
    winswExecutable,
    winswSha256,
    nodeExecutable,
    nodeSha256
} = {}) {
    const normalizedSourceRoot = path.resolve(requireString(sourceRoot, 'sourceRoot'));
    const normalizedOutputDirectory = path.resolve(requireString(outputDirectory, 'outputDirectory'));
    const normalizedReleaseId = requireString(releaseId, 'releaseId');
    const normalizedWinSwPath = path.resolve(requireString(winswExecutable, 'winswExecutable'));
    const expectedWinSwHash = requireString(winswSha256, 'winswSha256').toUpperCase();
    const normalizedNodePath = path.resolve(requireString(nodeExecutable, 'nodeExecutable'));
    const expectedNodeHash = requireString(nodeSha256, 'nodeSha256').toUpperCase();
    if (!RELEASE_ID_PATTERN.test(normalizedReleaseId)) {
        throw new Error('releaseId may contain only letters, digits, dots, underscores and hyphens.');
    }
    if (!SHA256_PATTERN.test(expectedWinSwHash)) {
        throw new Error('winswSha256 must be a complete SHA-256 checksum.');
    }
    if (!SHA256_PATTERN.test(expectedNodeHash)) {
        throw new Error('nodeSha256 must be a complete SHA-256 checksum.');
    }
    for (const [filePath, label] of [
        [normalizedWinSwPath, 'WinSW'],
        [normalizedNodePath, 'Node.js']
    ]) {
        if (!await exists(filePath)) {
            throw new Error(`The approved ${label} executable was not found.`);
        }
        const fileInfo = await stat(filePath);
        const header = await readFile(filePath).then(data => data.subarray(0, 2).toString('ascii'));
        if (!fileInfo.isFile() || fileInfo.size < 512 || header !== 'MZ') {
            throw new Error(`The ${label} input is not a plausible Windows executable.`);
        }
    }
    const actualWinSwHash = await sha256(normalizedWinSwPath);
    if (actualWinSwHash !== expectedWinSwHash) {
        throw new Error('The WinSW executable checksum does not match the approved checksum.');
    }
    const actualNodeHash = await sha256(normalizedNodePath);
    if (actualNodeHash !== expectedNodeHash) {
        throw new Error('The Node.js executable checksum does not match the approved checksum.');
    }

    const bundleName = `flashterm-stage-intranet-${normalizedReleaseId}`;
    const bundleDirectory = path.join(normalizedOutputDirectory, bundleName);
    if (await exists(bundleDirectory)) {
        throw new Error(`The customer bundle already exists: ${bundleDirectory}`);
    }
    await mkdir(bundleDirectory, { recursive: true });

    const applicationDirectory = path.join(bundleDirectory, 'application');
    for (const relativePath of RUNTIME_PATHS) {
        await copyRequired(normalizedSourceRoot, relativePath, applicationDirectory);
    }
    const sourcePackage = JSON.parse(await readFile(
        path.join(normalizedSourceRoot, 'package.json'),
        'utf8'
    ));
    await writeFile(
        path.join(applicationDirectory, 'package.json'),
        `${JSON.stringify({
            name: sourcePackage.name,
            private: true,
            type: 'module',
            engines: sourcePackage.engines
        }, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' }
    );
    const installerSource = path.join(normalizedSourceRoot, 'deploy', 'windows', 'installer');
    for (const fileName of INSTALLER_FILES) {
        await copyRequired(installerSource, fileName, bundleDirectory);
    }
    const toolsDirectory = path.join(bundleDirectory, 'tools');
    await mkdir(toolsDirectory, { recursive: true });
    await cp(normalizedWinSwPath, path.join(toolsDirectory, 'WinSW-x64.exe'), {
        errorOnExist: true,
        force: false
    });
    await cp(normalizedNodePath, path.join(toolsDirectory, 'node.exe'), {
        errorOnExist: true,
        force: false
    });

    const relativeFiles = await listFiles(bundleDirectory);
    const files = [];
    for (const relativePath of relativeFiles) {
        const filePath = path.join(bundleDirectory, ...relativePath.split('/'));
        const fileInfo = await stat(filePath);
        files.push({
            path: relativePath,
            bytes: fileInfo.size,
            sha256: await sha256(filePath)
        });
    }
    const manifest = {
        format: 'flashterm-stage-windows-customer-bundle',
        version: 1,
        releaseId: normalizedReleaseId,
        createdAt: new Date().toISOString(),
        winSwSha256: actualWinSwHash,
        nodeSha256: actualNodeHash,
        files
    };
    await writeFile(
        path.join(bundleDirectory, 'manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' }
    );

    return {
        bundleDirectory,
        bundleName,
        releaseId: normalizedReleaseId,
        files: files.length,
        winSwSha256: actualWinSwHash,
        nodeSha256: actualNodeHash
    };
}
