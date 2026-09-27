import assert from 'node:assert/strict';
import test from 'node:test';
import { bindOriginalContainerAssets } from '../../src/publishing/original-container-assets.js';

function publication() {
    return { concepts: ['A', 'B'].map(id => ({ id, languages: [{ imageFileName: 'stale.jpg' }] })) };
}
test('originals replace stale copies, clear removed images and ignore unpublished concepts', async () => {
    const value = publication();
    const assets = await bindOriginalContainerAssets(value, async () => [
        { fieldData: { ID: 'A', figure: 'PRIVATE-REFERENCE', figureFileName: 'same.png' } },
        { fieldData: { ID: 'B', figure: '', figureFileName: 'stale.jpg' } },
        { fieldData: { ID: 'NOT-PUBLISHED', figure: 'UNUSED', figureFileName: 'same.png' } }
    ]);
    assert.deepEqual([...assets], [['concept-A.png', 'PRIVATE-REFERENCE']]);
    assert.equal(value.concepts[0].languages[0].imageFileName, 'concept-A.png');
    assert.equal(value.concepts[1].languages[0].imageFileName, '');
    assert.ok(!JSON.stringify(value).includes('PRIVATE-REFERENCE'));
});
test('missing or unreadable originals fail instead of silently reusing stale copies', async () => {
    for (const records of [[], [{ fieldData: { ID: 'A' } }], [
        { fieldData: { ID: 'A', figure: 'PRIVATE', figureFileName: 'unsupported.pdf' } }
    ]]) await assert.rejects(bindOriginalContainerAssets(publication(), async () => records));
});
test('same source filename on two concepts does not merge different images', async () => {
    const value = publication();
    const assets = await bindOriginalContainerAssets(value, async () => ['A', 'B'].map(ID => ({
        fieldData: { ID, figure: `PRIVATE-${ID}`, figureFileName: 'same.png' }
    })));
    assert.equal(assets.size, 2);
    assert.notEqual(value.concepts[0].languages[0].imageFileName, value.concepts[1].languages[0].imageFileName);
});

test('terms without an original record are allowed only when every language is imageless', async () => {
    const value = { concepts: [{ id: 'NO-IMAGE', languages: [
        { imageFileName: '' }, { imageFileName: '' }
    ] }] };
    assert.equal((await bindOriginalContainerAssets(value, async () => [])).size, 0);
    assert.deepEqual(value.concepts[0].languages.map(language => language.imageFileName), ['', '']);
    value.concepts[0].languages[1].imageFileName = 'expected.png';
    await assert.rejects(bindOriginalContainerAssets(value, async () => []),
        /Original image record is missing/);
});
