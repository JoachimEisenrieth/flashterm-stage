import assert from 'node:assert/strict';
import test from 'node:test';

import { getSourceLanguage } from '../../src/app/source-language.js';

test('returns the single language marked as source', () => {
  const languages = [
    { code: 'xx-XX', name: 'Alpha language', isSource: true },
    { code: 'yy-YY', name: 'Beta language', isSource: false }
  ];

  assert.equal(getSourceLanguage(languages), languages[0]);
});

test('returns null when no language is marked as source', () => {
  assert.equal(getSourceLanguage([
    { code: 'xx-XX', name: 'Alpha language', isSource: false }
  ]), null);
});

test('returns null when multiple languages are marked as source', () => {
  assert.equal(getSourceLanguage([
    { code: 'xx-XX', name: 'Alpha language', isSource: true },
    { code: 'yy-YY', name: 'Beta language', isSource: true }
  ]), null);
});

test('returns null for non-array inputs', () => {
  assert.equal(getSourceLanguage(null), null);
  assert.equal(getSourceLanguage({}), null);
});
