import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFileMakerSetup, REQUIRED_LAYOUT_FIELDS } from '../../src/deployment/filemaker-setup.js';
const clientFactory = () => ({ withSession: task => task({ describeLayout: async layout => REQUIRED_LAYOUT_FIELDS[layout].map(name => ({ name })) }) });
const configuration = { validateExport: true, server: 'https://filemaker.example.test', database: 'TEST', username: 'READ', password: 'PRIVATE-VALUE', tenantId: 'TEST', termbaseId: 'TEST', termbaseName: 'Test' };
test('container setup requires imageAPI and passes the image mode to the read check', async () => {
    const checked = [];
    const result = await checkFileMakerSetup({ ...configuration, imageSource: 'container' }, {
        clientFactory: () => ({ withSession: task => task({ describeLayout: async layout => {
            checked.push(layout);
            return (layout === 'imageAPI' ? ['ID', 'figure', 'figureFileName'] : REQUIRED_LAYOUT_FIELDS[layout]).map(name => ({ name }));
        } }) }),
        publisher: async ({ environment }) => {
            assert.equal(environment.FLASHTERM_FILEMAKER_IMAGE_SOURCE, 'container');
            return { languages: 1, concepts: 1, terms: 1, assets: 1 };
        }
    });
    assert.equal(result.ok, true);
    assert.ok(checked.includes('imageAPI'));
});
test('setup validates through dry-run and does not claim FileMaker pairing', async () => {
    const result = await checkFileMakerSetup(configuration, { clientFactory, publisher: async options => {
        assert.deepEqual(options.args, ['--dry-run']);
        assert.equal(options.environment.FLASHTERM_PUBLISH_TOKEN, undefined);
        assert.equal(options.environment.FLASHTERM_FILEMAKER_PASSWORD, configuration.password);
        return { languages: 2, concepts: 1, terms: 2, assets: 1 };
    } });
    assert.equal(result.ok, true);
    assert.equal(result.assets, 1);
    assert.equal(result.fileMakerPairing, 'not-verified');
    assert(!JSON.stringify(result).includes(configuration.password));
});
test('setup rejects unsafe FileMaker addresses before network access', async () => {
    for (const server of ['http://server.test', 'https://user:secret@server.test', 'https://server.test/path', 'https://server.test?secret=x']) {
        const result = await checkFileMakerSetup({ ...configuration, server }, { clientFactory, publisher: () => { assert.fail('Must not connect'); } });
        assert.equal(result.ok, false);
    }
});
test('setup failures cannot disclose upstream secrets or responses', async () => {
    const result = await checkFileMakerSetup(configuration, { clientFactory, publisher: async () => { throw Object.assign(Error('PRIVATE-VALUE'), { code: 'PRIVATE-VALUE', status: 401 }); } });
    assert.deepEqual(result, { ok: false, code: 'FILEMAKER_READ_CHECK_FAILED', httpStatus: 401, fileMakerCode: '' });
});

test('empty first installation can validate layouts without requiring an earlier export', async () => {
    const result = await checkFileMakerSetup({ ...configuration, validateExport: false }, { clientFactory,
        publisher: () => assert.fail('Must not require existing export') });
    assert.equal(result.ok, true);
    assert.equal(result.exportedData, 'not-verified');
});
test('missing required API fields block configuration before export or publication', async () => {
    const result = await checkFileMakerSetup(configuration, {
        clientFactory: () => ({ withSession: task => task({ describeLayout: async () => [] }) }),
        publisher: () => assert.fail('Must not publish')
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'MISSING_API_FIELDS');
    assert(result.missingFields.includes('definitionAPI.fileName'));
});
