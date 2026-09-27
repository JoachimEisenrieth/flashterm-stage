import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createBackstageJobWorker } from './backstage-job-worker.js';

// Protected server-side configuration; never expose this file through HTTP.
export async function createAdditionalPublicationBindings({
    environment, dataDirectory, store, tenantId, read = readFile,
    createWorker = createBackstageJobWorker
}) {
    const file = environment.FLASHTERM_PUBLICATION_BINDINGS_FILE;
    if (!file) return [];
    let entries;
    try { entries = JSON.parse(await read(file, 'utf8')); }
    catch { throw new Error('Cannot read publication bindings configuration.'); }
    if (!Array.isArray(entries)) throw new Error('Invalid publication bindings configuration.');
    const tokens = new Set([environment.FLASHTERM_EXPORT_TRIGGER_TOKEN].filter(Boolean));
    const sources = new Set([environment.FLASHTERM_FILEMAKER_DATABASE?.toLowerCase()].filter(Boolean));
    const targets = new Set([environment.FLASHTERM_PUBLISH_TERMBASE?.toLowerCase()].filter(Boolean));
    const ids = new Set();
    const allowed = (environment.FLASHTERM_PUBLISH_TERMBASES ?? '').split(',').map(s => s.trim());
    for (const entry of entries) {
        if (!entry || typeof entry !== 'object' ||
            !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(entry.id ?? '') ||
            !['sourceDatabase', 'termbaseId', 'termbaseName', 'triggerToken'].every(
                key => typeof entry[key] === 'string' && entry[key].trim() !== '') ||
            entry.triggerToken.length < 32 || !allowed.includes(entry.termbaseId) ||
            ids.has(entry.id.toLowerCase()) || tokens.has(entry.triggerToken) ||
            sources.has(entry.sourceDatabase.toLowerCase()) || targets.has(entry.termbaseId.toLowerCase()) ||
            (entry.imageSource !== undefined && !['public', 'container'].includes(entry.imageSource))) {
            throw new Error('Invalid or duplicate publication binding.');
        }
        ids.add(entry.id.toLowerCase()); tokens.add(entry.triggerToken);
        sources.add(entry.sourceDatabase.toLowerCase()); targets.add(entry.termbaseId.toLowerCase());
    }
    const bindings = [];
    for (const entry of entries) {
        const jobs = await createWorker({
            environment: { ...environment,
                FLASHTERM_EXPORT_TRIGGER_TOKEN: entry.triggerToken,
                FLASHTERM_FILEMAKER_DATABASE: entry.sourceDatabase,
                FLASHTERM_PUBLISH_TERMBASE: entry.termbaseId,
                FLASHTERM_PUBLISH_TERMBASE_NAME: entry.termbaseName,
                FLASHTERM_FILEMAKER_IMAGE_SOURCE: entry.imageSource ?? 'container'
            }, dataDirectory, store, tenantId,
            jobDirectory: path.join(dataDirectory, 'export-jobs-bindings', entry.id)
        });
        bindings.push({ token: entry.triggerToken, jobs });
    }
    return bindings;
}
