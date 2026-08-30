import { randomUUID, timingSafeEqual } from 'node:crypto';

import { createSessionManager } from './auth-session.js';

function safeEqual(first, second) {
    const firstBuffer = Buffer.from(first ?? '');
    const secondBuffer = Buffer.from(second ?? '');
    return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function safeReturnTo(value) {
    return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
        ? value
        : '/';
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function redirect(response, location, cookies = []) {
    response.writeHead(303, {
        'Cache-Control': 'no-store',
        Location: location,
        ...(cookies.length ? { 'Set-Cookie': cookies } : {})
    });
    response.end();
}

function sendHtml(response, statusCode, body, cookies = []) {
    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        ...(cookies.length ? { 'Set-Cookie': cookies } : {}),
        'Content-Length': Buffer.byteLength(body)
    });
    response.end(body);
}

async function readForm(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > 16 * 1024) throw new Error('Login request is too large.');
        chunks.push(chunk);
    }
    return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

function loginPage(displayName, state) {
    return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anmelden – flashterm stage</title><style>
:root{color-scheme:light dark}body{font:16px system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f2ec;color:#344054}.card{width:min(420px,calc(100% - 40px));box-sizing:border-box;padding:32px;border:1px solid #d0c7ba;border-radius:16px;background:#fff;box-shadow:0 20px 50px #34405422}h1{font-size:1.5rem;margin:0 0 12px}p{line-height:1.5}button{width:100%;margin-top:14px;padding:12px;border:0;border-radius:10px;background:#ad6500;color:#fff;font:inherit;font-weight:650;cursor:pointer}.note{font-size:.85rem;color:#667085}@media(prefers-color-scheme:dark){body{background:#1d2026;color:#f2f4f7}.card{background:#24272e;border-color:#475467}.note{color:#b9c0cc}}
</style></head><body><main class="card"><h1>Bei flashterm stage anmelden</h1>
<p>Lokaler Entwicklungszugang für <strong>${escapeHtml(displayName)}</strong>.</p>
<form method="post" action="/auth/dev-login"><input type="hidden" name="state" value="${escapeHtml(state)}"><button type="submit">Anmelden</button></form>
<p class="note">Dieser Testzugang ist nur für die lokale Entwicklung vorgesehen.</p></main></body></html>`;
}

export function createStageAuth({
    mode = 'disabled',
    sessionManager = createSessionManager(),
    developmentIdentity = null,
    oidcClient = null,
    publicOrigin = ''
} = {}) {
    if (!['disabled', 'development', 'oidc'].includes(mode)) {
        throw new Error('Unknown Stage authentication mode.');
    }
    if (mode === 'development' && !developmentIdentity) {
        throw new Error('Development identity is required.');
    }
    if (mode === 'oidc' && !oidcClient) {
        throw new Error('OpenID Connect client is required.');
    }

    return {
        required: mode !== 'disabled',
        getIdentity(request) {
            return mode === 'disabled'
                ? { subject: 'anonymous', displayName: 'Anonymous', groups: [], termbaseIds: ['*'] }
                : sessionManager.getSession(request);
        },

        async handle(request, response, requestUrl) {
            if (requestUrl.pathname === '/auth/login' && request.method === 'GET') {
                const returnTo = safeReturnTo(requestUrl.searchParams.get('returnTo'));
                if (sessionManager.getSession(request)) {
                    redirect(response, returnTo);
                    return true;
                }
                if (mode === 'disabled') {
                    redirect(response, returnTo);
                    return true;
                }
                if (mode === 'development') {
                    const state = randomUUID();
                    const login = sessionManager.createLogin({ type: 'development', state, returnTo });
                    sendHtml(response, 200, loginPage(developmentIdentity.displayName, state), [login.cookie]);
                    return true;
                }
                const authorization = await oidcClient.createAuthorization(returnTo);
                const login = sessionManager.createLogin({ type: 'oidc', ...authorization.transaction });
                redirect(response, authorization.url, [login.cookie]);
                return true;
            }

            if (requestUrl.pathname === '/auth/dev-login' && request.method === 'POST' && mode === 'development') {
                const transaction = sessionManager.consumeLogin(request);
                const form = await readForm(request);
                if (!transaction || transaction.type !== 'development' || !safeEqual(form.get('state'), transaction.state)) {
                    sendHtml(response, 400, '<h1>Anmeldung abgelaufen</h1>');
                    return true;
                }
                redirect(response, transaction.returnTo, [
                    sessionManager.createSession(developmentIdentity),
                    sessionManager.clearLoginCookie()
                ]);
                return true;
            }

            if (requestUrl.pathname === '/auth/callback' && request.method === 'GET' && mode === 'oidc') {
                const transaction = sessionManager.consumeLogin(request);
                const state = requestUrl.searchParams.get('state');
                const code = requestUrl.searchParams.get('code');
                if (!transaction || transaction.type !== 'oidc' || !code || !safeEqual(state, transaction.state)) {
                    sendHtml(response, 400, '<h1>Anmeldung konnte nicht bestätigt werden</h1>');
                    return true;
                }
                const identity = await oidcClient.exchangeCode(code, transaction);
                redirect(response, transaction.returnTo, [
                    sessionManager.createSession(identity),
                    sessionManager.clearLoginCookie()
                ]);
                return true;
            }

            if (requestUrl.pathname === '/auth/logout' && request.method === 'POST') {
                const requestOrigin = request.headers.origin;
                const expectedOrigin = publicOrigin || `http://${request.headers.host}`;
                if (requestOrigin && requestOrigin !== expectedOrigin) {
                    sendHtml(response, 403, '<h1>Abmeldung wurde abgewiesen</h1>');
                    return true;
                }
                redirect(response, '/auth/login', [sessionManager.clearSession(request)]);
                return true;
            }

            return false;
        }
    };
}
