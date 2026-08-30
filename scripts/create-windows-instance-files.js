import { realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { writeWindowsInstanceFiles } from '../src/deployment/windows-instance-files.js';

const OPTION_NAMES = new Map([
    ['--instance', 'instanceId'],
    ['--port', 'port'],
    ['--origin', 'publicOrigin'],
    ['--output', 'outputDirectory'],
    ['--project-root', 'projectRoot'],
    ['--program-data', 'programDataDirectory'],
    ['--data-directory', 'dataDirectory'],
    ['--node', 'nodeExecutable'],
    ['--tenant', 'tenantId'],
    ['--termbase', 'termbaseId'],
    ['--group', 'groupName']
]);

function usage() {
    return `Usage:
  npm run windows:instance -- --instance <id> --port <port> --origin <https-origin> --output <directory>

Optional paths and identifiers:
  --project-root <windows-path>
  --program-data <windows-path>
  --data-directory <windows-path>
  --node <windows-path>
  --tenant <tenant-id>
  --termbase <termbase-id>
  --group <oidc-group-name>`;
}

export function parseWindowsInstanceArguments(argumentsList) {
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
        options[propertyName] = propertyName === 'port' ? Number(value) : value;
    }
    for (const required of ['instanceId', 'port', 'publicOrigin', 'outputDirectory']) {
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
        const options = parseWindowsInstanceArguments(process.argv.slice(2));
        if (options.help) {
            console.log(usage());
        } else {
            const result = await writeWindowsInstanceFiles(options);
            console.log(`Instance files created: ${result.outputDirectory}`);
            console.log(`Service ID: ${result.serviceId}`);
            console.log(`Wrapper base name: ${result.wrapperBaseName}`);
            console.log(`Loopback port: ${result.port}`);
            console.log(`Public origin: ${result.publicOrigin}`);
            console.log(`Protected settings target: ${result.settingsPath}`);
            console.log(`IIS proxy target: ${result.proxyDirectory}`);
        }
    } catch (error) {
        console.error(error.message);
        console.error(usage());
        process.exitCode = 1;
    }
}
