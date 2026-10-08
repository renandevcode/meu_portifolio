(() => {
  'use strict';

  const content = document.getElementById('note-content');
  const status = document.getElementById('status');
  const title = document.getElementById('note-title');
  const description = document.getElementById('note-description');
  const meta = document.getElementById('note-meta');
  const selectedSlug = new URLSearchParams(location.search).get('note');
  let notes = [];
  const { STATUS_LABELS: statusLabels, validateIndex, matchesQuery, displayDate, readingTime, headingSlug } = window.NotesCore;
  const search = document.getElementById('search');
  const libraryTools = document.getElementById('library-tools');

  async function fetchFile(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Consume the body before clearing the timeout, including slow downloads.
      return await response.text();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function noteURL(note) {
    return `notes.html?note=${encodeURIComponent(note.slug)}`;
  }

  // Copy only supported Markdown elements and attributes into a clean fragment.
  // Raw HTML is disabled in Marked, and links are restricted to safe protocols.
  function cleanMarkdown(html, baseURL) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const allowed = new Set('P H1 H2 H3 H4 H5 H6 UL OL LI STRONG EM DEL BLOCKQUOTE PRE CODE A IMG HR BR TABLE THEAD TBODY TR TH TD INPUT'.split(' '));
    function copy(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      if (node.nodeType !== Node.ELEMENT_NODE || !allowed.has(node.tagName)) return document.createDocumentFragment();
      const element = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'A' || node.tagName === 'IMG') {
        const attr = node.tagName === 'A' ? 'href' : 'src';
        try {
          const rawURL = node.getAttribute(attr);
          if (!rawURL?.trim()) throw new Error('URL vazia');
          const url = new URL(rawURL, baseURL);
          const protocols = attr === 'src' ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:'];
          if (protocols.includes(url.protocol)) {
            if (attr === 'href' && (node.getAttribute(attr) || '').startsWith('#')) element.setAttribute(attr, node.getAttribute(attr));
            else element.setAttribute(attr, url.href);
            if (attr === 'href' && ['http:', 'https:'].includes(url.protocol) && url.origin !== location.origin) {
              element.target = '_blank';
              element.rel = 'noopener noreferrer';
            }
          }
        } catch { /* Invalid URLs remain inert. */ }
        if (node.hasAttribute('title')) element.title = node.getAttribute('title');
        if (node.tagName === 'IMG') {
          element.alt = node.getAttribute('alt') || '';
          element.loading = 'lazy';
        }
      }
      if (node.tagName === 'INPUT') {
        element.type = 'checkbox';
        element.disabled = true;
        element.checked = node.hasAttribute('checked');
      }
      if (node.tagName === 'OL' && /^\d+$/.test(node.getAttribute('start') || '')) element.start = Number(node.getAttribute('start'));
      for (const child of node.childNodes) element.append(copy(child));
      return element;
    }
    const fragment = document.createDocumentFragment();
    for (const node of template.content.childNodes) fragment.append(copy(node));
    return fragment;
  }

  function enhanceContent() {
    const first = content.firstElementChild;
    if (first?.tagName === 'H1') first.remove();
    const toc = document.getElementById('toc');
    toc.replaceChildren();
    const headings = content.querySelectorAll('h2,h3,h4');
    const usedIDs = new Set(Array.from(headings, (_, index) => `section-${index + 1}`));
    headings.forEach((heading, index) => {
      const base = headingSlug(heading.textContent);
      let id = base;
      let suffix = 2;
      while (usedIDs.has(id) || document.getElementById(id)) id = `${base}-${suffix++}`;
      usedIDs.add(id);
      heading.id = id;
      // Keep previously shared section-N links working.
      const legacy = document.createElement('span');
      legacy.id = `section-${index + 1}`;
      heading.prepend(legacy);
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      if (heading.tagName !== 'H2') link.className = 'toc-subsection';
      toc.append(link);
    });
    document.getElementById('outline').hidden = !toc.childElementCount;
    content.querySelectorAll('table').forEach(table => {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.before(wrapper);
      wrapper.append(table);
    });
    const added = new Set();
    content.querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.href);
      if (!['http:', 'https:'].includes(url.protocol) || !/\.pdf$/i.test(url.pathname) || added.has(url.href)) return;
      added.add(url.href);
      const details = document.createElement('details');
      details.className = 'pdf-preview';
      const summary = document.createElement('summary');
      summary.textContent = `Visualizar PDF: ${link.textContent || 'Documento'}`;
      details.append(summary);
      details.addEventListener('toggle', () => {
        if (!details.open || details.querySelector('iframe')) return;
        const frame = document.createElement('iframe');
        frame.src = url.href;
        frame.title = `PDF: ${link.textContent || 'Documento'}`;
        frame.loading = 'lazy';
        frame.setAttribute('sandbox', '');
        details.append(frame);
      });
      const block = link.closest('p,li,blockquote,table') || link;
      block.after(details);
    });
  }

  function showLibrary(query = '') {
    document.body.classList.add('library');
    libraryTools.hidden = false;
    document.getElementById('outline').hidden = true;
    description.textContent = 'Perguntas, experimentos e decisões de implementação. Um registro do que estou aprendendo ao construir sistemas.';
    content.className = 'note-grid';
    content.replaceChildren();
    const filtered = notes.filter(note => matchesQuery(note, query));
    for (const note of filtered) {
      const card = document.createElement('a');
      card.className = 'note-card';
      card.href = noteURL(note);
      const category = document.createElement('span');
      category.className = 'note-category';
      category.textContent = note.category || 'Notas';
      const heading = document.createElement('h2');
      heading.textContent = note.title;
      const text = document.createElement('p');
      text.textContent = note.description || '';
      const info = document.createElement('p');
      info.className = 'note-card-meta';
      info.textContent = [statusLabels[note.status] || '', displayDate(note.updated)].filter(Boolean).join(' · ');
      card.append(category, heading, text, info);
      content.append(card);
    }
    status.textContent = filtered.length ? '' : query ? 'Nenhuma nota encontrada para esta busca.' : 'Nenhuma nota publicada ainda.';
  }

  async function init() {
    try {
      search.disabled = true;
      content.setAttribute('aria-busy', 'true');
      const data = JSON.parse(await fetchFile('notes/index.json'));
      const root = new URL('notes/', location.href);
      notes = validateIndex(data, root);
      search.disabled = false;
      if (!selectedSlug) { showLibrary(); return; }
      const note = notes.find(item => item.slug === selectedSlug);
      if (!note) {
        libraryTools.hidden = true;
        title.textContent = 'Nota não encontrada';
        status.textContent = 'Esta nota não está no índice. Escolha outra nota na biblioteca.';
        return;
      }
      libraryTools.hidden = true;
      title.textContent = note.title;
      document.title = `${note.title} | Renan Ramos`;
      document.getElementById('breadcrumb').textContent = `Notas / ${note.title}`;
      description.textContent = note.description || '';
      const metadata = [note.category, statusLabels[note.status], displayDate(note.updated)];
      meta.textContent = metadata.filter(Boolean).join(' · ');
      status.textContent = 'Carregando conteúdo…';
      const url = new URL(note.file, root);
      if (!window.marked) throw new Error('renderer');
      const markdown = await fetchFile(url);
      if (note.status === 'published') {
        metadata.push(readingTime(markdown));
        meta.textContent = metadata.filter(Boolean).join(' · ');
      }
      const renderer = new marked.Renderer();
      renderer.html = () => '';
      const html = marked.parse(markdown, { gfm: true, renderer });
      content.replaceChildren(cleanMarkdown(html, url));
      enhanceContent();
      status.textContent = note.status === 'planned' ? 'Esta nota está planejada. O conteúdo será desenvolvido em breve.' : note.status === 'draft' ? 'Rascunho em preparação. Este texto ainda está sendo desenvolvido.' : '';
      try {
        const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (anchor && content.contains(anchor)) {
          document.getElementById('outline').open = false;
          anchor.scrollIntoView();
        }
      } catch { /* Malformed URL fragments do not prevent reading. */ }
    } catch (error) {
      console.error('Falha ao carregar notas:', error);
      status.textContent = 'Não foi possível carregar as notas. Recarregue a página ou volte à biblioteca.';
    } finally {
      content.setAttribute('aria-busy', 'false');
    }
  }

  search.addEventListener('input', event => {
    if (!selectedSlug || document.body.classList.contains('library')) showLibrary(event.target.value);
  });
  init();

})();
