import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseTermList } from '../../src/domain/terminology.js';

const fixtureUrl = new URL('../fixtures/filemaker-term-list.json', import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
const fixtureData = fixture.response.data;

test('transforms a FileMaker termlist entry into terminology records', () => {
  assert.deepEqual(parseTermList(fixtureData), [
    { conceptID: 'TEST-001', term: 'alpha term', weighting: 2 },
    { conceptID: 'TEST-001', term: 'beta term', weighting: 1 },
    { conceptID: 'TEST-002', term: 'gamma term', weighting: 0 }
  ]);
});

test('flattens multiple FileMaker termlist entries', () => {
  const multipleEntries = [
    ...fixtureData,
    {
      fieldData: {
        termlist: '[["TEST-003","delta term",2]]'
      }
    }
  ];

  assert.deepEqual(parseTermList(multipleEntries), [
    { conceptID: 'TEST-001', term: 'alpha term', weighting: 2 },
    { conceptID: 'TEST-001', term: 'beta term', weighting: 1 },
    { conceptID: 'TEST-002', term: 'gamma term', weighting: 0 },
    { conceptID: 'TEST-003', term: 'delta term', weighting: 2 }
  ]);
});

test('preserves the existing weighting values', () => {
  assert.deepEqual(parseTermList(fixtureData).map(({ weighting }) => weighting), [2, 1, 0]);
});

test('returns an empty array for an empty input array', () => {
  assert.deepEqual(parseTermList([]), []);
});

test('returns no record when termlist is missing or empty', () => {
  assert.deepEqual(parseTermList([
    { fieldData: {} },
    { fieldData: { termlist: '' } }
  ]), []);
});

test('throws the existing JSON.parse error for invalid JSON', () => {
  assert.throws(
    () => parseTermList([{ fieldData: { termlist: 'invalid JSON' } }]),
    SyntaxError
  );
});

test('aborts a multi-record response completely when one termlist contains invalid JSON', () => {
  const unchangedResult = Symbol('unchanged result');
  let result = unchangedResult;
  const records = [
    { fieldData: { termlist: '[["TEST-VALID-001","alpha term",2]]' } },
    { fieldData: { termlist: 'invalid JSON' } },
    { fieldData: { termlist: '[["TEST-VALID-002","beta term",1]]' } }
  ];

  assert.throws(() => {
    result = parseTermList(records);
  }, SyntaxError);
  assert.equal(result, unchangedResult);
});

test('throws a TypeError when fieldData is missing', () => {
  assert.throws(() => parseTermList([{}]), TypeError);
});

test('keeps undefined fields from an incomplete term array', () => {
  assert.deepEqual(
    parseTermList([{ fieldData: { termlist: '[["TEST-004"]]' } }]),
    [{ conceptID: 'TEST-004', term: undefined, weighting: undefined }]
  );
});

test('throws for null, undefined, and non-array inputs', () => {
  assert.throws(() => parseTermList(null), TypeError);
  assert.throws(() => parseTermList(undefined), TypeError);
  assert.throws(() => parseTermList({}), TypeError);
});
