import assert from 'node:assert/strict';
import test from 'node:test';
import { getSourceLanguage, loadLanguagePair } from '../../src/app/source-language.js';
import { mapLanguages } from '../../src/domain/terminology.js';
import { buildTerminologyPublication } from '../../src/publishing/build-terminology-publication.js';
import { createPublishedTerminologyRepository } from '../../src/repositories/published-terminology-repository.js';

const records = ['de-DE', 'en-US'].map(code => ({fieldData: {
    languageCode: code, language: code, source: code, defaultSource: 'de-DE'
}}));
const languages = mapLanguages(records);
const options = {
    tenantId: 'test', termbaseId: 'test', termbaseName: 'Test', publicationId: 'test',
    revision: '1', publishedAt: '2026-09-11T00:00:00Z'
};
const repository = {
    async getLanguages() { return languages; }, async getTerms() { return []; }
};

test('both master markers survive API mapping, default and explicit selection differ', () => {
    assert.deepEqual(languages.map(language => language.isSource), [true, true]);
    assert.equal(getSourceLanguage(languages).code, 'de-DE');
    assert.equal(getSourceLanguage(languages, 'en-US').code, 'en-US');
    assert.equal(getSourceLanguage(languages, 'missing').code, 'de-DE');
});
test('ambiguous defaults and defaults on target languages are rejected', () => {
    assert.equal(getSourceLanguage(languages.map(language => ({...language, isDefaultSource: true}))), null);
    assert.equal(getSourceLanguage([{code: 'de-DE', isSource: false, isDefaultSource: true}]), null);
    assert.equal(getSourceLanguage(languages.map(language => ({...language, isDefaultSource: false}))), null);
});
test('two masters and default survive publication and repository round trip', async () => {
    const publication = await buildTerminologyPublication({...options, repository});
    assert.equal(publication.termbase.sourceLanguage, 'de-DE');
    const published = createPublishedTerminologyRepository({loadPublication: () => publication});
    const loaded = await published.getLanguages('de-DE');
    assert.equal(getSourceLanguage(loaded).code, 'de-DE');
    assert.equal(getSourceLanguage(loaded, 'en-US').code, 'en-US');
});
test('publication rejects conflicting default markers between GUI locales', async () => {
    await assert.rejects(buildTerminologyPublication({...options, repository: {...repository,
        async getLanguages(gui) { return languages.map(language => ({...language,
            isDefaultSource: language.code === (gui === 'de-DE' ? 'de-DE' : 'en-US')})); }
    }}), /marker differs/);
});
test('publication rejects multiple masters without default before loading terms', async () => {
    await assert.rejects(buildTerminologyPublication({...options, repository: {...repository,
        async getLanguages() { return languages.map(language => ({...language, isDefaultSource: false})); },
        async getTerms() { assert.fail('must stop before loading terms'); }
    }}), /default source/);
});
test('switch loads the selected master and target before returning either list', async () => {
    const calls = [];
    const pair = await loadLanguagePair({async getTerms(code) { calls.push(code); return [code]; }},
        languages, 'en-US', 'de-DE');
    assert.deepEqual(calls, ['en-US', 'de-DE']);
    assert.deepEqual(pair, {sourceTerms: ['en-US'], targetTerms: ['de-DE']});
});
test('switch rejects unavailable languages and failed loads', async () => {
    await assert.rejects(loadLanguagePair(repository, languages, 'de-DE', 'de-DE'), /Invalid/);
    await assert.rejects(loadLanguagePair({async getTerms(code) {
        if (code === 'de-DE') throw new Error('offline'); return [];
    }}, languages, 'en-US', 'de-DE'), /offline/);
});

// Exercise the actual browser switching function with minimal DOM/repository doubles.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const browserSource = readFileSync(new URL('../../flashterm.js', import.meta.url), 'utf8');
const switchCode = browserSource.slice(browserSource.indexOf('async function switchLanguages('),
    browserSource.indexOf('// ====================================================================================================\n// Zielsprache umschalten', browserSource.indexOf('async function switchLanguages(')));
function switchingContext(repository) {
    const elements = { 'wiki-container': {style: {display: 'block'}} };
    const context = vm.createContext({
        languageChangePending: false, modeLanguages: {wiki: null, review: null},
        loadLanguagePair, terminologyRepository: repository, cachedLanguageOptions: languages,
        sourceLanguage: 'de-DE', targetLanguage: 'en-US', sourceTermList: ['old source'],
        targetTermList: ['old target'], hasExplicitSourceSelection: false,
        sessionStorage: {setItem() {}}, showLoadingIndicator() {}, hideLoadingIndicator() {},
        setTitle() {}, updateModeText() {}, updateURLWithLanguages() {}, showSuggestions() {},
        searchField: {value: ''}, getCurrentMode() {return 'wiki';},
        selectedConceptID: '1', selectedTerm: 'Alt', savedText: '',
        document: {getElementById(id) {return elements[id];}},
        startScreen: {classList: {remove() {}}},
        async showWiki(term, id, source, target) {context.shown = {term, id, source, target};},
        termMining() {context.mined = true;}
    });
    vm.runInContext(switchCode, context);
    return context;
}
test('browser switch reloads terms and the selected concept in the new master', async () => {
    const context = switchingContext({async getTerms(code) {
        return [{conceptID: 1, term: code === 'en-US' ? 'New' : 'Neu', weighting: 2}];
    }});
    await context.switchLanguages('en-US', 'de-DE');
    assert.equal(context.sourceLanguage, 'en-US');
    assert.equal(context.sourceTermList[0].term, 'New');
    assert.equal(context.shown.term, 'New');
    assert.equal(context.shown.source, 'en-US');
    assert.equal(context.hasExplicitSourceSelection, true);
});
test('browser switch preserves both previous lists and languages on load failure', async () => {
    const context = switchingContext({async getTerms() {throw new Error('offline');}});
    await assert.rejects(context.switchLanguages('en-US', 'de-DE'), /offline/);
    assert.equal(context.sourceLanguage, 'de-DE');
    assert.equal(context.targetLanguage, 'en-US');
    assert.equal(context.sourceTermList[0], 'old source');
    assert.equal(context.targetTermList[0], 'old target');
});

const reviewLanguages = [...languages, {code: 'fr-FR', name: 'Français', isSource: false}];
test('non-master review language is allowed in Inspector without a target request', async () => {
    const calls = [];
    const pair = await loadLanguagePair({async getTerms(code) {calls.push(code); return [{term: 'terme'}];}},
        reviewLanguages, 'fr-FR', '', 'inspector');
    assert.deepEqual(calls, ['fr-FR']);
    assert.equal(pair.sourceTerms[0].term, 'terme');
    assert.deepEqual(pair.targetTerms, []);
});
test('Translator accepts non-master review language but requires a different target', async () => {
    const repo = {async getTerms(code) {return [{term: code}];}};
    const pair = await loadLanguagePair(repo, reviewLanguages, 'fr-FR', 'de-DE', 'translator');
    assert.equal(pair.targetTerms[0].term, 'de-DE');
    await assert.rejects(loadLanguagePair(repo, reviewLanguages, 'fr-FR', 'fr-FR', 'translator'), /Invalid/);
    await assert.rejects(loadLanguagePair(repo, reviewLanguages, 'fr-FR', 'de-DE', 'wiki'), /Invalid/);
});
test('empty review term list is rejected', async () => {
    await assert.rejects(loadLanguagePair(repository, reviewLanguages, 'fr-FR', '', 'inspector'), /No terms/);
});
test('changing review language preserves the independent WIKI selection', async () => {
    const context = switchingContext({async getTerms(code) {return [{term: code, weighting: 2}];}});
    context.cachedLanguageOptions = reviewLanguages;
    context.modeLanguages.wiki = {source: 'de-DE', target: 'en-US'};
    context.getCurrentMode = () => 'inspector';
    await context.switchLanguages('fr-FR', 'en-US', 'inspector');
    assert.equal(context.sourceLanguage, 'fr-FR');
    assert.equal(context.modeLanguages.review.source, 'fr-FR');
    assert.equal(context.modeLanguages.wiki.source, 'de-DE');
    assert.equal(context.modeLanguages.wiki.target, 'en-US');
});

test('search waits for WIKI language loading before producing suggestions', async () => {
    const code = browserSource.slice(browserSource.indexOf('async function handleSearchInput('),
        browserSource.indexOf('function handleKeyPressEvent('));
    const calls = [];
    const context = vm.createContext({
        getCurrentMode: () => 'inspector', sourceTermList: [],
        async switchMode(mode) { await Promise.resolve(); calls.push(mode); return true; },
        showSuggestions() { calls.push('suggestions'); }, toggleClearButton() {},
        handleError(message, error) { throw error; }
    });
    vm.runInContext(code, context);
    await context.handleSearchInput({target: {value: 'Holunder'}});
    assert.deepEqual(calls, ['wiki', 'suggestions']);
});

test('dedicated review input analyzes without changing mode or language', () => {
    const code = browserSource.slice(browserSource.indexOf('function analyzeMiningInput('),
        browserSource.indexOf('function clearMiningInput('));
    const calls = [];
    const context = vm.createContext({
        languageChangePending: false, miningTextInput: {value: 'texte français'}, savedText: '',
        inspectorStartScreen: null, translatorStartScreen: null,
        termMining() { calls.push('analyze'); }, updateMiningInputState() {}
    });
    vm.runInContext(code, context);
    context.analyzeMiningInput();
    assert.equal(context.savedText, 'texte français');
    assert.deepEqual(calls, ['analyze']);
    context.languageChangePending = true;
    context.analyzeMiningInput();
    assert.deepEqual(calls, ['analyze']);
});
