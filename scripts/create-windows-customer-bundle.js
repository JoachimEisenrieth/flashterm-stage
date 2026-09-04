import { realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createWindowsCustomerBundle } from '../src/deployment/windows-customer-bundle.js';

const OPTION_NAMES = new Map([
    ['--source', 'sourceRoot'],
    ['--output', 'outputDirectory'],
    ['--release', 'releaseId'],
    ['--winsw', 'winswExecutable'],
    ['--winsw-sha256', 'winswSha256'],
    ['--node', 'nodeExecutable'],
    ['--node-sha256', 'nodeSha256']
]);

function usage() {
    return `Usage:
  npm run windows:customer-bundle -- --source <repository> --output <directory> \\
    --release <release-id> --winsw <WinSW-x64.exe> --winsw-sha256 <sha256> \\
    --node <node.exe> --node-sha256 <sha256>`;
}

export function parseCustomerBundleArguments(argumentsList) {
    if (argumentsList.includes('--help')) return { help: true };
    const options = {};
    for (let index = 0; index < argumentsList.length; index += 2) {
        const optionName = argumentsList[index];
        const value = argumentsList[index + 1];
        const propertyName = OPTION_NAMES.get(optionName);
        if (!propertyName || value === undefined || value.startsWith('--')) {
            throw new Error(`Unknown or incomplete option: ${optionName ?? ''}`);
        }
        if (Object.hasOwn(options, propertyName)) {
            throw new Error(`Option was provided more than once: ${optionName}`);
        }
        options[propertyName] = value;
    }
    for (const required of OPTION_NAMES.values()) {
        if (!Object.hasOwn(options, required)) {
            throw new Error(`Missing required option: ${required}`);
        }
    }
    return options;
}

async function isExecutedFile() {
    if (!process.argv[1]) return false;
    try {
        return await realpath(process.argv[1]) === await realpath(fileURLToPath(import.meta.url));
    } catch {
        return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
    }
}

if (await isExecutedFile()) {
    try {
        const options = parseCustomerBundleArguments(process.argv.slice(2));
        if (options.help) {
            console.log(usage());
        } else {
            const result = await createWindowsCustomerBundle(options);
            console.log(`Customer bundle created: ${result.bundleDirectory}`);
            console.log(`Release: ${result.releaseId}`);
            console.log(`Files: ${result.files}`);
            console.log(`WinSW SHA-256: ${result.winSwSha256}`);
            console.log(`Node.js SHA-256: ${result.nodeSha256}`);
        }
    } catch (error) {
        console.error(error.message);
        console.error(usage());
        process.exitCode = 1;
    }
}
