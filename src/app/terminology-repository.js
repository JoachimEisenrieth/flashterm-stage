import {
    config,
    fetchAvailableLanguages,
    getFileMakerConceptDetails,
    getFileMakerTerms
} from '../../filemaker-api.js';
import { createFileMakerTerminologyRepository } from '../repositories/filemaker-terminology-repository.js';

export const terminologyRepository = createFileMakerTerminologyRepository({
    fetchLanguages: fetchAvailableLanguages,
    fetchTerms: getFileMakerTerms,
    fetchConcept: conceptId => getFileMakerConceptDetails(config, conceptId)
});
