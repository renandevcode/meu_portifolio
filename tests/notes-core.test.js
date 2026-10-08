'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../notes-core.js');
const root = new URL('https://example.com/portfolio/notes/');
const note = { slug: 'uma-nota', title: 'Visão computacional', file: 'uma-nota.md', category: 'Visão', description: 'Imagens' };

test('validates entries and rejects duplicates, wrong types and invalid dates', () => {
  assert.equal(core.validateIndex([note], root)[0].status, 'draft');
  for (const data of [null, [note, note], [{ ...note, description: {} }], [{ ...note, title: '' }], [{ ...note, status: 'oops' }], [{ ...note, status: ['published'] }], [{ ...note, updated: '2026-02-30' }]]) {
    assert.throws(() => core.validateIndex(data, root));
  }
  assert(core.validDate('2024-02-29'));
  assert(!core.validDate('2026-02-29'));
});
test('keeps note files within notes/, including encoded traversal', () => {
  for (const file of ['../secret.md', '%2e%2e/secret.md', 'https://other.test/a.md', 'a.md?download=1', 'a.md#section', 'dir%2f..%2fsecret.md']) {
    assert.throws(() => core.validateIndex([{ ...note, file }], root));
  }
  assert.equal(core.validateIndex([{ ...note, file: 'subpasta/nota.md' }], root).length, 1);
});
test('search ignores accents and includes category and description', () => {
  assert(core.matchesQuery(note, 'visao'));
  assert(core.matchesQuery(note, 'IMAGENS'));
  assert(!core.matchesQuery(note, 'criptografia'));
});
test('headings have predictable anchors and reading time excludes URLs and images', () => {
  assert.equal(core.headingSlug('Visão & Dados!'), 'visao-dados');
  assert.equal(core.headingSlug('!!!'), 'secao');
  assert.equal(core.readingTime('![Foto](https://example.com/foto.png)'), '1 min de leitura');
  assert.equal(core.readingTime('palavra '.repeat(401)), '3 min de leitura');
});
