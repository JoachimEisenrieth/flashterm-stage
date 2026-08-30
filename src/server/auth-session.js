import { randomBytes } from 'node:crypto';

const SESSION_COOKIE = 'flashterm_session';
const LOGIN_COOKIE = 'flashterm_login';
const DEFAULT_SESSION_TTL = 8 * 60 * 60 * 1000;
const LOGIN_TTL = 10 * 60 * 1000;

function randomId() {
    return randomBytes(32).toString('base64url');
}

export function parseCookies(request) {
    return Object.fromEntries((request.headers.cookie ?? '')
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => {
            const separator = part.indexOf('=');
            return separator < 0
                ? [part, '']
                : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
        }));
}

function cookie(name, value, { maxAge, secure }) {
    return [
        `${name}=${encodeURIComponent(value)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        secure ? 'Secure' : '',
        `Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}`
    ].filter(Boolean).join('; ');
}

export function createSessionManager({
    now = Date.now,
    secureCookies = false,
    sessionTtl = DEFAULT_SESSION_TTL
} = {}) {
    const sessions = new Map();
    const logins = new Map();

    function removeExpired() {
        const currentTime = now();
        for (const [id, entry] of sessions) {
            if (entry.expiresAt <= currentTime) sessions.delete(id);
        }
        for (const [id, entry] of logins) {
            if (entry.expiresAt <= currentTime) logins.delete(id);
        }
    }

    return {
        getSession(request) {
            removeExpired();
            const id = parseCookies(request)[SESSION_COOKIE];
            return id ? sessions.get(id)?.identity ?? null : null;
        },

        createSession(identity) {
            removeExpired();
            const id = randomId();
            sessions.set(id, { identity, expiresAt: now() + sessionTtl });
            return cookie(SESSION_COOKIE, id, { maxAge: sessionTtl, secure: secureCookies });
        },

        clearSession(request) {
            const id = parseCookies(request)[SESSION_COOKIE];
            if (id) sessions.delete(id);
            return cookie(SESSION_COOKIE, '', { maxAge: 0, secure: secureCookies });
        },

        createLogin(transaction) {
            removeExpired();
            const id = randomId();
            logins.set(id, { transaction, expiresAt: now() + LOGIN_TTL });
            return {
                cookie: cookie(LOGIN_COOKIE, id, { maxAge: LOGIN_TTL, secure: secureCookies }),
                id
            };
        },

        consumeLogin(request) {
            removeExpired();
            const id = parseCookies(request)[LOGIN_COOKIE];
            const entry = id ? logins.get(id) : null;
            if (id) logins.delete(id);
            return entry?.transaction ?? null;
        },

        clearLoginCookie() {
            return cookie(LOGIN_COOKIE, '', { maxAge: 0, secure: secureCookies });
        }
    };
}

export function canAccessTermbase(identity, termbaseId) {
    return Boolean(identity?.termbaseIds?.includes('*') || identity?.termbaseIds?.includes(termbaseId));
}
