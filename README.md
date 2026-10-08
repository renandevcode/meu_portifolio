# Portfólio de Renan Ramos

Site estático em HTML, CSS e JavaScript. Não há build, banco de dados ou instalação de dependências para servir o site.

## Abrir localmente

Na raiz do projeto:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://localhost:8000`. As notas precisam de HTTP para carregar Markdown e o índice; não abra `notes.html` por `file://`.

## Onde alterar

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Apresentação, projetos, formação e contatos |
| `notes.html` | Estrutura da biblioteca e da página de leitura |
| `design-system.css` | Cores dos dois temas, tipografia, raios e elementos compartilhados |
| `style.css` | Layout e componentes do portfólio |
| `notes.css` | Biblioteca e conteúdo dos artigos |
| `theme.js` | Tema, preferência do sistema e escolha salva |
| `script.js` | Projetos expansíveis, navegação e cópia do email |
| `notes-core.js` | Validação do índice, busca, datas e tempo de leitura |
| `notes.js` | Carregamento, sanitização e renderização do Markdown |
| `notes/index.json` | Cadastro e ordem das notas |
| `vendor/` | Renderizador Markdown local e licença; não editar manualmente |

O HTML dos projetos funciona sem JavaScript; o JS acrescenta animação. A biblioteca depende de JavaScript. Não coloque lógica do site dentro de arquivos Markdown.

## Publicar notas

Leia [o guia completo](notes/como-publicar-notas.md). Links, imagens, listas, tabelas, código e PDFs são suportados. A publicação é feita editando arquivos e enviando a nova versão do site ao seu provedor de hospedagem.

## Verificar antes de publicar

Com Node instalado, sem instalar pacotes:

```bash
node --test tests/notes-core.test.js
node scripts/check-content.js
python3 scripts/check-structure.py
node --check notes.js
node --check script.js
node --check theme.js
```

Os verificadores conferem metadados, arquivos, anexos locais, IDs e âncoras do HTML. Não verifica disponibilidade de URLs externas. Após mudanças de interface, abra home, biblioteca e artigo no celular e desktop, nos dois temas; teste teclado, busca, abertura/fechamento rápido dos projetos e movimento reduzido.

Para publicar, envie HTML, CSS, JS, `notes/`, `images/` e `vendor/`, preservando seus caminhos relativos. Rascunhos e notas planejadas cadastradas no índice aparecem publicamente com seu estado; não são conteúdo privado.

### Teste opcional no navegador

```bash
python3 tests/browser-check.py
```

Requer Chrome/Chromium e o pacote Python `websocket-client`. O teste usa perfil e servidor temporários, com conteúdo de teste isolado. Não altera as notas publicadas. Verifica duas larguras de tela, busca, temas, animação, links, imagens, sumário, criação da prévia de PDF e rejeição de scripts no Markdown. Não garante a renderização interna de PDFs externos nem testa todos os navegadores.

## Organização das imagens

```text
images/
  site/                         # Favicon e identidade geral
    favicon.jpeg
  icons/                        # Ícones em arquivos (logos SVG inline ficam no HTML)
    github.webp
  institutions/                 # Logos de formação
    insper.png
    fatec.png
  projects/
    vaccination-bot/cover.png
    pass-vault/cover.png
    lane-detection/cover.png
```

Para um novo projeto, crie `images/projects/slug-do-projeto/` e coloque a capa em `cover.png` (ou `.webp`/`.jpg`, conforme o formato real). Use nomes minúsculos com hífens para arquivos adicionais, como `interface.webp` e `arquitetura.png`. Atualize o `src` em `index.html`.

Fotos e PDFs exclusivos de uma nota ficam em `notes/arquivos/slug-da-nota/`. Se uma nota reutilizar uma imagem de projeto, use por exemplo `![Descrição](../images/projects/pass-vault/cover.png)` no Markdown. Não coloque PDFs dentro de `images/`.
