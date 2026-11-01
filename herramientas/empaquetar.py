"""Arma la versión de un solo archivo (cooperativa-escolar.html) a partir de index.html:
incrusta la hoja de estilos y los scripts en el mismo orden. La versión GitHub no necesita este paso.
Uso: python3 herramientas/empaquetar.py [carpeta_de_salida]"""
import pathlib, re, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "dist"

html = (RAIZ / "index.html").read_text(encoding="utf-8")

def estilo(m):
    css = (RAIZ / m.group(1)).read_text(encoding="utf-8")
    return f"<style>\n{css}</style>"

def script(m):
    js = (RAIZ / m.group(1)).read_text(encoding="utf-8")
    if "</script" in js.lower():
        raise SystemExit(f"{m.group(1)} contiene '</script': no se puede incrustar")
    return f"<script>\n{js}</script>"

html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', estilo, html)
html, n_js = re.subn(r'<script src="([^"]+)"></script>', script, html)
SALIDA.mkdir(parents=True, exist_ok=True)
destino = SALIDA / "cooperativa-escolar.html"
destino.write_text(html, encoding="utf-8")
print(f"{destino} · {n_css} hoja(s) de estilo y {n_js} scripts incrustados · {destino.stat().st_size:,} bytes")
