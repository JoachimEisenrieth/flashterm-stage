function labels(language) {
    return language?.startsWith('de')
        ? { id: 'Konzept-ID', copy: 'Kopieren', copied: 'Kopiert', failed: 'Bitte ID markieren und kopieren.' }
        : { id: 'Concept ID', copy: 'Copy', copied: 'Copied', failed: 'Please select and copy the ID.' };
}

export function duplicatePairKeys(records) {
    const groups = new Map();
    for (const record of records) {
        const key = JSON.stringify([record.term, record.preferred, record.rating]);
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key).add(String(record.id));
    }
    return new Set([...groups].filter(([, ids]) => ids.size > 1).map(([key]) => key));
}

export function decorateConceptResults(container, language) {
    const text = labels(language);
    const rows = [...container.querySelectorAll('tbody tr')]
        .filter(row => row.querySelector('.term-clickable'));
    const records = rows.map(row => ({
        term: row.querySelector('.term-result-label .term-clickable').textContent.trim(),
        preferred: row.querySelector('.preferred-term-label')?.textContent.trim() ?? '',
        rating: row.querySelector('.term-rating')?.getAttribute('aria-label') ?? '',
        id: row.querySelector('.term-clickable').dataset.conceptId
    }));
    const duplicates = duplicatePairKeys(records);
    rows.forEach((row, index) => {
        const record = records[index];
        if (duplicates.has(JSON.stringify([record.term, record.preferred, record.rating]))) {
            const identity = document.createElement('small');
            identity.className = 'concept-id-visible';
            identity.textContent = `${text.id}: ${record.id}`;
            row.querySelector('.term-result-label').append(identity);
        }
        row.querySelectorAll('.term-clickable').forEach((button, buttonIndex) => {
            const tooltip = document.createElement('span');
            tooltip.className = 'concept-id-tooltip';
            tooltip.id = `concept-tooltip-${index}-${buttonIndex}`;
            tooltip.setAttribute('role', 'tooltip');
            tooltip.textContent = `${text.id}: ${record.id}`;
            button.dataset.termLabel = button.textContent;
            button.setAttribute('aria-label', button.textContent.trim());
            button.setAttribute('aria-describedby', tooltip.id);
            button.classList.add('has-concept-tooltip');
            button.append(tooltip);
            const positionTooltip = () => {
                const rect = button.getBoundingClientRect();
                tooltip.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 210))}px`;
                tooltip.style.top = `${rect.top >= 40 ? rect.top - 36 : rect.bottom + 4}px`;
            };
            button.addEventListener('mouseenter', positionTooltip);
            button.addEventListener('focus', positionTooltip);
            button.addEventListener('keydown', event => {
                if (event.key === 'Escape') button.classList.add('tooltip-dismissed');
            });
            for (const event of ['blur', 'mouseleave']) {
                button.addEventListener(event, () => button.classList.remove('tooltip-dismissed'));
            }
        });
    });
}

export function renderConceptIdentity(title, conceptId, language) {
    document.getElementById('concept-identity')?.remove();
    const text = labels(language);
    const identity = document.createElement('div');
    identity.id = 'concept-identity';
    identity.className = 'concept-identity';
    const label = document.createElement('label');
    label.textContent = `${text.id}: `;
    const value = document.createElement('input');
    value.value = String(conceptId);
    value.readOnly = true;
    value.size = Math.max(6, value.value.length);
    label.append(value);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = text.copy;
    copy.setAttribute('aria-label', `${text.id}: ${text.copy}`);
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(value.value);
            status.textContent = text.copied;
        } catch {
            value.focus();
            value.select();
            status.textContent = text.failed;
        }
    });
    identity.append(label, copy, status);
    title.insertAdjacentElement('afterend', identity);
}
