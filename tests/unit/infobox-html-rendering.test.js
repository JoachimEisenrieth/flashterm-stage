import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual legacy DOM rendering section without booting API/login code.
const source = readFileSync(new URL('../../flashterm.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('    // Infobox anzeigen'), source.indexOf('    // Links anzeigen'));
const helper = source.slice(source.indexOf('function createContentBlock('), source.indexOf('function renderLinkList('));

function render(sourceHTML, targetHTML) {
  const containers = Object.fromEntries(['infobox-container', 'infobox-container-target'].map(id => [id, {
    innerHTML: 'previous concept', classList: { add() {} }
  }]));
  const document = {
    getElementById: id => containers[id],
    createElement: () => ({ innerHTML: '', className: '', get outerHTML() {
      return `<div class="${this.className}">${this.innerHTML}</div>`;
    } })
  };
  // No window.markdownit is provided: HTML rendering must be independent of it.
  vm.runInNewContext(helper + section, { document, infoboxContentSource: sourceHTML, infoboxContentTarget: targetHTML });
  return containers;
}

test('preserves HTML and literal Markdown characters in both languages', () => {
  const sourceHTML = '<h2>Pilz</h2><p><em>Amanita</em> **literal** &amp; _text_</p><table><tr><td>Wert</td></tr></table>';
  const targetHTML = '<p>Mushroom</p><img src="images/test.png" alt="Test"><a href="https://example.invalid">Link</a>';
  const result = render(sourceHTML, targetHTML);
  assert.equal(result['infobox-container'].innerHTML, `<div class="content-block">${sourceHTML}</div>`);
  assert.equal(result['infobox-container-target'].innerHTML, `<div class="content-block">${targetHTML}</div>`);
});

test('clears previous source and target content when the next concept is empty', () => {
  const result = render('', '  ');
  assert.equal(result['infobox-container'].innerHTML, '');
  assert.equal(result['infobox-container-target'].innerHTML, '');
});
