function applyLanguageToViewModel(viewModel, language, type) {
    const isSource = type === 'source';
    const synonyms = isSource ? viewModel.synonymsSource : viewModel.synonymsTarget;

    if (language.definition.text) {
        if (isSource) {
            viewModel.definitionSource = language.definition.text;
        } else {
            viewModel.definitionTarget = language.definition.text;
        }
    }

    if (language.definition.footnote) {
        if (isSource) {
            viewModel.footnoteSource.push(language.definition.footnote);
        } else {
            viewModel.footnoteTarget.push(language.definition.footnote);
        }
    }

    language.terms.forEach(term => {
        if (term.weighting === 1) {
            synonyms.alternative.push(term.term);
        } else if (term.weighting === 0) {
            synonyms.rejected.push(term.term);
        }
    });

    if (isSource) {
        viewModel.contextDataSource.push(...language.contexts);
        viewModel.infoDataSource.push(...language.information);
        viewModel.linksSource.push(...language.links);
    } else {
        viewModel.contextDataTarget.push(...language.contexts);
        viewModel.infoDataTarget.push(...language.information);
        viewModel.linksTarget.push(...language.links);
    }
}

export function createConceptViewModel(concept, sourceLanguage, targetLanguage) {
    const viewModel = {
        preferredTermSource: '–',
        preferredTermTarget: '–',
        synonymsSource: { alternative: [], rejected: [] },
        synonymsTarget: { alternative: [], rejected: [] },
        definitionSource: '',
        definitionTarget: '',
        footnoteSource: [],
        footnoteTarget: [],
        contextDataSource: [],
        contextDataTarget: [],
        infoDataSource: [],
        infoDataTarget: [],
        infoboxContentSource: '',
        infoboxContentTarget: '',
        linksSource: [],
        linksTarget: [],
        fileName: ''
    };

    concept.languages.forEach(language => {
        if (language.code === sourceLanguage) {
            applyLanguageToViewModel(viewModel, language, 'source');
            viewModel.preferredTermSource = language.terms.find(term => term.weighting === 2)?.term || 'Keine Übersetzung';
            viewModel.infoboxContentSource = language.infobox || '';
            viewModel.fileName = language.imageFileName || '';
        }

        if (targetLanguage && language.code === targetLanguage) {
            applyLanguageToViewModel(viewModel, language, 'target');
            viewModel.preferredTermTarget = language.terms.find(term => term.weighting === 2)?.term || 'Keine Übersetzung';
            viewModel.infoboxContentTarget = language.infobox || '';
        }
    });

    return viewModel;
}
