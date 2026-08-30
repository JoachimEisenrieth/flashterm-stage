import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.ico', 'image/x-icon'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml']
]);

export function sendText(response, statusCode, body) {
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    response.end(body);
}

export async function serveStaticFile(request, response, rootDirectory, pathname) {
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
            'Content-Type': MIME_TYPES.get(path.extname(filePath).toLowerCase())
                ?? 'application/octet-stream',
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
        const notFound = error?.code === 'ENOENT';
        sendText(response, notFound ? 404 : 500, notFound ? 'Not Found' : 'Internal Server Error');
    }
}
