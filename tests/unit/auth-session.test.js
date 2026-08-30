import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccessTermbase, createSessionManager } from '../../src/server/auth-session.js';

function requestWithCookie(cookie = '') {
    return { headers: { cookie } };
}

test('creates opaque HttpOnly sessions and expires them server-side', () => {
    let currentTime = 1_000;
    const sessions = createSessionManager({ now: () => currentTime, sessionTtl: 5_000 });
    const identity = { displayName: 'Test User', termbaseIds: ['ONE'] };
    const setCookie = sessions.createSession(identity);
    const cookie = setCookie.split(';', 1)[0];

    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.equal(setCookie.includes('Test User'), false);
    assert.deepEqual(sessions.getSession(requestWithCookie(cookie)), identity);

    currentTime = 6_001;
    assert.equal(sessions.getSession(requestWithCookie(cookie)), null);
});

test('checks exact termbase grants and the explicit wildcard', () => {
    assert.equal(canAccessTermbase({ termbaseIds: ['ONE'] }, 'ONE'), true);
    assert.equal(canAccessTermbase({ termbaseIds: ['ONE'] }, 'TWO'), false);
    assert.equal(canAccessTermbase({ termbaseIds: ['*'] }, 'TWO'), true);
    assert.equal(canAccessTermbase(null, 'ONE'), false);
});
