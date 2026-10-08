/* Validate notes and attachments before publishing: node scripts/check-content.js */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { validateIndex } = require('../notes-core.js');
const marked = require('../vendor/marked.umd.js');
const projectRoot = path.resolve(__dirname, '..');
const notesRoot = new URL(`file://${projectRoot}/notes/`);
let errors = 0;
function report(message) { console.error(message); errors++; }
try {
  const notes = validateIndex(JSON.parse(fs.readFileSync(path.join(projectRoot, 'notes/index.json'), 'utf8')), notesRoot);
  for (const note of notes) {
    const url = new URL(note.file, notesRoot);
    const filename = fileURLToPath(url);
    if (!fs.existsSync(filename)) { report(`${note.slug}: arquivo não encontrado (${note.file}).`); continue; }
    const markdown = fs.readFileSync(filename, 'utf8');
    const tokens = marked.lexer(markdown);
    marked.walkTokens(tokens, token => {
      if (!['link', 'image'].includes(token.type) || !token.href || token.href.startsWith('#')) return;
      let target;
      try { target = new URL(token.href, url); } catch { report(`${note.slug}: URL inválida (${token.href}).`); return; }
      if (['http:', 'https:', 'mailto:'].includes(target.protocol)) return;
      if (target.protocol !== 'file:') { report(`${note.slug}: protocolo não suportado (${token.href}).`); return; }
      if (token.href.startsWith('/')) { report(`${note.slug}: use um caminho relativo para ${token.href}.`); return; }
      try {
        if (!fs.existsSync(fileURLToPath(target))) report(`${note.slug}: anexo/link não encontrado (${token.href}).`);
      } catch { report(`${note.slug}: caminho inválido (${token.href}).`); }
    });
  }
  if (!errors) console.log(`${notes.length} notas verificadas; arquivos e links locais OK.`);
} catch (error) { report(error.message); }
process.exitCode = errors ? 1 : 0;
