import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createPublicationJobs } from '../../src/server/publication-jobs.js';
import { createStageServer } from '../../scripts/stage-server.js';

async function setup(t, overrides = {}) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'stage-jobs-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const config = { directory, sourceDatabase: 'source', termbaseId: 'target',
        run: async () => ({ activated: true }), activePublicationId: async () => 'old', ...overrides };
    const jobs = await createPublicationJobs(config);
    const reserve = (id = randomUUID()) => jobs.reserve({ id, sourceDatabase: 'source', termbaseId: 'target' });
    return { config, jobs, reserve };
}

test('concurrent reservations serialize; duplicate triggers run once and retain receipts', async t => {
    let count = 0;
    let release;
    const done = new Promise(resolve => { release = resolve; });
    const { jobs, reserve, config } = await setup(t, { run: async () => { count++; await done; return { activated: true }; } });
    const results = await Promise.allSettled([reserve(), reserve()]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const job = results.find(r => r.status === 'fulfilled').value;
    assert.equal((await reserve(job.id)).id, job.id);
    await Promise.all([jobs.start(job.id), jobs.start(job.id)]);
    assert.equal(count, 1);
    await assert.rejects(jobs.cancel(job.id), { code: 'CONFLICT' });
    release(); await jobs.wait();
    assert.equal((await jobs.get(job.id)).state, 'succeeded');
    const restarted = await createPublicationJobs(config);
    assert.equal((await restarted.start(job.id)).state, 'succeeded');
    assert.equal(count, 1);
});

test('failed publication keeps previous active version and sanitizes errors', async t => {
    const { jobs, reserve, config } = await setup(t, { run: async () => { throw Error('password=SECRET'); } });
    const job = await reserve(); await jobs.start(job.id); await jobs.wait();
    assert.equal((await jobs.get(job.id)).state, 'failed');
    assert.ok(!(await readFile(path.join(config.directory, `${job.id}.json`), 'utf8')).includes('SECRET'));
    assert.equal((await reserve()).state, 'preparing');
});

test('restart reconciles activation and blocks an interrupted unpublished run', async t => {
    const { reserve, config } = await setup(t);
    const job = await reserve();
    await writeFile(path.join(config.directory, `${job.id}.json`), JSON.stringify({ ...job, state: 'running' }));
    let restarted = await createPublicationJobs(config);
    assert.equal((await restarted.get(job.id)).state, 'interrupted');
    await assert.rejects(restarted.reserve({ ...job, id: randomUUID() }), { code: 'CONFLICT' });
    await restarted.cancel(job.id);
    await writeFile(path.join(config.directory, `${job.id}.json`), JSON.stringify({ ...job, state: 'running' }));
    restarted = await createPublicationJobs({ ...config, activePublicationId: async () => job.publicationId });
    assert.equal((await restarted.get(job.id)).state, 'succeeded');
});

test('unfinished export remains reserved after restart and needs explicit cancellation', async t => {
    const { reserve, config } = await setup(t);
    const job = await reserve();
    const jobs = await createPublicationJobs(config);
    await assert.rejects(jobs.reserve({ ...job, id: randomUUID() }), { code: 'CONFLICT' });
    await jobs.cancel(job.id);
    assert.equal((await jobs.start(job.id)).state, 'cancelled');
    assert.equal((await jobs.reserve({ ...job, id: randomUUID() })).state, 'preparing');
});

test('source and target are server-owned and identifiers cannot escape job directory', async t => {
    const { jobs } = await setup(t);
    for (const body of [
        { id: '../escape', sourceDatabase: 'source', termbaseId: 'target' },
        { id: randomUUID(), sourceDatabase: 'elsewhere', termbaseId: 'target' },
        { id: randomUUID(), sourceDatabase: 'source', termbaseId: 'another' }
    ]) await assert.rejects(jobs.reserve(body), { code: 'INVALID_ID' });
});

test('trigger credential is isolated from admin and browser authentication', async t => {
    const { jobs } = await setup(t);
    const server = createStageServer({ store: {}, tenantId: 'tenant', publishToken: 'admin-test',
        exportTriggerToken: 'trigger-test', publicationJobs: jobs });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}`;
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer trigger-test' };
    const body = JSON.stringify({ id: randomUUID(), sourceDatabase: 'source', termbaseId: 'target' });
    for (const token of ['', 'admin-test']) {
        const response = await fetch(`${url}/api/export-jobs`, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${token}` }, body });
        assert.equal(response.status, 401);
    }
    assert.equal((await fetch(`${url}/api/admin/publications`, { method: 'POST', headers, body })).status, 401);
    const response = await fetch(`${url}/api/export-jobs`, { method: 'POST', headers, body });
    assert.equal(response.status, 200);
    const { job } = await response.json();
    assert.equal((await fetch(`${url}/api/export-jobs/${job.id}/ready`, { method: 'POST', headers })).status, 202);
    await jobs.wait();
    assert.equal((await (await fetch(`${url}/api/export-jobs/${job.id}`, { headers })).json()).job.state, 'succeeded');
    assert.equal((await fetch(`${url}/api/export-jobs`, { method: 'POST', headers, body: 'x'.repeat(4097) })).status, 413);
});

test('separate trigger keys cannot read or start another source job', async t => {
    const first = await setup(t);
    const second = await setup(t);
    const server = createStageServer({ store: {}, tenantId: 'tenant',
        exportTriggerToken: 'first-key', publicationJobs: first.jobs,
        publicationBindings: [{ token: 'second-key', jobs: second.jobs }] });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/export-jobs`;
    const id = randomUUID();
    const headers = token => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
    const response = await fetch(url, { method: 'POST', headers: headers('second-key'),
        body: JSON.stringify({ id, sourceDatabase: 'source', termbaseId: 'target' }) });
    assert.equal(response.status, 200);
    assert.equal((await fetch(`${url}/${id}`, { headers: headers('first-key') })).status, 404);
    assert.equal((await fetch(`${url}/${id}/ready`, { method: 'POST', headers: headers('first-key') })).status, 404);
    assert.equal((await fetch(`${url}/${id}`, { headers: headers('second-key') })).status, 200);
    assert.equal((await fetch(`${url}/${id}`, { headers: headers('unknown') })).status, 401);
});
