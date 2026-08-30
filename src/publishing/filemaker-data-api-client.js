import {
    requirePublicationAssetContentType,
    requirePublicationAssetFileName
} from '../domain/publication-assets.js';

export class FileMakerDataApiError extends Error {
    constructor(message, { status = 0, code = '' } = {}) {
        super(message);
        this.name = 'FileMakerDataApiError';
        this.status = status;
        this.code = code;
    }
}

function requireHttpsOrigin(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
        throw new FileMakerDataApiError('FileMaker server must use HTTPS.');
    }
    return url.toString().replace(/\/$/, '');
}

async function responseJson(response) {
    try {
        return await response.json();
    } catch {
        throw new FileMakerDataApiError('FileMaker returned an invalid response.', {
            status: response.status
        });
    }
}

export function createFileMakerDataApiClient({
    server,
    database,
    username,
    password,
    request = fetch,
    recordLimit = 10_000,
    maximumRecords = 250_000,
    maximumAssetBytes = 10 * 1024 * 1024
}) {
    const origin = requireHttpsOrigin(server);
    if (![database, username, password].every(value => typeof value === 'string' && value)) {
        throw new FileMakerDataApiError('FileMaker connection configuration is incomplete.');
    }
    const databasePath = `${origin}/fmi/data/vLatest/databases/${encodeURIComponent(database)}`;
    let token = '';

    async function login() {
        const response = await request(`${databasePath}/sessions`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: '{}'
        });
        const data = await responseJson(response);
        token = data?.response?.token ?? '';
        if (!response.ok || !token) {
            token = '';
            throw new FileMakerDataApiError('FileMaker login failed.', {
                status: response.status,
                code: data?.messages?.[0]?.code ?? ''
            });
        }
    }

    async function logout() {
        if (!token) return;
        const sessionToken = token;
        token = '';
        const response = await request(`${databasePath}/sessions/${encodeURIComponent(sessionToken)}`, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${sessionToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new FileMakerDataApiError('FileMaker logout failed.', { status: response.status });
        }
    }

    async function find(layout, criteria) {
        if (!token) throw new FileMakerDataApiError('FileMaker session is not active.');
        const records = [];
        let offset = 1;
        while (true) {
            const response = await request(
                `${databasePath}/layouts/${encodeURIComponent(layout)}/_find`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: [criteria],
                        limit: String(recordLimit),
                        offset: String(offset)
                    })
                }
            );
            const data = await responseJson(response);
            if (!response.ok || !Array.isArray(data?.response?.data)) {
                throw new FileMakerDataApiError('FileMaker find request failed.', {
                    status: response.status,
                    code: data?.messages?.[0]?.code ?? ''
                });
            }
            const page = data.response.data;
            records.push(...page);
            if (records.length > maximumRecords) {
                throw new FileMakerDataApiError(
                    `FileMaker find result exceeds the safety limit of ${maximumRecords} records.`
                );
            }
            const foundCount = Number(data.response.dataInfo?.foundCount);
            if (
                (Number.isFinite(foundCount) && records.length >= foundCount)
                || page.length < recordLimit
            ) {
                return records;
            }
            offset += page.length;
        }
    }

    async function downloadAsset(fileName) {
        try {
            requirePublicationAssetFileName(fileName);
        } catch {
            throw new FileMakerDataApiError('FileMaker asset file name is invalid.');
        }
        const assetUrl = `${origin}/public/RC_Data_FMS/${encodeURIComponent(database)}`
            + `/Files/Images/${encodeURIComponent(fileName)}`;
        const response = await request(assetUrl, {
            method: 'GET',
            headers: { Accept: 'image/gif, image/jpeg, image/png, image/webp' }
        });
        if (!response.ok) {
            throw new FileMakerDataApiError('FileMaker asset download failed.', {
                status: response.status
            });
        }
        let contentType;
        try {
            contentType = requirePublicationAssetContentType(
                response.headers.get('content-type') ?? ''
            );
        } catch {
            throw new FileMakerDataApiError('FileMaker asset type is not supported.', {
                status: response.status
            });
        }
        const declaredSize = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredSize) && declaredSize > maximumAssetBytes) {
            throw new FileMakerDataApiError('FileMaker asset exceeds the size limit.');
        }
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length === 0 || data.length > maximumAssetBytes) {
            throw new FileMakerDataApiError('FileMaker asset size is invalid.');
        }
        return { fileName, contentType, data };
    }

    return {
        downloadAsset,
        find,
        async withSession(task) {
            await login();
            let taskError;
            try {
                return await task({ find });
            } catch (error) {
                taskError = error;
                throw error;
            } finally {
                try {
                    await logout();
                } catch (logoutError) {
                    if (!taskError) throw logoutError;
                }
            }
        }
    };
}
