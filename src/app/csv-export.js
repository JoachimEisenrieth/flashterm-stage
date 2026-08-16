export const termExportCsvColumns = [
    { key: 'term', label: 'term' },
    { key: 'category', label: 'category' },
    { key: 'count', label: 'count' },
    { key: 'preferredDesignation', label: 'preferredDesignation' },
    { key: 'termLanguage', label: 'termLanguage' },
    { key: 'preferredDesignationLanguage', label: 'preferredDesignationLanguage' }
];

function escapeCsvValue(value) {
    let text = String(value ?? '');

    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
    }

    return `"${text.replaceAll('"', '""')}"`;
}

export function serializeCsv(rows, columns = termExportCsvColumns) {
    const header = columns.map(column => escapeCsvValue(column.label)).join(';');
    const lines = rows.map(row => (
        columns.map(column => escapeCsvValue(row[column.key])).join(';')
    ));

    return [header, ...lines].join('\r\n');
}
