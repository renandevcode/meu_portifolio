"""Validate local HTML links, assets and unique IDs using Python's standard library."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, filename):
        super().__init__()
        self.filename = filename
        self.ids = set()
        self.links = []
        self.errors = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        identifier = attrs.get('id')
        if identifier:
            if identifier in self.ids:
                self.errors.append(f'{self.filename.name}: id duplicado ({identifier}).')
            self.ids.add(identifier)
        for attr in ('href', 'src'):
            if attrs.get(attr):
                self.links.append(attrs[attr])


pages = {}
for filename in ROOT.glob('*.html'):
    page = Page(filename)
    page.feed(filename.read_text())
    pages[filename] = page

errors = []
for filename, page in pages.items():
    errors.extend(page.errors)
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = (filename.parent / unquote(url.path)).resolve() if url.path else filename
        if not target.exists():
            errors.append(f'{filename.name}: arquivo não encontrado ({link}).')
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            errors.append(f'{filename.name}: âncora não encontrada ({link}).')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'{len(pages)} páginas verificadas; IDs, âncoras e arquivos locais OK.')
