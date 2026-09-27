import { requirePublicationAssetFileName } from '../domain/publication-assets.js';

// Only short, stable asset names enter the publication. FileMaker's temporary
// container URLs remain private to the export session.
export async function bindOriginalContainerAssets(publication, find) {
    const wanted = new Set(publication.concepts.map(concept => String(concept.id)));
    const records = wanted.size ? await find('imageAPI', { ID: '*' }) : [];
    const originals = new Map();
    for (const { fieldData } of records) {
        const id = String(fieldData?.ID ?? '');
        if (!wanted.has(id)) continue;
        if (originals.has(id)) throw new Error('Duplicate original image record.');
        if (typeof fieldData.figure !== 'string') throw new Error('Original image field is unavailable.');
        originals.set(id, fieldData);
    }
    const assets = new Map();
    for (const concept of publication.concepts) {
        const original = originals.get(String(concept.id));
        if (!original) {
            // Older FileMaker files may have terms without a Concept row.
            // Accept that only when the export does not reference an image.
            if (concept.languages.some(language => language.imageFileName)) {
                throw new Error('Original image record is missing.');
            }
            continue;
        }
        let fileName = '';
        if (original.figure) {
            const extension = /\.(gif|jpe?g|png|webp)$/i.exec(original.figureFileName ?? '')?.[1];
            if (!extension) throw new Error('Original image file name is unsupported.');
            fileName = requirePublicationAssetFileName(
                `concept-${encodeURIComponent(concept.id)}.${extension.toLowerCase()}`
            );
            assets.set(fileName, original.figure);
        }
        // An empty original must clear stale filenames from older exports too.
        for (const language of concept.languages) language.imageFileName = fileName;
    }
    return assets;
}
