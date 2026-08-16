import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = 8000;
const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade'
]);
const MIME_TYPES = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.ico', 'image/x-icon'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml']
]);

function filterHeaders(headers) {
    return Object.fromEntries(
        Object.entries(headers).filter(([name]) => !HOP_BY_HOP_HEADERS.has(name.toLowerCase()))
    );
}

function sendText(response, statusCode, body) {
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    response.end(body);
}

function createBrowserConfigModule(config) {
    const browserConfig = { ...config, server: '' };
    const serializedConfig = JSON.stringify(browserConfig)
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
    return `export const config = ${serializedConfig};\n`;
}

function serveBrowserConfig(request, response, config) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendText(response, 405, 'Method Not Allowed');
        return;
    }

    const body = createBrowserConfigModule(config);
    response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    response.end(request.method === 'HEAD' ? undefined : body);
}

async function serveStaticFile(request, response, rootDirectory, pathname) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendText(response, 405, 'Method Not Allowed');
        return;
    }

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        sendText(response, 400, 'Bad Request');
        return;
    }

    const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
    const absoluteRoot = path.resolve(rootDirectory);
    const filePath = path.resolve(absoluteRoot, relativePath);
    if (filePath !== absoluteRoot && !filePath.startsWith(`${absoluteRoot}${path.sep}`)) {
        sendText(response, 403, 'Forbidden');
        return;
    }

    try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            sendText(response, 404, 'Not Found');
            return;
        }

        response.writeHead(200, {
            'Content-Type': MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
            'Content-Length': fileStat.size
        });
        if (request.method === 'HEAD') {
            response.end();
            return;
        }
        createReadStream(filePath)
            .on('error', () => response.destroy())
            .pipe(response);
    } catch (error) {
        sendText(response, error?.code === 'ENOENT' ? 404 : 500, error?.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error');
    }
}

function proxyFileMakerRequest(request, response, upstreamOrigin, upstreamPath, proxyRequest) {
    const upstreamUrl = new URL(upstreamPath, upstreamOrigin);
    const headers = filterHeaders(request.headers);
    delete headers.host;

    const upstreamRequest = proxyRequest(upstreamUrl, {
        method: request.method,
        headers
    }, upstreamResponse => {
        response.writeHead(
            upstreamResponse.statusCode ?? 502,
            filterHeaders(upstreamResponse.headers)
        );
        upstreamResponse
            .on('error', () => response.destroy())
            .pipe(response);
    });

    upstreamRequest.on('error', () => {
        if (!response.headersSent) {
            sendText(response, 502, 'Bad Gateway');
        } else {
            response.destroy();
        }
    });
    request.pipe(upstreamRequest);
}

export function createDevelopmentServer({
    rootDirectory,
    config,
    proxyRequest = httpsRequest
}) {
    const upstreamUrl = new URL(config.server);
    if (upstreamUrl.protocol !== 'https:') {
        throw new Error('The FileMaker development proxy requires an HTTPS upstream server.');
    }
    if (upstreamUrl.pathname !== '/' || upstreamUrl.search || upstreamUrl.hash) {
        throw new Error('The FileMaker server configuration must contain an origin without a path.');
    }

    return createServer((request, response) => {
        const requestUrl = new URL(request.url, 'http://localhost');
        if (requestUrl.pathname === '/config.js') {
            serveBrowserConfig(request, response, config);
            return;
        }
        const isFileMakerRequest = requestUrl.pathname === '/fmi' || requestUrl.pathname.startsWith('/fmi/');
        const isImageRequest = requestUrl.pathname.startsWith('/public/RC_Data_FMS/');
        if (isFileMakerRequest || isImageRequest) {
            proxyFileMakerRequest(
                request,
                response,
                upstreamUrl.origin,
                `${requestUrl.pathname}${requestUrl.search}`,
                proxyRequest
            );
            return;
        }
        void serveStaticFile(request, response, rootDirectory, requestUrl.pathname);
    });
}

async function startDevelopmentServer() {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const { config } = await import(pathToFileURL(path.join(projectRoot, 'config.js')));
    const configuredPort = Number.parseInt(process.env.FLASHTERM_DEV_PORT ?? '', 10);
    const port = Number.isInteger(configuredPort) ? configuredPort : DEFAULT_PORT;
    const server = createDevelopmentServer({ rootDirectory: projectRoot, config });

    server.listen(port, LOOPBACK_HOST, () => {
        console.log(`Flashterm development server listening on http://${LOOPBACK_HOST}:${port}/`);
    });
    server.on('error', () => {
        console.error('Flashterm development server failed to start.');
        process.exitCode = 1;
    });
}

const executedFile = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (executedFile === import.meta.url) {
    await startDevelopmentServer();
}
