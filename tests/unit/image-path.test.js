import assert from 'node:assert/strict';
import test from 'node:test';

import { getImageBasePath } from '../../src/app/image-path.js';

test('derives the image base path from the FileMaker server and database', () => {
  assert.equal(
    getImageBasePath('https://filemaker.test.example', 'TEST_DATABASE'),
    'https://filemaker.test.example/public/RC_Data_FMS/TEST_DATABASE/Files/Images/'
  );
});

test('uses the local origin when the development browser server is relative', () => {
  assert.equal(
    getImageBasePath('', 'TEST_DATABASE', 'http://127.0.0.1:8000'),
    'http://127.0.0.1:8000/public/RC_Data_FMS/TEST_DATABASE/Files/Images/'
  );
});

test('encodes database names as a URL path segment', () => {
  assert.equal(
    getImageBasePath('https://filemaker.test.example', 'Terminology / Stage'),
    'https://filemaker.test.example/public/RC_Data_FMS/Terminology%20%2F%20Stage/Files/Images/'
  );
});

test('returns an empty path when the server origin or database is missing', () => {
  assert.equal(getImageBasePath('', 'TEST_DATABASE'), '');
  assert.equal(getImageBasePath('https://filemaker.test.example', ''), '');
});
