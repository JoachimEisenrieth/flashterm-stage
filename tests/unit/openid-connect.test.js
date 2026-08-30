import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';

import { createOpenIdConnectClient } from '../../src/server/openid-connect.js';

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

function encode(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

test('uses discovery, PKCE S256 and a validated ID token to derive termbase grants', async () => {
    const issuer = 'https://identity.example.test/';
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    jwk.kid = 'TEST-KEY';
    const calls = [];
    let transaction;
    const client = createOpenIdConnectClient({
        issuer,
        clientId: 'TEST-CLIENT',
        clientSecret: 'TEST-SECRET',
        redirectUri: 'https://stage.example.test/auth/callback',
        groupAccess: { editors: ['ONE'], readers: ['TWO'] },
        now: () => 1_800_000_000_000,
        async request(url, options = {}) {
            calls.push({ url, options });
            if (url.endsWith('/.well-known/openid-configuration')) {
                return jsonResponse({
                    issuer,
                    authorization_endpoint: `${issuer}authorize`,
                    token_endpoint: `${issuer}token`,
                    jwks_uri: `${issuer}keys`,
                    code_challenge_methods_supported: ['S256']
                });
            }
            if (url.endsWith('/keys')) return jsonResponse({ keys: [jwk] });
            const header = encode({ alg: 'RS256', kid: 'TEST-KEY' });
            const claims = encode({
                iss: issuer,
                aud: 'TEST-CLIENT',
                exp: 1_800_000_300,
                iat: 1_800_000_000,
                nonce: transaction.nonce,
                sub: 'TEST-SUBJECT',
                name: 'Test Person',
                groups: ['editors', 'readers', 'unmapped']
            });
            const signature = sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), privateKey)
                .toString('base64url');
            return jsonResponse({ id_token: `${header}.${claims}.${signature}` });
        }
    });

    const authorization = await client.createAuthorization('/requested');
    transaction = authorization.transaction;
    const authorizationUrl = new URL(authorization.url);
    assert.equal(authorizationUrl.searchParams.get('response_type'), 'code');
    assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(authorizationUrl.searchParams.get('nonce'), transaction.nonce);
    assert.equal(calls[0].url, 'https://identity.example.test/.well-known/openid-configuration');

    assert.deepEqual(await client.exchangeCode('TEST-CODE', transaction), {
        subject: 'TEST-SUBJECT',
        displayName: 'Test Person',
        groups: ['editors', 'readers', 'unmapped'],
        termbaseIds: ['ONE', 'TWO']
    });
    const tokenBody = calls.find(call => call.url.endsWith('/token')).options.body;
    assert.equal(tokenBody.get('code_verifier'), transaction.codeVerifier);
    assert.equal(tokenBody.get('client_secret'), null);
    assert.match(calls.find(call => call.url.endsWith('/token')).options.headers.Authorization, /^Basic /);
});

test('rejects non-HTTPS OpenID Connect configuration', () => {
    assert.throws(() => createOpenIdConnectClient({
        issuer: 'http://identity.example.test',
        clientId: 'TEST',
        redirectUri: 'https://stage.example.test/auth/callback'
    }), /HTTPS/);
});
