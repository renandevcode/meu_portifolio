"""Browser regression checks. Requires Chrome and Python websocket-client.
Run from any directory: python3 tests/browser-check.py
Uses an isolated temporary profile/server; never changes published content.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import websocket

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = """# Teste de conteúdo

## Visão e dados

[Seção](#visao-e-dados)
[Python](https://docs.python.org/3/)
[Email](mailto:test@example.com)
[Inseguro](javascript:alert(1))

![Logo](../images/institutions/insper.png)
![Externo](https://example.com/photo.png)

<script>window.injected = true;</script>

## Visão e dados

### Detalhes

```python
print('teste')
```

| Nome | Valor |
| --- | --- |
| Teste | 42 |

- [x] Feito

[PDF](__fixture.pdf)
"""


class Handler(SimpleHTTPRequestHandler):
    invalid_index = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass

    def do_GET(self):
        route = self.path.split('?', 1)[0]
        if route == '/notes/index.json':
            data = json.loads((ROOT / 'notes/index.json').read_text())
            data.append({'slug': 'teste', 'title': 'Teste', 'file': '__fixture.md', 'status': 'published'})
            if self.invalid_index:
                data[0]['description'] = {}
            body = json.dumps(data).encode()
            kind = 'application/json'
        elif route == '/notes/__fixture.pdf':
            body = b'%PDF-1.4\n%%EOF\n'
            kind = 'application/pdf'
        elif route == '/notes/__fixture.md':
            body = FIXTURE.encode()
            kind = 'text/plain; charset=utf-8'
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/'
chrome = shutil.which('google-chrome') or shutil.which('chromium')
if not chrome:
    raise SystemExit('Chrome/Chromium não encontrado.')

with tempfile.TemporaryDirectory(prefix='portfolio-check-') as profile:
    process = subprocess.Popen([
        chrome, '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--remote-debugging-port=0', '--remote-allow-origins=*', '--disable-extensions',
        '--user-data-dir=' + profile, 'about:blank'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        port_file = Path(profile) / 'DevToolsActivePort'
        deadline = time.monotonic() + 10
        while not port_file.exists():
            if time.monotonic() > deadline:
                raise RuntimeError('Chrome não iniciou.')
            time.sleep(.1)
        debug_port = port_file.read_text().splitlines()[0]
        pages = json.load(urllib.request.urlopen(f'http://127.0.0.1:{debug_port}/json'))
        socket = websocket.create_connection(next(p for p in pages if p['type'] == 'page')['webSocketDebuggerUrl'], timeout=10)
        sequence = 0
        exceptions = []

        def call(method, params=None):
            global sequence
            sequence += 1
            socket.send(json.dumps({'id': sequence, 'method': method, 'params': params or {}}))
            while True:
                response = json.loads(socket.recv())
                if response.get('method') == 'Runtime.exceptionThrown':
                    exceptions.append(response['params'])
                if response.get('id') == sequence:
                    if 'error' in response:
                        raise RuntimeError(response['error'])
                    return response.get('result', {})

        def js(expression):
            result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
            if 'exceptionDetails' in result:
                raise RuntimeError(result['exceptionDetails'])
            return result['result'].get('value')

        def wait_for(expression):
            deadline = time.monotonic() + 15
            while not js(expression):
                if time.monotonic() > deadline:
                    raise AssertionError('Timeout: ' + expression)
                time.sleep(.05)

        def navigate(page, ready):
            url = base + page
            call('Page.navigate', {'url': url})
            wait_for(f'location.href === {json.dumps(url)} && ({ready})')

        call('Runtime.enable')
        for width in (390, 1440):
            call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': 900, 'deviceScaleFactor': 1, 'mobile': width == 390})
            navigate('', '!!document.querySelector("details.project[data-expanded]")')
            assert js('document.documentElement.scrollWidth <= innerWidth')
            assert js('document.querySelectorAll(".contact-card").length') == 3
            js('document.querySelector("details.project summary").click()')
            time.sleep(.1)
            js('document.querySelector("details.project summary").click()')
            wait_for('!document.querySelector("details.project").open')
            js('document.querySelector(".feature-card").click()')
            wait_for('document.querySelector("details.project").open && !document.querySelector(".project-panel").getAnimations().length')
            call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
            time.sleep(.1)
            js('document.querySelector("details.project summary").click()')
            assert not js('document.querySelector("details.project").open')
            call('Emulation.setEmulatedMedia', {'features': []})

            navigate('notes.html', 'document.querySelectorAll(".note-card").length === 4')
            js('document.getElementById("search").value="visao";document.getElementById("search").dispatchEvent(new Event("input"))')
            assert js('document.querySelectorAll(".note-card").length') == 1
            js('document.querySelector(".theme-toggle").click()')
            expected = js('document.documentElement.dataset.theme')
            assert js('localStorage.getItem("portfolio-theme")') == expected

            navigate('notes.html?note=teste', 'document.querySelector("#note-content table") !== null')
            assert js('document.documentElement.dataset.theme') == expected
            assert js('document.documentElement.scrollWidth <= innerWidth')
            assert js('document.querySelectorAll("#note-content script,[onclick]").length') == 0
            assert not js('!!window.injected')
            assert js('document.querySelectorAll("#note-content a[href^=javascript]").length') == 0
            assert js('document.querySelector("#visao-e-dados") !== null && document.querySelector("#visao-e-dados-2") !== null')
            assert js('document.querySelector("#section-1") !== null')
            assert js('document.querySelector("#note-content img").src') == base + 'images/institutions/insper.png'
            assert js('document.querySelector("#note-content a[href^=mailto]").target') == ''
            assert js('document.querySelector(".table-scroll table") !== null')
            assert js('document.querySelector("#note-content input").disabled')
            assert js('document.querySelector("#note-meta").textContent.includes("min de leitura")')
            js('document.querySelector(".pdf-preview").open=true')
            wait_for('document.querySelector(".pdf-preview iframe") !== null')
            print(f'{width}px: projetos, tema, busca, Markdown, links, imagens, sumário e PDF OK', flush=True)

        navigate('notes.html?note=inexistente', 'document.getElementById("note-title")?.textContent === "Nota não encontrada"')
        assert js('document.getElementById("library-tools").hidden')
        Handler.invalid_index = True
        navigate('notes.html', 'document.getElementById("status")?.textContent.includes("Não foi possível")')
        assert js('document.getElementById("note-content").getAttribute("aria-busy")') == 'false'
        assert not exceptions, exceptions
        print('Erros de índice e nota inexistente tratados; nenhuma exceção JS não capturada.', flush=True)
        socket.close()
    finally:
        process.terminate()
        process.wait(timeout=10)
        server.shutdown()
