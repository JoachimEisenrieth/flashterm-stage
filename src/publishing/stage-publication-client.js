export class StagePublicationClientError extends Error {
    constructor(message, { status = 0, code = '' } = {}) {
        super(message);
        this.name = 'StagePublicationClientError';
        this.status = status;
        this.code = code;
    }
}

function normalizeOrigin(value) {
    const url = new URL(value);
    const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
        throw new StagePublicationClientError('Stage origin must use HTTPS outside local development.');
    }
    return url.toString().replace(/\/$/, '');
}

export function createStagePublicationClient({ origin, publishToken, request = fetch }) {
    const stageOrigin = normalizeOrigin(origin);
    if (!publishToken) throw new StagePublicationClientError('Stage publication token is required.');

    async function requestJson(path, options) {
        const response = await request(`${stageOrigin}${path}`, {
            ...options,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${publishToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        let data = {};
        try {
            data = await response.json();
        } catch {
            // Keep the error independent from upstream response content.
        }
        if (!response.ok) {
            throw new StagePublicationClientError('Stage publication request failed.', {
                status: response.status,
                code: typeof data.error === 'string' ? data.error : ''
            });
        }
        return data;
    }

    return {
        publish(publication) {
            return requestJson('/api/admin/publications', {
                method: 'POST',
                body: JSON.stringify(publication)
            });
        },
        activate(termbaseId, publicationId) {
            return requestJson(
                `/api/admin/termbases/${encodeURIComponent(termbaseId)}/activations`,
                { method: 'POST', body: JSON.stringify({ publicationId }) }
            );
        },
        uploadAsset(termbaseId, publicationId, { fileName, contentType, data }) {
            return requestJson(
                `/api/admin/termbases/${encodeURIComponent(termbaseId)}`
                + `/publications/${encodeURIComponent(publicationId)}`
                + `/assets/${encodeURIComponent(fileName)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': contentType },
                    body: data
                }
            );
        }
    };
}
