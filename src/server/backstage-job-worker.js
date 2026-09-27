import path from 'node:path';
import { publishBackstage } from '../../scripts/publish-backstage.js';
import { createPublicationJobs } from './publication-jobs.js';

export async function createBackstageJobWorker({ environment, dataDirectory, store, tenantId, jobDirectory }) {
    if (!environment.FLASHTERM_EXPORT_TRIGGER_TOKEN) return null;
    for (const key of ['FLASHTERM_FILEMAKER_SERVER', 'FLASHTERM_FILEMAKER_DATABASE',
        'FLASHTERM_FILEMAKER_USERNAME', 'FLASHTERM_FILEMAKER_PASSWORD',
        'FLASHTERM_PUBLISH_TERMBASE', 'FLASHTERM_PUBLISH_TERMBASE_NAME']) {
        if (!environment[key]) throw new Error(`Missing environment variable: ${key}`);
    }
    const termbaseId = environment.FLASHTERM_PUBLISH_TERMBASE;
    const allowed = (environment.FLASHTERM_PUBLISH_TERMBASES ?? '*').split(',').map(value => value.trim());
    if (!allowed.includes('*') && !allowed.includes(termbaseId)) throw new Error('Automatic publication target is not allowed.');
    const publicationClient = {
        publish: publication => store.savePublication(publication),
        uploadAsset: (target, publication, asset) => store.savePublicationAsset(tenantId, target, publication, asset),
        activate: (target, publication) => store.activatePublication(tenantId, target, publication)
    };
    return createPublicationJobs({
        directory: jobDirectory ?? path.join(dataDirectory, 'export-jobs'),
        sourceDatabase: environment.FLASHTERM_FILEMAKER_DATABASE,
        termbaseId,
        activePublicationId: async () => {
            try { return (await store.getActivePublication(tenantId, termbaseId)).publication.id; }
            catch (error) { if (error?.code === 'NOT_FOUND') return ''; throw error; }
        },
        run: job => publishBackstage({
            environment: { ...environment, FLASHTERM_STAGE_TENANT: tenantId,
                FLASHTERM_PUBLISH_ID: job.publicationId, FLASHTERM_PUBLISH_REVISION: job.id,
                FLASHTERM_PUBLISH_AT: job.createdAt },
            args: ['--activate'], publicationClient,
            fileMakerRequest: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(60_000) })
        })
    });
}
