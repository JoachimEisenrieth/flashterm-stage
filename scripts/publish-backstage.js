import process from 'node:process';
import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { normalizeFileMakerConceptRecords } from '../src/infrastructure/filemaker-concept-records.js';
import { mapConcept } from '../src/domain/terminology.js';
import { createFileMakerTerminologyRepository } from '../src/repositories/filemaker-terminology-repository.js';
import { buildTerminologyPublication } from '../src/publishing/build-terminology-publication.js';
import { createFileMakerDataApiClient } from '../src/publishing/filemaker-data-api-client.js';
import { createStagePublicationClient } from '../src/publishing/stage-publication-client.js';
import { bindOriginalContainerAssets } from '../src/publishing/original-container-assets.js';
import { listPublicationAssetFileNames } from '../src/domain/publication-assets.js';

function requireEnvironment(environment, name) {
    const value = environment[name]?.trim();
    if (!value) throw new Error(`Missing environment variable: ${name}`);
    return value;
}

function requireSecret(environment, name) {
    const value = environment[name];
    if (typeof value !== 'string' || value === '') {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}

export async function publishBackstage({
    environment = process.env,
    args = process.argv.slice(2),
    fileMakerRequest = fetch,
    stageRequest = fetch,
    publicationClient = null
} = {}) {
    const activate = args.includes('--activate');
    const dryRun = args.includes('--dry-run');
    const fileMakerClient = createFileMakerDataApiClient({
        server: requireEnvironment(environment, 'FLASHTERM_FILEMAKER_SERVER'),
        database: requireEnvironment(environment, 'FLASHTERM_FILEMAKER_DATABASE'),
        username: requireEnvironment(environment, 'FLASHTERM_FILEMAKER_USERNAME'),
        password: requireSecret(environment, 'FLASHTERM_FILEMAKER_PASSWORD'),
        request: fileMakerRequest
    });
    const metadata = {
        tenantId: requireEnvironment(environment, 'FLASHTERM_STAGE_TENANT'),
        termbaseId: requireEnvironment(environment, 'FLASHTERM_PUBLISH_TERMBASE'),
        termbaseName: requireEnvironment(environment, 'FLASHTERM_PUBLISH_TERMBASE_NAME'),
        publicationId: requireEnvironment(environment, 'FLASHTERM_PUBLISH_ID'),
        revision: requireEnvironment(environment, 'FLASHTERM_PUBLISH_REVISION'),
        publishedAt: requireEnvironment(environment, 'FLASHTERM_PUBLISH_AT'),
        guiLanguages: (environment.FLASHTERM_PUBLISH_GUI_LANGUAGES ?? 'de-DE,en-GB')
            .split(',').map(value => value.trim()).filter(Boolean)
    };

    const imageSource = environment.FLASHTERM_FILEMAKER_IMAGE_SOURCE ?? 'public';
    if (!['public', 'container'].includes(imageSource)) throw new Error('Invalid FileMaker image source.');
    return fileMakerClient.withSession(async ({ find, downloadContainerAsset }) => {
        const repository = createFileMakerTerminologyRepository({
            fetchLanguages: guiLanguage => find('languageAPI', { guiLanguageCode: guiLanguage }),
            fetchTerms: language => find('termAPI', { languageCode: language }),
            fetchConcept: async conceptId => normalizeFileMakerConceptRecords(
                await find('definitionAPI', { conceptID: conceptId })
            )
        });
        const loadConcepts = async conceptIds => {
            const records = normalizeFileMakerConceptRecords(
                await find('definitionAPI', { conceptID: '*' })
            );
            const recordsByConcept = new Map();
            for (const record of records) {
                const conceptId = String(record.conceptID);
                const conceptRecords = recordsByConcept.get(conceptId) ?? [];
                conceptRecords.push(record);
                recordsByConcept.set(conceptId, conceptRecords);
            }
            return conceptIds
                .filter(conceptId => recordsByConcept.has(conceptId))
                .map(conceptId => mapConcept(conceptId, recordsByConcept.get(conceptId)));
        };
        const publication = await buildTerminologyPublication({ repository, loadConcepts, ...metadata });
        const originals = imageSource === 'container'
            ? await bindOriginalContainerAssets(publication, find) : null;

        const assetFileNames = listPublicationAssetFileNames(publication);
        const stageClient = !dryRun
            ? (publicationClient ?? createStagePublicationClient({
                origin: requireEnvironment(environment, 'FLASHTERM_STAGE_ORIGIN'),
                publishToken: requireSecret(environment, 'FLASHTERM_PUBLISH_TOKEN'),
                request: stageRequest
            }))
            : null;
        if (stageClient) {
            await stageClient.publish(publication);
        }
        for (const fileName of assetFileNames) {
            const asset = originals
                ? await downloadContainerAsset(fileName, originals.get(fileName))
                : await fileMakerClient.downloadAsset(fileName);
            if (stageClient) {
                await stageClient.uploadAsset(
                    metadata.termbaseId,
                    metadata.publicationId,
                    asset
                );
            }
        }
        if (stageClient && activate) {
            await stageClient.activate(metadata.termbaseId, metadata.publicationId);
        }

        return {
            publicationId: metadata.publicationId,
            termbaseId: metadata.termbaseId,
            languages: publication.termbase.languages.length,
            concepts: publication.concepts.length,
            terms: Object.values(publication.termsByLanguage)
                .reduce((total, values) => total + values.length, 0),
            assets: assetFileNames.length,
            transferred: !dryRun,
            activated: !dryRun && activate
        };
    });
}

async function isExecutedFile() {
    if (!process.argv[1]) return false;
    try {
        const [executedPath, modulePath] = await Promise.all([
            realpath(path.resolve(process.argv[1])),
            realpath(fileURLToPath(import.meta.url))
        ]);
        return executedPath === modulePath;
    } catch {
        return pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
    }
}

if (await isExecutedFile()) {
    try {
        const result = await publishBackstage();
        console.log(
            `Publication ${result.publicationId}: ${result.languages} languages, `
            + `${result.concepts} concepts, ${result.terms} terms, ${result.assets} assets; `
            + `${result.transferred ? 'transferred' : 'validated only'}; `
            + `${result.activated ? 'activated' : 'not activated'}.`
        );
    } catch (error) {
        console.error(
            `Publication failed (${error?.name ?? 'Error'}`
            + `${error?.status ? `, HTTP ${error.status}` : ''}`
            + `${error?.code ? `, code ${error.code}` : ''}).`
        );
        process.exitCode = 1;
    }
}
