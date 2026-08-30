import { config } from '../../config.js';
import { createFileMakerTerminologyRepository } from '../repositories/filemaker-terminology-repository.js';
import { createStageTerminologyRepository } from '../repositories/stage-terminology-repository.js';
import {
    resolvePublishedTermbaseConfig,
    usesPublishedTerminology
} from './terminology-source.js';

let initializeSource = async () => {};
let terminologyRepository;
const effectiveTerminologyConfig = resolvePublishedTermbaseConfig(
    config,
    globalThis.location?.search ?? ''
);

if (usesPublishedTerminology(effectiveTerminologyConfig)) {
    terminologyRepository = createStageTerminologyRepository({
        termbaseId: effectiveTerminologyConfig.termbaseId
    });
} else {
    const {
        fetchAvailableLanguages,
        getFileMakerConceptDetails,
        getFileMakerTerms,
        loginToFileMaker
    } = await import('../../filemaker-api.js');
    terminologyRepository = createFileMakerTerminologyRepository({
        fetchLanguages: fetchAvailableLanguages,
        fetchTerms: getFileMakerTerms,
        fetchConcept: conceptId => getFileMakerConceptDetails(config, conceptId)
    });
    initializeSource = loginToFileMaker;
}

export { effectiveTerminologyConfig, terminologyRepository };

export async function getAvailableTermbases() {
    if (!usesPublishedTerminology(effectiveTerminologyConfig)) {
        return [];
    }
    return terminologyRepository.getTermbases();
}

export async function initializeTerminologySource() {
    await initializeSource();
}
