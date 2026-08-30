export const TERMINOLOGY_PUBLICATION_SCHEMA_VERSION = 1;

export class TerminologyPublicationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TerminologyPublicationError';
    }
}

function fail(path, message) {
    throw new TerminologyPublicationError(`${path}: ${message}`);
}

function requireObject(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        fail(path, 'expected an object');
    }
    return value;
}

function requireArray(value, path) {
    if (!Array.isArray(value)) {
        fail(path, 'expected an array');
    }
    return value;
}

function requireNonEmptyString(value, path) {
    if (typeof value !== 'string' || value.trim() === '') {
        fail(path, 'expected a non-empty string');
    }
    return value;
}

function requireBoolean(value, path) {
    if (typeof value !== 'boolean') {
        fail(path, 'expected a boolean');
    }
    return value;
}

function requireUnique(values, path) {
    if (new Set(values).size !== values.length) {
        fail(path, 'values must be unique');
    }
}

function validateLanguage(language, index) {
    const path = `termbase.languages[${index}]`;
    requireObject(language, path);
    requireNonEmptyString(language.code, `${path}.code`);
    requireBoolean(language.isSource, `${path}.isSource`);

    const names = requireObject(language.names, `${path}.names`);
    const localizedNames = Object.entries(names);
    if (localizedNames.length === 0) {
        fail(`${path}.names`, 'expected at least one localized name');
    }
    for (const [guiLanguage, name] of localizedNames) {
        requireNonEmptyString(guiLanguage, `${path}.names key`);
        requireNonEmptyString(name, `${path}.names.${guiLanguage}`);
    }
}

function validateTerm(term, path, conceptIds) {
    requireObject(term, path);
    const conceptId = requireNonEmptyString(term.conceptID, `${path}.conceptID`);
    requireNonEmptyString(term.term, `${path}.term`);
    if (typeof term.weighting !== 'number' || !Number.isFinite(term.weighting)) {
        fail(`${path}.weighting`, 'expected a finite number');
    }
    if (!conceptIds.has(conceptId)) {
        fail(`${path}.conceptID`, 'references an unknown concept');
    }
}

function validateConceptLanguage(language, path, languageCodes) {
    requireObject(language, path);
    const code = requireNonEmptyString(language.code, `${path}.code`);
    if (!languageCodes.has(code)) {
        fail(`${path}.code`, 'references an unknown language');
    }

    const terms = requireArray(language.terms, `${path}.terms`);
    for (const [index, term] of terms.entries()) {
        const termPath = `${path}.terms[${index}]`;
        requireObject(term, termPath);
        requireNonEmptyString(term.term, `${termPath}.term`);
        if (typeof term.weighting !== 'number' || !Number.isFinite(term.weighting)) {
            fail(`${termPath}.weighting`, 'expected a finite number');
        }
    }

    const definition = requireObject(language.definition, `${path}.definition`);
    if (typeof definition.text !== 'string') {
        fail(`${path}.definition.text`, 'expected a string');
    }
    if (typeof definition.footnote !== 'string') {
        fail(`${path}.definition.footnote`, 'expected a string');
    }

    requireArray(language.contexts, `${path}.contexts`);
    requireArray(language.information, `${path}.information`);
    if (typeof language.infobox !== 'string') {
        fail(`${path}.infobox`, 'expected a string');
    }
    if (typeof language.imageFileName !== 'string') {
        fail(`${path}.imageFileName`, 'expected a string');
    }

    const links = requireArray(language.links, `${path}.links`);
    for (const [index, link] of links.entries()) {
        const linkPath = `${path}.links[${index}]`;
        requireObject(link, linkPath);
        requireNonEmptyString(link.label, `${linkPath}.label`);
        requireNonEmptyString(link.link, `${linkPath}.link`);
    }
}

export function validateTerminologyPublication(publication) {
    requireObject(publication, 'publication');
    if (publication.schemaVersion !== TERMINOLOGY_PUBLICATION_SCHEMA_VERSION) {
        fail(
            'publication.schemaVersion',
            `expected ${TERMINOLOGY_PUBLICATION_SCHEMA_VERSION}`
        );
    }

    const metadata = requireObject(publication.publication, 'publication.publication');
    requireNonEmptyString(metadata.id, 'publication.publication.id');
    requireNonEmptyString(metadata.tenantId, 'publication.publication.tenantId');
    requireNonEmptyString(metadata.termbaseId, 'publication.publication.termbaseId');
    requireNonEmptyString(metadata.revision, 'publication.publication.revision');
    const publishedAt = requireNonEmptyString(
        metadata.publishedAt,
        'publication.publication.publishedAt'
    );
    if (Number.isNaN(Date.parse(publishedAt))) {
        fail('publication.publication.publishedAt', 'expected an ISO-8601 timestamp');
    }

    const termbase = requireObject(publication.termbase, 'publication.termbase');
    requireNonEmptyString(termbase.name, 'publication.termbase.name');
    const sourceLanguage = requireNonEmptyString(
        termbase.sourceLanguage,
        'publication.termbase.sourceLanguage'
    );
    const assetBasePath = requireNonEmptyString(
        termbase.assetBasePath,
        'publication.termbase.assetBasePath'
    );
    if (!assetBasePath.startsWith('/')) {
        fail('publication.termbase.assetBasePath', 'expected a server-relative path');
    }

    const languages = requireArray(termbase.languages, 'publication.termbase.languages');
    if (languages.length === 0) {
        fail('publication.termbase.languages', 'expected at least one language');
    }
    languages.forEach(validateLanguage);
    const languageCodes = languages.map(language => language.code);
    requireUnique(languageCodes, 'publication.termbase.languages[].code');

    const sourceLanguages = languages.filter(language => language.isSource);
    if (sourceLanguages.length !== 1 || sourceLanguages[0].code !== sourceLanguage) {
        fail(
            'publication.termbase.sourceLanguage',
            'must identify the single language marked as source'
        );
    }

    const languageCodeSet = new Set(languageCodes);
    const concepts = requireArray(publication.concepts, 'publication.concepts');
    const conceptIds = concepts.map((concept, index) => {
        requireObject(concept, `publication.concepts[${index}]`);
        return requireNonEmptyString(concept.id, `publication.concepts[${index}].id`);
    });
    requireUnique(conceptIds, 'publication.concepts[].id');
    const conceptIdSet = new Set(conceptIds);

    for (const [conceptIndex, concept] of concepts.entries()) {
        const path = `publication.concepts[${conceptIndex}].languages`;
        const conceptLanguages = requireArray(concept.languages, path);
        conceptLanguages.forEach((language, languageIndex) => {
            validateConceptLanguage(language, `${path}[${languageIndex}]`, languageCodeSet);
        });
        requireUnique(
            conceptLanguages.map(language => language.code),
            `${path}[].code`
        );
    }

    const termsByLanguage = requireObject(
        publication.termsByLanguage,
        'publication.termsByLanguage'
    );
    requireUnique(Object.keys(termsByLanguage), 'publication.termsByLanguage keys');
    for (const code of languageCodes) {
        const terms = requireArray(
            termsByLanguage[code],
            `publication.termsByLanguage.${code}`
        );
        terms.forEach((term, index) => {
            validateTerm(term, `publication.termsByLanguage.${code}[${index}]`, conceptIdSet);
        });
    }
    for (const code of Object.keys(termsByLanguage)) {
        if (!languageCodeSet.has(code)) {
            fail(`publication.termsByLanguage.${code}`, 'uses an unknown language');
        }
    }

    return publication;
}
