import assert from 'node:assert/strict';
import test from 'node:test';

import {
    BootstrapState,
    createInitializationGuard,
    getBootstrapPresentation
} from '../../src/app/bootstrap-state.js';

test('keeps data controls disabled while the application starts', () => {
    const presentation = getBootstrapPresentation(BootstrapState.STARTING, 'de-DE');

    assert.equal(presentation.showLoading, true);
    assert.equal(presentation.showStatus, false);
    assert.equal(presentation.showRetry, false);
    assert.equal(presentation.enableDataControls, false);
    assert.equal(presentation.role, 'status');
});

test('enables all data controls when the application is ready', () => {
    const presentation = getBootstrapPresentation(BootstrapState.READY, 'en-GB');

    assert.equal(presentation.showLoading, false);
    assert.equal(presentation.showStatus, false);
    assert.equal(presentation.showRetry, false);
    assert.equal(presentation.enableDataControls, true);
});

test('offers a retry while keeping partially loaded data usable', () => {
    const presentation = getBootstrapPresentation(BootstrapState.DEGRADED, 'de-DE');

    assert.match(presentation.message, /eingeschränkt verfügbar/);
    assert.equal(presentation.showStatus, true);
    assert.equal(presentation.showRetry, true);
    assert.equal(presentation.enableDataControls, true);
    assert.equal(presentation.role, 'status');
    assert.equal(presentation.ariaLive, 'polite');
});

test('announces a failed start and keeps data controls disabled', () => {
    const presentation = getBootstrapPresentation(BootstrapState.FAILED, 'en-GB');

    assert.match(presentation.message, /could not be started/);
    assert.equal(presentation.showStatus, true);
    assert.equal(presentation.showRetry, true);
    assert.equal(presentation.enableDataControls, false);
    assert.equal(presentation.role, 'alert');
    assert.equal(presentation.ariaLive, 'assertive');
});

test('uses the English copy for unsupported GUI locales', () => {
    const presentation = getBootstrapPresentation(BootstrapState.FAILED, 'fr-FR');

    assert.equal(presentation.retryLabel, 'Try again');
});

test('rejects unknown bootstrap states', () => {
    assert.throws(
        () => getBootstrapPresentation('unknown', 'de-DE'),
        /Unknown bootstrap state/
    );
});

test('runs only one initialization task at a time', async () => {
    const guard = createInitializationGuard();
    let releaseTask;
    let calls = 0;
    const pendingTask = new Promise(resolve => {
        releaseTask = resolve;
    });

    const firstRun = guard.run(async () => {
        calls += 1;
        await pendingTask;
    });
    const secondRun = guard.run(async () => {
        calls += 1;
    });

    assert.equal(guard.isRunning, true);
    assert.equal(await secondRun, false);
    assert.equal(calls, 1);

    releaseTask();
    assert.equal(await firstRun, true);
    assert.equal(guard.isRunning, false);
});

test('releases the initialization guard after an error', async () => {
    const guard = createInitializationGuard();

    await assert.rejects(
        guard.run(async () => {
            throw new Error('test failure');
        }),
        /test failure/
    );

    assert.equal(guard.isRunning, false);
    assert.equal(await guard.run(async () => {}), true);
});

test('rejects invalid initialization tasks', async () => {
    const guard = createInitializationGuard();

    await assert.rejects(
        guard.run(null),
        /Initialization task must be a function/
    );
    assert.equal(guard.isRunning, false);
});
