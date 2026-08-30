import { timingSafeEqual } from 'node:crypto';

import { TerminologyPublicationError } from '../domain/terminology-publication.js';
import { PublicationAssetError } from '../domain/publication-assets.js';
import { canAccessTermbase } from './auth-session.js';
import { PublicationStoreError } from './file-publication-store.js';

const DEFAULT_BODY_LIMIT = 25 * 1024 * 1024;
const DEFAULT_ASSET_BODY_LIMIT = 10 * 1024 * 1024;

function sendJson(response, statusCode, value) {
    const body = `${JSON.stringify(value)}\n`;
    response.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    response.end(body);
}

function sendAsset(response, asset) {
    response.writeHead(200, {
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Content-Type': asset.contentType,
        'Content-Length': asset.size,
        ETag: `"${asset.sha256}"`,
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(asset.data);
}

function decodeSegment(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        throw new PublicationStoreError('INVALID_ID', 'URL segment is invalid.');
    }
}

async function readJsonBody(request, bodyLimit) {
    const contentType = request.headers['content-type']?.split(';', 1)[0].trim();
    if (contentType !== 'application/json') {
        throw new PublicationStoreError('UNSUPPORTED_MEDIA_TYPE', 'Expected JSON.');
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > bodyLimit) {
            throw new PublicationStoreError('BODY_TOO_LARGE', 'Request body is too large.');
        }
        chunks.push(chunk);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new PublicationStoreError('INVALID_JSON', 'Request body is not valid JSON.');
    }
}

async function readBinaryBody(request, bodyLimit) {
    const declaredSize = Number(request.headers['content-length']);
    if (Number.isFinite(declaredSize) && declaredSize > bodyLimit) {
        throw new PublicationStoreError('BODY_TOO_LARGE', 'Request body is too large.');
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > bodyLimit) {
            throw new PublicationStoreError('BODY_TOO_LARGE', 'Request body is too large.');
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

function isAuthorized(request, publishToken) {
    if (!publishToken) {
        return false;
    }
    const actual = Buffer.from(request.headers.authorization ?? '', 'utf8');
    const expected = Buffer.from(`Bearer ${publishToken}`, 'utf8');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function localizedLanguages(publication, guiLanguage) {
    return publication.termbase.languages.map(language => ({
        code: language.code,
        name: language.names[guiLanguage]
            ?? language.names[guiLanguage?.split('-')[0]]
            ?? Object.values(language.names)[0]
            ?? language.code,
        isSource: language.isSource
    }));
}

function sendError(response, error) {
    if (error instanceof TerminologyPublicationError) {
        sendJson(response, 422, { error: 'INVALID_PUBLICATION', message: error.message });
        return;
    }
    if (error instanceof PublicationAssetError) {
        const status = error.code === 'UNSUPPORTED_ASSET_TYPE' ? 415 : 400;
        sendJson(response, status, { error: error.code, message: error.message });
        return;
    }
    if (error instanceof PublicationStoreError) {
        const statuses = {
            BODY_TOO_LARGE: 413,
            CONFLICT: 409,
            INVALID_ID: 400,
            INVALID_ASSET: 500,
            INVALID_JSON: 400,
            NOT_FOUND: 404,
            UNSUPPORTED_MEDIA_TYPE: 415
        };
        sendJson(response, statuses[error.code] ?? 400, {
            error: error.code,
            message: error.message
        });
        return;
    }
    sendJson(response, 500, {
        error: 'INTERNAL_ERROR',
        message: 'The request could not be completed.'
    });
}

export function createStageApiHandler({
    store,
    tenantId,
    publishToken = '',
    publishTermbaseIds = ['*'],
    bodyLimit = DEFAULT_BODY_LIMIT,
    assetBodyLimit = DEFAULT_ASSET_BODY_LIMIT,
    auth = null
}) {
    const mayPublishTermbase = termbaseId => (
        publishTermbaseIds.includes('*') || publishTermbaseIds.includes(termbaseId)
    );
    return async function handleStageApi(request, response) {
        try {
            const requestUrl = new URL(request.url, 'http://localhost');
            const segments = requestUrl.pathname.split('/').filter(Boolean).map(decodeSegment);

            if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
                sendJson(response, 200, { status: 'ok' });
                return;
            }

            const identity = auth
                ? auth.getIdentity(request)
                : { displayName: 'Anonymous', termbaseIds: ['*'] };

            if (request.method === 'GET' && requestUrl.pathname === '/api/session') {
                if (!identity) {
                    sendJson(response, 401, { error: 'UNAUTHORIZED', message: 'Authentication is required.' });
                    return;
                }
                sendJson(response, 200, { user: { displayName: identity.displayName } });
                return;
            }

            if (request.method === 'GET' && requestUrl.pathname === '/api/termbases') {
                if (!identity) {
                    sendJson(response, 401, { error: 'UNAUTHORIZED', message: 'Authentication is required.' });
                    return;
                }
                const termbases = await store.listTermbases(tenantId);
                sendJson(response, 200, {
                    termbases: termbases.filter(termbase => canAccessTermbase(identity, termbase.id))
                });
                return;
            }

            if (segments[0] === 'api' && segments[1] === 'termbases' && segments[2]) {
                const termbaseId = segments[2];
                if (!identity) {
                    sendJson(response, 401, { error: 'UNAUTHORIZED', message: 'Authentication is required.' });
                    return;
                }
                if (!canAccessTermbase(identity, termbaseId)) {
                    sendJson(response, 404, { error: 'NOT_FOUND', message: 'Route not found.' });
                    return;
                }
                const active = await store.getActivePublication(tenantId, termbaseId);

                if (request.method === 'GET' && segments.length === 3) {
                    sendJson(response, 200, {
                        id: termbaseId,
                        name: active.termbase.name,
                        sourceLanguage: active.termbase.sourceLanguage,
                        assetBasePath: active.termbase.assetBasePath,
                        publication: active.publication
                    });
                    return;
                }

                if (request.method === 'GET' && segments[3] === 'languages' && segments.length === 4) {
                    const guiLanguage = requestUrl.searchParams.get('guiLanguage') ?? '';
                    sendJson(response, 200, { languages: localizedLanguages(active, guiLanguage) });
                    return;
                }

                if (request.method === 'GET' && segments[3] === 'terms' && segments.length === 4) {
                    const language = requestUrl.searchParams.get('language') ?? '';
                    sendJson(response, 200, { terms: active.termsByLanguage[language] ?? [] });
                    return;
                }

                if (request.method === 'GET' && segments[3] === 'concepts' && segments[4] && segments.length === 5) {
                    const concept = active.concepts.find(item => item.id === segments[4]);
                    if (!concept) {
                        throw new PublicationStoreError('NOT_FOUND', 'Concept not found.');
                    }
                    sendJson(response, 200, { concept });
                    return;
                }

                if (request.method === 'GET' && segments[3] === 'assets' && segments[4] && segments.length === 5) {
                    const asset = await store.getPublicationAsset(
                        tenantId,
                        termbaseId,
                        active.publication.id,
                        segments[4]
                    );
                    sendAsset(response, asset);
                    return;
                }
            }

            const isAdminRoute = segments[0] === 'api' && segments[1] === 'admin';
            if (isAdminRoute) {
                if (!publishToken) {
                    sendJson(response, 503, {
                        error: 'PUBLISHING_DISABLED',
                        message: 'Publishing is not configured.'
                    });
                    return;
                }
                if (!isAuthorized(request, publishToken)) {
                    sendJson(response, 401, {
                        error: 'UNAUTHORIZED',
                        message: 'Authentication is required.'
                    });
                    return;
                }

                if (request.method === 'POST' && segments[2] === 'publications' && segments.length === 3) {
                    const publication = await readJsonBody(request, bodyLimit);
                    if (publication?.publication?.tenantId !== tenantId) {
                        throw new PublicationStoreError('INVALID_ID', 'Publication tenant is invalid.');
                    }
                    if (!mayPublishTermbase(publication?.publication?.termbaseId)) {
                        sendJson(response, 403, {
                            error: 'FORBIDDEN',
                            message: 'Publishing is not permitted for this termbase.'
                        });
                        return;
                    }
                    const result = await store.savePublication(publication);
                    sendJson(response, result.created ? 201 : 200, result);
                    return;
                }

                if (
                    request.method === 'POST'
                    && segments[2] === 'termbases'
                    && segments[3]
                    && segments[4] === 'activations'
                    && segments.length === 5
                ) {
                    if (!mayPublishTermbase(segments[3])) {
                        sendJson(response, 403, {
                            error: 'FORBIDDEN',
                            message: 'Publishing is not permitted for this termbase.'
                        });
                        return;
                    }
                    const body = await readJsonBody(request, bodyLimit);
                    const result = await store.activatePublication(
                        tenantId,
                        segments[3],
                        body?.publicationId
                    );
                    sendJson(response, 201, result);
                    return;
                }

                if (
                    request.method === 'GET'
                    && segments[2] === 'termbases'
                    && segments[3]
                    && segments[4] === 'publications'
                    && segments.length === 5
                ) {
                    if (!mayPublishTermbase(segments[3])) {
                        sendJson(response, 403, {
                            error: 'FORBIDDEN',
                            message: 'Publishing is not permitted for this termbase.'
                        });
                        return;
                    }
                    sendJson(response, 200, {
                        publications: await store.listPublications(tenantId, segments[3])
                    });
                    return;
                }


                if (
                    request.method === 'PUT'
                    && segments[2] === 'termbases'
                    && segments[3]
                    && segments[4] === 'publications'
                    && segments[5]
                    && segments[6] === 'assets'
                    && segments[7]
                    && segments.length === 8
                ) {
                    if (!mayPublishTermbase(segments[3])) {
                        sendJson(response, 403, {
                            error: 'FORBIDDEN',
                            message: 'Publishing is not permitted for this termbase.'
                        });
                        return;
                    }
                    const result = await store.savePublicationAsset(
                        tenantId,
                        segments[3],
                        segments[5],
                        {
                            fileName: segments[7],
                            contentType: request.headers['content-type'] ?? '',
                            data: await readBinaryBody(request, assetBodyLimit)
                        }
                    );
                    sendJson(response, result.created ? 201 : 200, result);
                    return;
                }

                if (
                    request.method === 'GET'
                    && segments[2] === 'termbases'
                    && segments[3]
                    && segments[4] === 'publications'
                    && segments[5]
                    && segments[6] === 'assets'
                    && segments.length === 7
                ) {
                    if (!mayPublishTermbase(segments[3])) {
                        sendJson(response, 403, {
                            error: 'FORBIDDEN',
                            message: 'Publishing is not permitted for this termbase.'
                        });
                        return;
                    }
                    sendJson(response, 200, {
                        assets: await store.listPublicationAssets(
                            tenantId,
                            segments[3],
                            segments[5]
                        )
                    });
                    return;
                }
            }

            sendJson(response, 404, { error: 'NOT_FOUND', message: 'Route not found.' });
        } catch (error) {
            sendError(response, error);
        }
    };
}
