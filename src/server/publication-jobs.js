import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PublicationStoreError } from './file-publication-store.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const blocking = new Set(['preparing', 'running', 'interrupted']);
const conflict = () => new PublicationStoreError('CONFLICT', 'Ein Export oder eine Veröffentlichung ist noch offen.');

// One configured FileMaker source/target per worker. Every exporter must reserve
// before changing API tables. Reservations deliberately do not expire: a paused
// FileMaker export must never lose its lock while it can still write.
export async function createPublicationJobs({ directory, sourceDatabase, termbaseId, run, activePublicationId }) {
    await mkdir(directory, { recursive: true });
    const jobs = new Map();
    let chain = Promise.resolve();
    let worker;
    const serial = task => {
        const result = chain.then(task);
        chain = result.catch(() => {});
        return result;
    };
    function id(value) {
        if (typeof value !== 'string' || !UUID.test(value)) {
            throw new PublicationStoreError('INVALID_ID', 'Eine gültige Auftragskennung ist erforderlich.');
        }
        return value.toLowerCase();
    }
    function get(value) {
        const job = jobs.get(id(value));
        if (!job) throw new PublicationStoreError('NOT_FOUND', 'Auftrag nicht gefunden.');
        return structuredClone(job);
    }
    async function save(job) {
        const updated = { ...job, updatedAt: new Date().toISOString() };
        const destination = path.join(directory, `${job.id}.json`);
        const temporary = `${destination}.${randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify(updated), { mode: 0o600 });
        await rename(temporary, destination);
        jobs.set(job.id, updated);
        return structuredClone(updated);
    }
    for (const name of await readdir(directory)) {
        if (!name.endsWith('.json')) continue;
        const job = JSON.parse(await readFile(path.join(directory, name), 'utf8'));
        if (id(job.id) + '.json' !== name || job.termbaseId !== termbaseId
            || job.sourceDatabase !== sourceDatabase) throw new Error('Publication job configuration mismatch.');
        jobs.set(job.id, job);
        if (job.state === 'running') {
            // A crash may happen after activation but before the job receipt.
            const activated = await activePublicationId() === job.publicationId;
            await save({ ...job, state: activated ? 'succeeded' : 'interrupted',
                message: activated ? 'Veröffentlicht.' : 'Lauf unterbrochen. Vor einem neuen Export prüfen und freigeben.' });
        }
    }
    async function execute(job) {
        try {
            const result = await run(structuredClone(job));
            await serial(() => save({ ...get(job.id), state: 'succeeded', result, message: 'Veröffentlicht.' }));
        } catch {
            // Never store raw errors: they can contain credentials or source data.
            let activated;
            try { activated = await activePublicationId() === job.publicationId; } catch { activated = null; }
            await serial(() => save({ ...get(job.id),
                state: activated === true ? 'succeeded' : activated === false ? 'failed' : 'interrupted',
                message: activated === true ? 'Veröffentlicht.' : activated === false
                    ? 'Veröffentlichung fehlgeschlagen. Die vorherige Veröffentlichung bleibt aktiv.'
                    : 'Veröffentlichungsstatus unklar. Vor einem neuen Export prüfen.' }));
        }
    }
    return {
        reserve: body => serial(async () => {
            const jobId = id(body?.id);
            if (body?.sourceDatabase !== sourceDatabase || body?.termbaseId !== termbaseId) {
                throw new PublicationStoreError('INVALID_ID', 'Quelle oder Ziel passt nicht zur Serverkonfiguration.');
            }
            if (jobs.has(jobId)) return get(jobId);
            if ([...jobs.values()].some(job => blocking.has(job.state))) throw conflict();
            const now = new Date().toISOString();
            return save({ id: jobId, sourceDatabase, termbaseId, createdAt: now,
                publicationId: `BACKSTAGE-${jobId}`, state: 'preparing', message: 'Für FileMaker-Export reserviert.' });
        }),
        get: value => serial(() => get(value)),
        start: value => serial(async () => {
            const job = get(value);
            if (job.state !== 'preparing') return job;
            const running = await save({ ...job, state: 'running', message: 'Veröffentlichung läuft.' });
            worker = execute(running).catch(() => {
                // A receipt write failure leaves the durable running lock in place.
                // Restart reconciliation determines whether activation completed.
            });
            return running;
        }),
        cancel: value => serial(() => {
            const job = get(value);
            if (job.state === 'running') throw conflict();
            if (!['preparing', 'interrupted'].includes(job.state)) return job;
            return save({ ...job, state: 'cancelled', message: 'Auftrag freigegeben. Neuer Export möglich.' });
        }),
        wait: async () => { await chain; await worker; await chain; }
    };
}
