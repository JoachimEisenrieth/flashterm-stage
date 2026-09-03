import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';

function base64urlJson(value) {
    try {
        return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    } catch {
        throw new Error('OpenID Connect token is malformed.');
    }
}

function assertHttpsUrl(value, label) {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
        throw new Error(`${label} must use HTTPS.`);
    }
    return url;
}

function validateIdToken(idToken, { issuer, clientId, nonce, jwks, now = Date.now }) {
    const parts = idToken?.split('.') ?? [];
    if (parts.length !== 3) throw new Error('OpenID Connect ID token is malformed.');
    const header = base64urlJson(parts[0]);
    const claims = base64urlJson(parts[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
        throw new Error('OpenID Connect signing algorithm is not supported.');
    }
    const jwk = jwks.keys?.find(key => (
        key.kid === header.kid
        && key.kty === 'RSA'
        && (!key.use || key.use === 'sig')
        && (!key.alg || key.alg === 'RS256')
    ));
    if (!jwk) throw new Error('OpenID Connect signing key was not found.');
    const validSignature = verify(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key: jwk, format: 'jwk' }),
        Buffer.from(parts[2], 'base64url')
    );
    if (!validSignature) throw new Error('OpenID Connect ID token signature is invalid.');

    const currentTime = Math.floor(now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== issuer || !audiences.includes(clientId)) {
        throw new Error('OpenID Connect issuer or audience is invalid.');
    }
    if (audiences.length > 1 && claims.azp !== clientId) {
        throw new Error('OpenID Connect authorized party is invalid.');
    }
    if (
        !Number.isFinite(claims.exp)
        || !Number.isFinite(claims.iat)
        || claims.exp <= currentTime
        || claims.iat > currentTime + 60
        || (Number.isFinite(claims.nbf) && claims.nbf > currentTime + 60)
    ) {
        throw new Error('OpenID Connect ID token has expired or is not yet valid.');
    }
    if (claims.nonce !== nonce || typeof claims.sub !== 'string' || !claims.sub) {
        throw new Error('OpenID Connect nonce or subject is invalid.');
    }
    return claims;
}

export function createOpenIdConnectClient({
    issuer,
    clientId,
    clientSecret = '',
    redirectUri,
    groupClaim = 'groups',
    groupAccess = {},
    request = fetch,
    now = Date.now
}) {
    const normalizedIssuer = assertHttpsUrl(issuer, 'OpenID Connect issuer').toString().replace(/\/+$/, '');
    assertHttpsUrl(redirectUri, 'OpenID Connect redirect URI');
    if (!clientId) throw new Error('OpenID Connect client ID is required.');
    let providerPromise;

    async function requestJson(url, options) {
        const response = await request(url, options);
        if (!response.ok) throw new Error(`OpenID Connect request failed with HTTP ${response.status}.`);
        return response.json();
    }

    async function provider() {
        providerPromise ??= requestJson(`${normalizedIssuer}/.well-known/openid-configuration`)
            .then(metadata => {
                const discoveredIssuer = assertHttpsUrl(
                    metadata.issuer,
                    'OpenID Connect discovery issuer'
                ).toString();
                if (discoveredIssuer.replace(/\/+$/, '') !== normalizedIssuer) {
                    throw new Error('OpenID Connect discovery issuer differs.');
                }
                assertHttpsUrl(metadata.authorization_endpoint, 'Authorization endpoint');
                assertHttpsUrl(metadata.token_endpoint, 'Token endpoint');
                assertHttpsUrl(metadata.jwks_uri, 'JWKS endpoint');
                if (!metadata.code_challenge_methods_supported?.includes('S256')) {
                    throw new Error('OpenID Connect provider does not advertise PKCE S256.');
                }
                return { ...metadata, issuer: discoveredIssuer };
            });
        return providerPromise;
    }

    return {
        createLogoutUrl(returnTo) {
            const returnUrl = assertHttpsUrl(returnTo, 'Post-logout redirect URI');
            const url = new URL(`${normalizedIssuer}/v2/logout`);
            url.search = new URLSearchParams({
                client_id: clientId,
                returnTo: returnUrl.toString()
            }).toString();
            return url.toString();
        },

        async createAuthorization(returnTo) {
            const metadata = await provider();
            const state = randomBytes(32).toString('base64url');
            const nonce = randomBytes(32).toString('base64url');
            const codeVerifier = randomBytes(32).toString('base64url');
            const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
            const url = new URL(metadata.authorization_endpoint);
            url.search = new URLSearchParams({
                client_id: clientId,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'openid profile email',
                state,
                nonce,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            }).toString();
            return { url: url.toString(), transaction: { state, nonce, codeVerifier, returnTo } };
        },

        async exchangeCode(code, transaction) {
            const metadata = await provider();
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                code_verifier: transaction.codeVerifier
            });
            const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            if (clientSecret) {
                const methods = metadata.token_endpoint_auth_methods_supported ?? ['client_secret_basic'];
                if (methods.includes('client_secret_basic')) {
                    const credentials = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
                    headers.Authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
                } else if (methods.includes('client_secret_post')) {
                    body.set('client_secret', clientSecret);
                } else {
                    throw new Error('OpenID Connect client authentication method is not supported.');
                }
            }
            const tokens = await requestJson(metadata.token_endpoint, {
                method: 'POST',
                headers,
                body
            });
            const jwks = await requestJson(metadata.jwks_uri);
            const claims = validateIdToken(tokens.id_token, {
                issuer: metadata.issuer,
                clientId,
                nonce: transaction.nonce,
                jwks,
                now
            });
            const groups = Array.isArray(claims[groupClaim]) ? claims[groupClaim] : [];
            const termbaseIds = [...new Set(groups.flatMap(group => groupAccess[group] ?? []))];
            return {
                subject: claims.sub,
                displayName: claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub,
                groups,
                termbaseIds
            };
        }
    };
}
