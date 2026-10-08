# Manutenção das notas

O conteúdo é escrito em Markdown e cadastrado em `index.json`. Consulte [Como publicar suas notas](como-publicar-notas.md) para exemplos de textos, links, imagens e PDFs.

A ordem do índice é a ordem da biblioteca. Arquivos fora do índice não são listados, mas podem continuar acessíveis se forem publicados pelo servidor.

Antes de publicar, execute na raiz:

```bash
node scripts/check-content.js
```
