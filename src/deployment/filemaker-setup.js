import { publishBackstage } from '../../scripts/publish-backstage.js';
import { createFileMakerDataApiClient } from '../publishing/filemaker-data-api-client.js';

export const REQUIRED_LAYOUT_FIELDS = Object.freeze({
    languageAPI: ['guiLanguageCode', 'languageCode', 'language', 'source'],
    termAPI: ['languageCode', 'termlist'],
    definitionAPI: ['conceptID', 'languageCode', 'termlist', 'definition', 'context', 'info', 'infobox', 'fileName']
});

// Exercise the same read-only conversion and asset download as the publisher.
// No STAGE credentials are supplied and dry-run never writes a publication.
export async function checkFileMakerSetup(configuration, { publisher = publishBackstage, clientFactory = createFileMakerDataApiClient } = {}) {
    const required = ['server', 'database', 'username', 'password', 'tenantId', 'termbaseId', 'termbaseName'];
    if (!configuration || required.some(key => typeof configuration[key] !== 'string'
        || !configuration[key] || /[\r\n\0]/.test(configuration[key]))) {
        return { ok: false, code: 'INVALID_CONFIGURATION' };
    }
    try {
        const imageSource = configuration.imageSource ?? 'public';
        if (!['public', 'container'].includes(imageSource)) return { ok: false, code: 'INVALID_IMAGE_SOURCE' };
        const url = new URL(configuration.server);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
            return { ok: false, code: 'INVALID_FILEMAKER_ORIGIN' };
        }
        const request = (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
        const client = clientFactory({ server: url.origin, database: configuration.database,
            username: configuration.username, password: configuration.password, request });
        const missingFields = [];
        const warnings = [];
        await client.withSession(async ({ describeLayout }) => {
            const layouts = { ...REQUIRED_LAYOUT_FIELDS,
                ...(imageSource === 'container' ? { imageAPI: ['ID', 'figure', 'figureFileName'] } : {}) };
            for (const [layout, requiredFields] of Object.entries(layouts)) {
                const names = new Set((await describeLayout(layout)).map(field => field.name));
                if (layout === 'definitionAPI' && !names.has('hyperLink')) warnings.push('OPTIONAL_HYPERLINK_FIELD_MISSING');
                for (const field of requiredFields) if (!names.has(field)) missingFields.push(`${layout}.${field}`);
            }
        });
        if (missingFields.length) return { ok: false, code: 'MISSING_API_FIELDS', missingFields };
        if (!configuration.validateExport) return { ok: true, code: 'LAYOUT_CHECK_PASSED',
            exportedData: 'not-verified', fileMakerPairing: 'not-verified', warnings };
        const result = await publisher({
            environment: {
                FLASHTERM_FILEMAKER_SERVER: url.origin,
                FLASHTERM_FILEMAKER_DATABASE: configuration.database,
                FLASHTERM_FILEMAKER_IMAGE_SOURCE: imageSource,
                FLASHTERM_FILEMAKER_USERNAME: configuration.username,
                FLASHTERM_FILEMAKER_PASSWORD: configuration.password,
                FLASHTERM_STAGE_TENANT: configuration.tenantId,
                FLASHTERM_PUBLISH_TERMBASE: configuration.termbaseId,
                FLASHTERM_PUBLISH_TERMBASE_NAME: configuration.termbaseName,
                FLASHTERM_PUBLISH_ID: 'SETUP-READ-CHECK',
                FLASHTERM_PUBLISH_REVISION: 'SETUP-READ-CHECK',
                FLASHTERM_PUBLISH_AT: new Date().toISOString()
            },
            args: ['--dry-run'],
            fileMakerRequest: request
        });
        return { ok: true, code: 'READ_CHECK_PASSED', languages: result.languages,
            concepts: result.concepts, terms: result.terms, assets: result.assets,
            fileMakerPairing: 'not-verified', warnings };
    } catch (error) {
        // Never return upstream messages, URLs, records or credentials.
        return { ok: false, code: 'FILEMAKER_READ_CHECK_FAILED',
            httpStatus: Number.isInteger(error?.status) ? error.status : 0,
            fileMakerCode: /^\d{1,5}$/.test(String(error?.code ?? '')) ? String(error.code) : '' };
    }
}
