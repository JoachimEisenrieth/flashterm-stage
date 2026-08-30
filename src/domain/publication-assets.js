const SAFE_FILE_NAME_MAX_BYTES = 1_024;

export const PUBLICATION_ASSET_CONTENT_TYPES = Object.freeze([
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp'
]);

export class PublicationAssetError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'PublicationAssetError';
        this.code = code;
    }
}

export function requirePublicationAssetFileName(value) {
    if (
        typeof value !== 'string'
        || value.length === 0
        || value === '.'
        || value === '..'
        || Buffer.byteLength(value, 'utf8') > SAFE_FILE_NAME_MAX_BYTES
        || /[\\/\u0000-\u001f\u007f]/.test(value)
    ) {
        throw new PublicationAssetError(
            'INVALID_ASSET_NAME',
            'Publication asset file name is invalid.'
        );
    }
    return value;
}

export function requirePublicationAssetContentType(value) {
    const contentType = typeof value === 'string'
        ? value.split(';', 1)[0].trim().toLowerCase()
        : '';
    if (!PUBLICATION_ASSET_CONTENT_TYPES.includes(contentType)) {
        throw new PublicationAssetError(
            'UNSUPPORTED_ASSET_TYPE',
            'Publication asset type is not supported.'
        );
    }
    return contentType;
}

export function listPublicationAssetFileNames(publication) {
    const fileNames = new Set();
    for (const concept of publication?.concepts ?? []) {
        for (const language of concept?.languages ?? []) {
            if (language?.imageFileName) {
                fileNames.add(requirePublicationAssetFileName(language.imageFileName));
            }
        }
    }
    return [...fileNames].sort((left, right) => left.localeCompare(right));
}
