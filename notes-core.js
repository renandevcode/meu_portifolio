/* Pure content rules shared by the browser and dependency-free Node checks. */
(function (root) {
  'use strict';
  const STATUS_LABELS = Object.freeze({ draft: 'Rascunho', planned: 'Planejada', published: 'Publicada' });
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validateIndex(data, rootURL) {
    if (!Array.isArray(data)) throw new TypeError('O índice deve ser uma lista.');
    const slugs = new Set();
    return data.map((note, index) => {
      const fail = message => { throw new TypeError(`Nota ${index + 1}: ${message}`); };
      if (!note || typeof note !== 'object') fail('entrada inválida.');
      if (typeof note.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(note.slug)) fail('slug inválido.');
      if (slugs.has(note.slug)) fail('slug duplicado.');
      if (typeof note.title !== 'string' || !note.title.trim()) fail('título obrigatório.');
      if (typeof note.file !== 'string' || !note.file.trim()) fail('arquivo obrigatório.');
      let url;
      try { url = new URL(note.file, rootURL); } catch { fail('caminho inválido.'); }
      if (url.origin !== rootURL.origin || !url.pathname.startsWith(rootURL.pathname) || !url.pathname.endsWith('.md') || url.search || url.hash || /%2f|%5c/i.test(url.pathname)) fail('o arquivo deve estar dentro de notes/ e terminar em .md.');
      for (const key of ['description', 'category']) {
        if (note[key] !== undefined && typeof note[key] !== 'string') fail(`${key} deve ser texto.`);
      }
      if (note.updated !== undefined && !validDate(note.updated)) fail('data inválida (use YYYY-MM-DD).');
      if (note.status !== undefined && (typeof note.status !== 'string' || !Object.hasOwn(STATUS_LABELS, note.status))) fail('status inválido.');
      slugs.add(note.slug);
      return { ...note, status: note.status || 'draft' };
    });
  }

  function matchesQuery(note, query) {
    return normalize(`${note.title} ${note.category || ''} ${note.description || ''}`).includes(normalize(query));
  }

  function displayDate(value) {
    return validDate(value) ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '';
  }

  function readingTime(markdown) {
    const text = markdown.replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*_>`~]/g, '');
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 200))} min de leitura`;
  }

  function headingSlug(text) {
    return normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'secao';
  }

  const api = Object.freeze({ STATUS_LABELS, validateIndex, matchesQuery, validDate, displayDate, readingTime, headingSlug });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NotesCore = api;
})(globalThis);
