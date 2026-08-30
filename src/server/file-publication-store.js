import { createHash, randomUUID } from 'node:crypto';
import {
    mkdir,
    readdir,
    readFile,
    rename,
    rm,
    writeFile
} from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { validateTerminologyPublication } from '../domain/terminology-publication.js';
import {
    requirePublicationAssetContentType,
    requirePublicationAssetFileName
} from '../domain/publication-assets.js';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export class PublicationStoreError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'PublicationStoreError';
        this.code = code;
    }
}

function requireSafeId(value, label) {
    if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) {
        throw new PublicationStoreError('INVALID_ID', `${label} is invalid.`);
    }
    return value;
}

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readDirectoryNames(directory) {
    try {
        const entries = await readdir(directory, { withFileTypes: true });
        return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    } catch (error) {
        if (error?.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function readFileNames(directory) {
    try {
        const entries = await readdir(directory, { withFileTypes: true });
        return entries.filter(entry => entry.isFile()).map(entry => entry.name);
    } catch (error) {
        if (error?.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function validateStoredAssetMetadata(metadata, expectedFileName = '') {
    if (
        !metadata
        || metadata.schemaVersion !== 1
        || typeof metadata.fileName !== 'string'
        || (expectedFileName && metadata.fileName !== expectedFileName)
        || !/^[a-f0-9]{64}$/.test(metadata.sha256 ?? '')
        || !Number.isSafeInteger(metadata.size)
        || metadata.size <= 0
    ) {
        throw new PublicationStoreError(
            'INVALID_ASSET',
            'Stored publication asset metadata is invalid.'
        );
    }
    requirePublicationAssetFileName(metadata.fileName);
    requirePublicationAssetContentType(metadata.contentType);
    return metadata;
}

export function createFilePublicationStore({ dataDirectory, now = Date.now }) {
    const rootDirectory = path.resolve(dataDirectory);
    const locks = new Map();

    function termbaseDirectory(tenantId, termbaseId) {
        return path.join(
            rootDirectory,
            'tenants',
            requireSafeId(tenantId, 'tenantId'),
            'termbases',
            requireSafeId(termbaseId, 'termbaseId')
        );
    }

    function publicationDirectory(tenantId, termbaseId, publicationId) {
        return path.join(
            termbaseDirectory(tenantId, termbaseId),
            'publications',
            requireSafeId(publicationId, 'publicationId')
        );
    }

    function publicationAssetDirectories(tenantId, termbaseId, publicationId) {
        const assetDirectory = path.join(
            publicationDirectory(tenantId, termbaseId, publicationId),
            'assets'
        );
        return {
            blobs: path.join(assetDirectory, 'blobs'),
            index: path.join(assetDirectory, 'index')
        };
    }

    function publicationAssetMetadataPath(tenantId, termbaseId, publicationId, fileName) {
        const directories = publicationAssetDirectories(tenantId, termbaseId, publicationId);
        return path.join(directories.index, `${sha256(Buffer.from(fileName, 'utf8'))}.json`);
    }

    async function withTermbaseLock(tenantId, termbaseId, task) {
        const lockKey = `${tenantId}\0${termbaseId}`;
        const previous = locks.get(lockKey) ?? Promise.resolve();
        const current = previous.catch(() => {}).then(task);
        locks.set(lockKey, current);
        try {
            return await current;
        } finally {
            if (locks.get(lockKey) === current) {
                locks.delete(lockKey);
            }
        }
    }

    async function getPublication(tenantId, termbaseId, publicationId) {
        const filePath = path.join(
            publicationDirectory(tenantId, termbaseId, publicationId),
            'publication.json'
        );
        try {
            return validateTerminologyPublication(await readJson(filePath));
        } catch (error) {
            if (error?.code === 'ENOENT') {
                throw new PublicationStoreError('NOT_FOUND', 'Publication not found.');
            }
            throw error;
        }
    }

    async function savePublication(publication) {
        validateTerminologyPublication(publication);
        const { tenantId, termbaseId, id: publicationId } = publication.publication;
        requireSafeId(tenantId, 'tenantId');
        requireSafeId(termbaseId, 'termbaseId');
        requireSafeId(publicationId, 'publicationId');

        return withTermbaseLock(tenantId, termbaseId, async () => {
            const publicationsDirectory = path.join(
                termbaseDirectory(tenantId, termbaseId),
                'publications'
            );
            const finalDirectory = publicationDirectory(tenantId, termbaseId, publicationId);
            const temporaryDirectory = path.join(
                publicationsDirectory,
                `.incoming-${publicationId}-${randomUUID()}`
            );

            await mkdir(publicationsDirectory, { recursive: true });
            try {
                const existing = await getPublication(tenantId, termbaseId, publicationId);
                if (!isDeepStrictEqual(existing, publication)) {
                    throw new PublicationStoreError(
                        'CONFLICT',
                        'Publication ID already exists with different content.'
                    );
                }
                return { created: false, publicationId };
            } catch (error) {
                if (!(error instanceof PublicationStoreError) || error.code !== 'NOT_FOUND') {
                    throw error;
                }
            }

            try {
                await mkdir(temporaryDirectory);
                await writeFile(
                    path.join(temporaryDirectory, 'publication.json'),
                    `${JSON.stringify(publication, null, 2)}\n`,
                    { encoding: 'utf8', flag: 'wx' }
                );
                await rename(temporaryDirectory, finalDirectory);
                return { created: true, publicationId };
            } catch (error) {
                await rm(temporaryDirectory, { recursive: true, force: true });
                let existing;
                try {
                    existing = await getPublication(tenantId, termbaseId, publicationId);
                } catch (readError) {
                    if (readError instanceof PublicationStoreError && readError.code === 'NOT_FOUND') {
                        throw error;
                    }
                    throw readError;
                }
                if (!isDeepStrictEqual(existing, publication)) {
                    throw new PublicationStoreError(
                        'CONFLICT',
                        'Publication ID already exists with different content.'
                    );
                }
                return { created: false, publicationId };
            }
        });
    }

    async function readPublicationAssetMetadata(tenantId, termbaseId, publicationId, fileName) {
        requirePublicationAssetFileName(fileName);
        const metadataPath = publicationAssetMetadataPath(
            tenantId,
            termbaseId,
            publicationId,
            fileName
        );
        try {
            return validateStoredAssetMetadata(await readJson(metadataPath), fileName);
        } catch (error) {
            if (error?.code === 'ENOENT') {
                throw new PublicationStoreError('NOT_FOUND', 'Publication asset not found.');
            }
            throw error;
        }
    }

    async function savePublicationAsset(
        tenantId,
        termbaseId,
        publicationId,
        { fileName, contentType, data }
    ) {
        requireSafeId(tenantId, 'tenantId');
        requireSafeId(termbaseId, 'termbaseId');
        requireSafeId(publicationId, 'publicationId');
        requirePublicationAssetFileName(fileName);
        const normalizedContentType = requirePublicationAssetContentType(contentType);
        const assetData = Buffer.isBuffer(data) ? data : Buffer.from(data ?? []);
        if (assetData.length === 0) {
            throw new PublicationStoreError('INVALID_ASSET', 'Publication asset is empty.');
        }
        const assetHash = sha256(assetData);
        const metadata = {
            schemaVersion: 1,
            fileName,
            contentType: normalizedContentType,
            size: assetData.length,
            sha256: assetHash
        };

        return withTermbaseLock(tenantId, termbaseId, async () => {
            await getPublication(tenantId, termbaseId, publicationId);
            try {
                const existing = await readPublicationAssetMetadata(
                    tenantId,
                    termbaseId,
                    publicationId,
                    fileName
                );
                if (!isDeepStrictEqual(existing, metadata)) {
                    throw new PublicationStoreError(
                        'CONFLICT',
                        'Publication asset already exists with different content.'
                    );
                }
                return { created: false, ...metadata };
            } catch (error) {
                if (!(error instanceof PublicationStoreError) || error.code !== 'NOT_FOUND') {
                    throw error;
                }
            }

            const directories = publicationAssetDirectories(
                tenantId,
                termbaseId,
                publicationId
            );
            const blobPath = path.join(directories.blobs, assetHash);
            const metadataPath = publicationAssetMetadataPath(
                tenantId,
                termbaseId,
                publicationId,
                fileName
            );
            await mkdir(directories.blobs, { recursive: true });
            await mkdir(directories.index, { recursive: true });
            try {
                await writeFile(blobPath, assetData, { flag: 'wx' });
            } catch (error) {
                if (error?.code !== 'EEXIST') throw error;
            }
            try {
                await writeFile(
                    metadataPath,
                    `${JSON.stringify(metadata, null, 2)}\n`,
                    { encoding: 'utf8', flag: 'wx' }
                );
            } catch (error) {
                if (error?.code !== 'EEXIST') throw error;
                const existing = await readPublicationAssetMetadata(
                    tenantId,
                    termbaseId,
                    publicationId,
                    fileName
                );
                if (!isDeepStrictEqual(existing, metadata)) {
                    throw new PublicationStoreError(
                        'CONFLICT',
                        'Publication asset already exists with different content.'
                    );
                }
                return { created: false, ...metadata };
            }
            return { created: true, ...metadata };
        });
    }

    async function getPublicationAsset(tenantId, termbaseId, publicationId, fileName) {
        requireSafeId(tenantId, 'tenantId');
        requireSafeId(termbaseId, 'termbaseId');
        requireSafeId(publicationId, 'publicationId');
        await getPublication(tenantId, termbaseId, publicationId);
        const metadata = await readPublicationAssetMetadata(
            tenantId,
            termbaseId,
            publicationId,
            fileName
        );
        const directories = publicationAssetDirectories(tenantId, termbaseId, publicationId);
        let data;
        try {
            data = await readFile(path.join(directories.blobs, metadata.sha256));
        } catch (error) {
            if (error?.code === 'ENOENT') {
                throw new PublicationStoreError('INVALID_ASSET', 'Publication asset data is missing.');
            }
            throw error;
        }
        if (data.length !== metadata.size || sha256(data) !== metadata.sha256) {
            throw new PublicationStoreError('INVALID_ASSET', 'Publication asset data is invalid.');
        }
        return { ...metadata, data };
    }

    async function listPublicationAssets(tenantId, termbaseId, publicationId) {
        requireSafeId(tenantId, 'tenantId');
        requireSafeId(termbaseId, 'termbaseId');
        requireSafeId(publicationId, 'publicationId');
        await getPublication(tenantId, termbaseId, publicationId);
        const directories = publicationAssetDirectories(tenantId, termbaseId, publicationId);
        const metadataFiles = (await readFileNames(directories.index))
            .filter(fileName => /^[a-f0-9]{64}\.json$/.test(fileName));
        const assets = await Promise.all(metadataFiles.map(async metadataFile => (
            validateStoredAssetMetadata(await readJson(path.join(directories.index, metadataFile)))
        )));
        return assets.sort((left, right) => left.fileName.localeCompare(right.fileName));
    }

    async function getActivationFiles(tenantId, termbaseId) {
        const activationsDirectory = path.join(
            termbaseDirectory(tenantId, termbaseId),
            'activations'
        );
        const files = await readFileNames(activationsDirectory);
        return files.filter(file => /^\d{13}-[A-Za-z0-9-]+\.json$/.test(file)).sort();
    }

    async function getActivePublication(tenantId, termbaseId) {
        const files = await getActivationFiles(tenantId, termbaseId);
        if (files.length === 0) {
            throw new PublicationStoreError('NOT_FOUND', 'No active publication found.');
        }
        const activation = await readJson(path.join(
            termbaseDirectory(tenantId, termbaseId),
            'activations',
            files.at(-1)
        ));
        return getPublication(tenantId, termbaseId, activation.publicationId);
    }

    async function activatePublication(tenantId, termbaseId, publicationId) {
        requireSafeId(tenantId, 'tenantId');
        requireSafeId(termbaseId, 'termbaseId');
        requireSafeId(publicationId, 'publicationId');

        return withTermbaseLock(tenantId, termbaseId, async () => {
            const publication = await getPublication(tenantId, termbaseId, publicationId);
            const files = await getActivationFiles(tenantId, termbaseId);
            const previousSequence = files.length === 0
                ? 0
                : Number.parseInt(files.at(-1).slice(0, 13), 10);
            const sequence = Math.max(now(), previousSequence + 1);
            const activatedAt = new Date(sequence).toISOString();
            const activationsDirectory = path.join(
                termbaseDirectory(tenantId, termbaseId),
                'activations'
            );
            const activationFile = `${String(sequence).padStart(13, '0')}-${randomUUID()}.json`;
            await mkdir(activationsDirectory, { recursive: true });
            await writeFile(
                path.join(activationsDirectory, activationFile),
                `${JSON.stringify({
                    publicationId,
                    revision: publication.publication.revision,
                    activatedAt
                }, null, 2)}\n`,
                { encoding: 'utf8', flag: 'wx' }
            );
            return { publicationId, activatedAt };
        });
    }

    async function listPublications(tenantId, termbaseId) {
        const publicationsDirectory = path.join(
            termbaseDirectory(tenantId, termbaseId),
            'publications'
        );
        const publicationIds = (await readDirectoryNames(publicationsDirectory))
            .filter(id => SAFE_ID_PATTERN.test(id))
            .sort();
        const publications = await Promise.all(publicationIds.map(async publicationId => {
            const publication = await getPublication(tenantId, termbaseId, publicationId);
            return publication.publication;
        }));
        return publications.sort((left, right) => left.publishedAt.localeCompare(right.publishedAt));
    }

    async function listTermbases(tenantId) {
        requireSafeId(tenantId, 'tenantId');
        const directory = path.join(rootDirectory, 'tenants', tenantId, 'termbases');
        const termbaseIds = (await readDirectoryNames(directory))
            .filter(id => SAFE_ID_PATTERN.test(id))
            .sort();
        const termbases = [];
        for (const termbaseId of termbaseIds) {
            try {
                const active = await getActivePublication(tenantId, termbaseId);
                termbases.push({
                    id: termbaseId,
                    name: active.termbase.name,
                    sourceLanguage: active.termbase.sourceLanguage,
                    publication: active.publication
                });
            } catch (error) {
                if (!(error instanceof PublicationStoreError) || error.code !== 'NOT_FOUND') {
                    throw error;
                }
            }
        }
        return termbases;
    }

    return {
        activatePublication,
        getActivePublication,
        getPublication,
        getPublicationAsset,
        listPublicationAssets,
        listPublications,
        listTermbases,
        savePublicationAsset,
        savePublication
    };
}
