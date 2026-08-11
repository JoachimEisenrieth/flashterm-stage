import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fixtureFiles = [
  '../fixtures/filemaker-term-list.json',
  '../fixtures/filemaker-concept-response.json'
];

test('node:test loads the anonymized FileMaker fixtures as valid data', async () => {
  for (const fixtureFile of fixtureFiles) {
    const fixtureUrl = new URL(fixtureFile, import.meta.url);
    const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));

    assert.ok(fixture.response);
    assert.ok(Array.isArray(fixture.response.data));
    assert.ok(fixture.response.data.length > 0);
    assert.ok(fixture.response.data.every(({ fieldData }) => fieldData));
  }
});
