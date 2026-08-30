import { createServer } from 'node:http';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createFilePublicationStore } from '../src/server/file-publication-store.js';
import { createSessionManager } from '../src/server/auth-session.js';
import { createOpenIdConnectClient } from '../src/server/openid-connect.js';
import { createStageAuth } from '../src/server/stage-auth.js';
import { createStageApiHandler } from '../src/server/stage-api.js';
import { sendText, serveStaticFile } from '../src/server/static-files.js';

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = 8100;
const DEFAULT_TENANT_ID = 'local';
const PUBLIC_ROOT_PATHS = new Set([
    '/',
    '/index.html',
    '/flashterm.html',
    '/flashterm.css',
    '/flashterm.js',
    '/filemaker-api.js',
    '/flashterm-light.ico',
    '/flashterm-dark.ico'
]);
const PUBLIC_DIRECTORY_PATHS = new Map([
    ['/json/', '.json'],
    ['/svg/', '.svg'],
    ['/src/app/', '.js'],
    ['/src/domain/', '.js'],
    ['/src/infrastructure/', '.js'],
    ['/src/repositories/', '.js']
]);

export function isPublicAppPath(pathname) {
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        return false;
    }
    if (decodedPath.includes('\\') || path.posix.normalize(decodedPath) !== decodedPath) {
        return false;
    }
    if (PUBLIC_ROOT_PATHS.has(decodedPath)) {
        return true;
    }
    for (const [directory, extension] of PUBLIC_DIRECTORY_PATHS) {
        if (decodedPath.startsWith(directory) && decodedPath.endsWith(extension)) {
            return true;
        }
    }
    return false;
}

function serializeBrowserConfig(config) {
    return JSON.stringify(config)
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
}

async function serveBrowserConfig(request, response, store, tenantId, configuredTermbaseId, auth) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendText(response, 405, 'Method Not Allowed');
        return;
    }

    const identity = auth.getIdentity(request);
    if (auth.required && !identity) {
        sendText(response, 401, 'Authentication required');
        return;
    }
    const visibleTermbaseIds = new Set(identity?.termbaseIds ?? ['*']);
    const termbases = (await store.listTermbases(tenantId)).filter(termbase => (
        visibleTermbaseIds.has('*') || visibleTermbaseIds.has(termbase.id)
    ));
    const selectedTermbase = configuredTermbaseId
        ? termbases.find(termbase => termbase.id === configuredTermbaseId)
        : termbases[0];
    const publication = selectedTermbase
        ? await store.getActivePublication(tenantId, selectedTermbase.id)
        : null;
    const sourceLanguage = publication?.termbase.sourceLanguage ?? '';
    const targetLanguage = publication?.termbase.languages
        .find(language => language.code !== sourceLanguage)?.code ?? '';
    const browserConfig = {
        dataSource: 'published',
        termbaseId: selectedTermbase?.id ?? '',
        publicationId: publication?.publication.id ?? '',
        initialSourceLanguage: sourceLanguage,
        initialTargetLanguage: targetLanguage
    };
    const body = `export const config = ${serializeBrowserConfig(browserConfig)};\n`;
    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    response.end(request.method === 'HEAD' ? undefined : body);
}

export function createStageServer({
    store,
    tenantId,
    publishToken = '',
    bodyLimit,
    rootDirectory = '',
    configuredTermbaseId = '',
    auth = createStageAuth(),
    publishTermbaseIds = ['*']
}) {
    const apiHandler = createStageApiHandler({
        store,
        tenantId,
        publishToken,
        publishTermbaseIds,
        bodyLimit,
        auth
    });
    return createServer((request, response) => {
        const requestUrl = new URL(request.url, 'http://localhost');
        if (requestUrl.pathname === '/auth' || requestUrl.pathname.startsWith('/auth/')) {
            void auth.handle(request, response, requestUrl).then(handled => {
                if (!handled) sendText(response, 404, 'Not Found');
            }).catch(() => sendText(response, 500, 'Authentication failed'));
            return;
        }
        if (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/')) {
            void apiHandler(request, response);
            return;
        }
        if (!rootDirectory) {
            sendText(response, 404, 'Not Found');
            return;
        }
        if (requestUrl.pathname === '/config.js') {
            void serveBrowserConfig(
                request,
                response,
                store,
                tenantId,
                configuredTermbaseId,
                auth
            ).catch(() => sendText(response, 500, 'Internal Server Error'));
            return;
        }
        if (
            auth.required
            && !auth.getIdentity(request)
            && ['/', '/index.html', '/flashterm.html'].includes(requestUrl.pathname)
        ) {
            response.writeHead(303, {
                'Cache-Control': 'no-store',
                Location: `/auth/login?returnTo=${encodeURIComponent(request.url)}`
            });
            response.end();
            return;
        }
        if (!isPublicAppPath(requestUrl.pathname)) {
            sendText(response, 404, 'Not Found');
            return;
        }
        void serveStaticFile(request, response, rootDirectory, requestUrl.pathname);
    });
}

function parseGroupAccess(value) {
    if (!value) return {};
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('FLASHTERM_STAGE_GROUP_ACCESS must be a JSON object.');
    }
    return Object.fromEntries(Object.entries(parsed).map(([group, termbaseIds]) => {
        if (!Array.isArray(termbaseIds) || termbaseIds.some(id => typeof id !== 'string')) {
            throw new Error('Every group access entry must contain an array of termbase IDs.');
        }
        return [group, termbaseIds];
    }));
}

async function startStageServer() {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const configuredPort = Number.parseInt(process.env.FLASHTERM_STAGE_PORT ?? '', 10);
    const port = Number.isInteger(configuredPort) ? configuredPort : DEFAULT_PORT;
    const dataDirectory = path.resolve(
        process.env.FLASHTERM_STAGE_DATA ?? path.join(projectRoot, '.stage-data')
    );
    const tenantId = process.env.FLASHTERM_STAGE_TENANT ?? DEFAULT_TENANT_ID;
    const publishToken = process.env.FLASHTERM_PUBLISH_TOKEN ?? '';
    const configuredTermbaseId = process.env.FLASHTERM_STAGE_TERMBASE ?? '';
    const publishTermbaseIds = (process.env.FLASHTERM_PUBLISH_TERMBASES ?? '*')
        .split(',').map(value => value.trim()).filter(Boolean);
    const authMode = process.env.FLASHTERM_STAGE_AUTH ?? 'development';
    const publicOrigin = process.env.FLASHTERM_STAGE_PUBLIC_ORIGIN ?? '';
    const sessionManager = createSessionManager({ secureCookies: authMode === 'oidc' });
    let oidcClient = null;
    if (authMode === 'oidc') {
        oidcClient = createOpenIdConnectClient({
            issuer: process.env.FLASHTERM_OIDC_ISSUER ?? '',
            clientId: process.env.FLASHTERM_OIDC_CLIENT_ID ?? '',
            clientSecret: process.env.FLASHTERM_OIDC_CLIENT_SECRET ?? '',
            redirectUri: new URL('/auth/callback', publicOrigin).toString(),
            groupClaim: process.env.FLASHTERM_OIDC_GROUP_CLAIM ?? 'groups',
            groupAccess: parseGroupAccess(process.env.FLASHTERM_STAGE_GROUP_ACCESS ?? '')
        });
    }
    const auth = createStageAuth({
        mode: authMode,
        sessionManager,
        developmentIdentity: {
            subject: 'local-development',
            displayName: process.env.FLASHTERM_STAGE_DEV_USER ?? 'Lokale Entwicklung',
            groups: ['local-development'],
            termbaseIds: (process.env.FLASHTERM_STAGE_DEV_TERMBASES ?? '*')
                .split(',').map(value => value.trim()).filter(Boolean)
        },
        oidcClient,
        publicOrigin
    });
    const store = createFilePublicationStore({ dataDirectory });
    const server = createStageServer({
        store,
        tenantId,
        publishToken,
        rootDirectory: projectRoot,
        configuredTermbaseId,
        auth,
        publishTermbaseIds
    });

    server.listen(port, LOOPBACK_HOST, () => {
        console.log(`Flashterm stage listening on http://${LOOPBACK_HOST}:${port}/`);
        if (!publishToken) {
            console.log('Publishing endpoints are disabled.');
        }
    });
    server.on('error', () => {
        console.error('Flashterm stage API failed to start.');
        process.exitCode = 1;
    });
}

export async function pathsResolveToSameFile(leftPath, rightPath) {
    try {
        return await realpath(leftPath) === await realpath(rightPath);
    } catch {
        return false;
    }
}

async function isExecutedFile() {
    if (!process.argv[1]) return false;
    return pathsResolveToSameFile(process.argv[1], fileURLToPath(import.meta.url));
}

if (await isExecutedFile()) {
    await startStageServer();
}
