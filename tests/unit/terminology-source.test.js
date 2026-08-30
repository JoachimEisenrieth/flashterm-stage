import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getTermbaseSelectionUrl,
    getTerminologyCacheKey,
    getTerminologyImageBasePath,
    resolvePublishedTermbaseConfig,
    usesPublishedTerminology
} from '../../src/app/terminology-source.js';

test('recognizes only the explicit published terminology source', () => {
    assert.equal(usesPublishedTerminology({ dataSource: 'published' }), true);
    assert.equal(usesPublishedTerminology({ dataSource: 'filemaker' }), false);
    assert.equal(usesPublishedTerminology({}), false);
});

test('resolves a published termbase from a shareable URL without changing FileMaker config', () => {
    const publishedConfig = { dataSource: 'published', termbaseId: 'DEFAULT' };
    assert.deepEqual(
        resolvePublishedTermbaseConfig(publishedConfig, '?termbase=SECOND'),
        { dataSource: 'published', termbaseId: 'SECOND' }
    );
    assert.equal(
        resolvePublishedTermbaseConfig({ dataSource: 'filemaker' }, '?termbase=SECOND').dataSource,
        'filemaker'
    );
});

test('builds a termbase URL and clears languages inherited from another collection', () => {
    assert.equal(
        getTermbaseSelectionUrl(
            'http://127.0.0.1:8100/?source=de-DE&target=en-GB&view=wiki',
            'SECOND TERMBASE'
        ),
        'http://127.0.0.1:8100/?view=wiki&termbase=SECOND+TERMBASE'
    );
});

test('separates published termbase caches from FileMaker database caches', () => {
    assert.equal(
        getTerminologyCacheKey({
            dataSource: 'published',
            termbaseId: 'TEST-TERMBASE',
            publicationId: 'TEST-PUBLICATION-001'
        }),
        'languageData:termbase:TEST-TERMBASE:publication:TEST-PUBLICATION-001'
    );
    assert.equal(
        getTerminologyCacheKey({ dataSource: 'published', termbaseId: 'TEST-TERMBASE' }),
        'languageData:termbase:TEST-TERMBASE'
    );
    assert.equal(
        getTerminologyCacheKey({ dataSource: 'filemaker', database: 'TEST-DATABASE' }),
        'languageData:TEST-DATABASE'
    );
});

test('builds the published asset path without a FileMaker server or database name', () => {
    assert.equal(
        getTerminologyImageBasePath(
            { dataSource: 'published', termbaseId: 'Terminology Stage' },
            'http://127.0.0.1:8100'
        ),
        'http://127.0.0.1:8100/api/termbases/Terminology%20Stage/assets/'
    );
});

test('preserves the existing FileMaker asset path', () => {
    assert.equal(
        getTerminologyImageBasePath({
            dataSource: 'filemaker',
            server: 'https://filemaker.test.example',
            database: 'TEST-DATABASE'
        }),
        'https://filemaker.test.example/public/RC_Data_FMS/TEST-DATABASE/Files/Images/'
    );
});
