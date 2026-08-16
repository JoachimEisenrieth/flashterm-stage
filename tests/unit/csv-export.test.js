import test from 'node:test';
import assert from 'node:assert/strict';

import {
    serializeCsv,
    termExportCsvColumns
} from '../../src/app/csv-export.js';

test('serializes terminology export rows in the stable column order', () => {
    const csv = serializeCsv([{
        term: 'alpha term',
        category: 'alternative',
        count: 2,
        preferredDesignation: 'beta term',
        termLanguage: 'de-DE',
        preferredDesignationLanguage: 'en-GB'
    }]);

    assert.equal(
        csv,
        '"term";"category";"count";"preferredDesignation";"termLanguage";"preferredDesignationLanguage"\r\n'
        + '"alpha term";"alternative";"2";"beta term";"de-DE";"en-GB"'
    );
});

test('escapes separators, quotes, line breaks, empty values, and spreadsheet formulas', () => {
    const csv = serializeCsv([{
        term: 'alpha; "term"',
        category: 'preferred\nterm',
        count: 1,
        preferredDesignation: '=TEST()',
        termLanguage: null
    }]);
    const lines = csv.split('\r\n');

    assert.equal(lines[0].split(';').length, termExportCsvColumns.length);
    assert.match(csv, /"alpha; ""term"""/);
    assert.match(csv, /"preferred\nterm"/);
    assert.match(csv, /"'=TEST\(\)"/);
    assert.match(csv, /"";""$/);
});

test('neutralizes every common spreadsheet formula prefix', () => {
    const columns = [{ key: 'value', label: 'value' }];
    const csv = serializeCsv(
        ['=TEST()', '+TEST()', '-TEST()', '@TEST()'].map(value => ({ value })),
        columns
    );

    assert.equal(
        csv,
        '"value"\r\n"\'=TEST()"\r\n"\'+TEST()"\r\n"\'-TEST()"\r\n"\'@TEST()"'
    );
});
