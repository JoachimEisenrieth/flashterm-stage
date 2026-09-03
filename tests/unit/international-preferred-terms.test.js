import assert from 'node:assert/strict';
import test from 'node:test';

import { createInternationalPreferredTerms } from '../../src/app/international-preferred-terms.js';

test('lists every configured language and leaves missing preferred terms empty', () => {
    const languages = [
        { code: 'pt-PT', name: 'Português' },
        { code: 'en-GB', name: 'English' },
        { code: 'de-DE', name: 'Deutsch' }
    ];
    const concept = {
        languages: [
            {
                code: 'de-DE',
                terms: [
                    { term: 'Vernebler', weighting: 2 },
                    { term: 'Inhalationsgerät', weighting: 1 }
                ]
            },
            {
                code: 'en-GB',
                terms: [{ term: 'nebuliser', weighting: 2 }]
            }
        ]
    };

    assert.deepEqual(createInternationalPreferredTerms(concept, languages), [
        { code: 'de-DE', name: 'Deutsch', preferredTerm: 'Vernebler' },
        { code: 'en-GB', name: 'English', preferredTerm: 'nebuliser' },
        { code: 'pt-PT', name: 'Português', preferredTerm: '' }
    ]);
});

test('treats blank preferred terms as missing', () => {
    const rows = createInternationalPreferredTerms(
        {
            languages: [{
                code: 'de-DE',
                terms: [{ term: '   ', weighting: 2 }]
            }]
        },
        [{ code: 'de-DE', name: '' }]
    );

    assert.deepEqual(rows, [
        { code: 'de-DE', name: 'de-DE', preferredTerm: '' }
    ]);
});
