import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLanguageCache, serializeLanguageCache } from '../../src/app/language-cache.js';

const languages = [
  { code: 'xx-XX', name: 'Alpha language', isSource: true },
  { code: 'yy-YY', name: 'Beta language', isSource: false }
];

test('serializes languages using the exact V4 cache envelope', () => {
  assert.deepEqual(JSON.parse(serializeLanguageCache('ui-XX', languages)), {
    version: 5,
    guiLanguage: 'ui-XX',
    languages
  });
});

test('returns languages from a valid V4 cache for the current GUI locale', () => {
  const serialized = serializeLanguageCache('ui-XX', languages);

  assert.deepEqual(parseLanguageCache(serialized, 'ui-XX'), languages);
});

test('rejects a V4 cache for a different GUI locale', () => {
  const serialized = serializeLanguageCache('ui-XX', languages);

  assert.equal(parseLanguageCache(serialized, 'ui-YY'), null);
});

test('rejects the legacy FileMaker record array', () => {
  const serialized = JSON.stringify([
    {
      fieldData: {
        languageCode: 'xx-XX',
        language: 'Alpha language'
      }
    }
  ]);

  assert.equal(parseLanguageCache(serialized, 'ui-XX'), null);
});

test('treats damaged JSON and null as cache misses', () => {
  assert.equal(parseLanguageCache('invalid JSON', 'ui-XX'), null);
  assert.equal(parseLanguageCache('null', 'ui-XX'), null);
  assert.equal(parseLanguageCache(null, 'ui-XX'), null);
});

test('rejects missing versions and non-array languages', () => {
  assert.equal(parseLanguageCache(JSON.stringify({
    guiLanguage: 'ui-XX',
    languages
  }), 'ui-XX'), null);

  assert.equal(parseLanguageCache(JSON.stringify({
    version: 5,
    guiLanguage: 'ui-XX',
    languages: {}
  }), 'ui-XX'), null);
});

test('rejects the previous V3 cache envelope', () => {
  assert.equal(parseLanguageCache(JSON.stringify({
    version: 3,
    guiLanguage: 'ui-XX',
    languages: languages.map(({ code, name }) => ({ code, name }))
  }), 'ui-XX'), null);
});

test('accepts an empty languages array in an otherwise valid V4 cache', () => {
  const serialized = serializeLanguageCache('ui-XX', []);

  assert.deepEqual(parseLanguageCache(serialized, 'ui-XX'), []);
});
