import {
    config,
    fetchAvailableLanguages,
    getFileMakerConceptDetails,
    getFileMakerTerms
} from '../../filemaker-api-121-005.js';
import { createFileMakerTerminologyRepository } from '../repositories/filemaker-terminology-repository.js';

export const terminologyRepository = createFileMakerTerminologyRepository({
    fetchLanguages: fetchAvailableLanguages,
    fetchTerms: getFileMakerTerms,
    fetchConcept: conceptId => getFileMakerConceptDetails(config, conceptId)
});
