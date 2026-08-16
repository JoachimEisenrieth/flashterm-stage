export function getSourceLanguage(languages) {
    if (!Array.isArray(languages)) {
        return null;
    }

    const sourceLanguages = languages.filter(language => language?.isSource === true);
    return sourceLanguages.length === 1 ? sourceLanguages[0] : null;
}
