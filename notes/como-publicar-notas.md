# Como publicar suas notas

Você pode escrever como em um blog: texto, links, fotos, diagramas, código, listas e tabelas. O site não tem editor online. Você edita arquivos Markdown no projeto e publica a nova versão do site.

## 1. Crie o arquivo

Crie `notes/minha-nova-nota.md` com este exemplo:

```markdown
# Minha nova nota

Uma introdução curta sobre o assunto.

## O problema

Texto com **negrito**, *itálico* e um [link externo](https://docs.python.org/3/).

![Descrição da foto ou diagrama](arquivos/minha-nova-nota/diagrama.png)

## A implementação

Explique sua abordagem e as decisões tomadas.

[Voltar ao problema](#o-problema)

## Referências

[Ler artigo em PDF](arquivos/minha-nova-nota/artigo.pdf)
```

Não copie os caminhos de imagens e PDFs sem colocar os arquivos correspondentes nas pastas.

## 2. Cadastre no índice

Acrescente este objeto à lista de `notes/index.json`, separado do anterior por uma vírgula:

```json
{
  "slug": "minha-nova-nota",
  "title": "Minha nova nota",
  "description": "Um resumo curto que ajude o leitor a escolher o artigo.",
  "file": "minha-nova-nota.md",
  "category": "Machine learning",
  "status": "published",
  "updated": "2026-10-08"
}
```

- `slug`, `title` e `file` são obrigatórios.
- `slug` precisa ser único, com letras minúsculas sem acentos, números e hífens.
- `description` e `category` são textos opcionais.
- `updated` é uma data real no formato `YYYY-MM-DD`.
- `status`: `draft` (rascunho), `planned` (planejada) ou `published` (publicada). Se omitido, fica como rascunho.
- Notas publicadas exibem tempo de leitura calculado a partir do texto.
- A ordem dos objetos define a ordem de exibição; o site não ordena automaticamente por data.

Rascunhos cadastrados também aparecem no site. Para preparar uma nota fora da biblioteca, não a cadastre ainda. Arquivos enviados à hospedagem continuam públicos; o status não é controle de acesso.

## 3. Adicione fotos e anexos

Crie uma pasta por nota dentro de `notes/arquivos/`:

```text
notes/
  minha-nova-nota.md
  arquivos/
    minha-nova-nota/
      diagrama.png
      artigo.pdf
```

Use caminhos relativos ao arquivo Markdown:

```markdown
![Diagrama da arquitetura](arquivos/minha-nova-nota/diagrama.png)
[Baixar ou abrir o artigo](arquivos/minha-nova-nota/artigo.pdf)
[Outra nota](../notes.html?note=criptografia)
[Enviar um email](mailto:renanramos1326@gmail.com)
```

Imagens PNG, JPEG, WebP, GIF e SVG podem ser usadas. As fotos se ajustam à largura da leitura e mantêm a proporção. Prefira arquivos com tamanho adequado para a web e descreva o conteúdo no texto alternativo entre colchetes.

Também é possível usar uma imagem externa:

```markdown
![Descrição da imagem](https://seu-dominio.com/foto.jpg)
```

A URL precisa apontar para a imagem, e o servidor deve permitir o carregamento. Guardar a imagem no projeto evita depender de um endereço externo.

PDFs recebem uma opção de visualização na página. A exibição depende do navegador e das permissões do servidor do PDF; o link original continua disponível.

## 4. Use seções e formatação

O primeiro `# Título` é removido da leitura para evitar repetição com o título do índice. Use `##`, `###` e `####` para as seções do sumário.

Os links para seções usam o texto sem acentos: `## Visão computacional` vira `#visao-computacional`. Títulos repetidos recebem `-2`, `-3` etc. Os links antigos `#section-1` continuam funcionando.

Código com três crases:

````markdown
```python
print("Olá!")
```
````

O código é exibido em bloco; não há destaque automático de sintaxe por linguagem.

Outros exemplos:

```markdown
> Uma observação importante.

- Primeiro item
- Segundo item

1. Primeira etapa
2. Segunda etapa

- [x] Etapa concluída
- [ ] Etapa pendente

| Técnica | Aplicação |
| --- | --- |
| OpenCV | Processamento de imagens |
```

As caixas de seleção são apenas de leitura. HTML embutido, scripts, iframes e links `javascript:` não são aceitos. Use Markdown para o conteúdo.

## 5. Confira e publique

Na raiz do projeto:

```bash
node scripts/check-content.js
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://localhost:8000/notes.html?note=minha-nova-nota` e confira o texto, a busca, as imagens, os links e o sumário. Depois envie a versão atualizada do site à hospedagem, incluindo o Markdown, o índice e os anexos.

A home tem três cartões de notas selecionadas, definidos em `index.html`. Uma nova nota aparece automaticamente na biblioteca; para destacá-la na home, atualize um desses cartões e seu link.
