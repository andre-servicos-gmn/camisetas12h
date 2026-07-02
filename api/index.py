"""
Ponto de entrada do backend na Vercel (Python serverless).

Para não depender do roteamento estático da Vercel (que se mostrou instável
neste monorepo), a PRÓPRIA FastAPI serve tudo:
  - /api/... → as rotas da API (já definidas em backend/app);
  - qualquer outra coisa → o frontend estático (build do Vite em frontend/dist),
    com fallback para o index.html (SPA).

O vercel.json manda todas as requisições para esta função.

Detalhes de ambiente serverless:
  - `backend/` entra no path (o pacote real é `app`);
  - o SQLite vai para /tmp (único diretório gravável); o seed/auto-reseed recria
    o banco a cada cold start, sempre fresco.
"""
import os
import sys

_HERE = os.path.dirname(__file__)
sys.path.insert(0, os.path.abspath(os.path.join(_HERE, "..", "backend")))

os.environ.setdefault("C12H_DB_PATH", "/tmp/c12h.db")

from app.main import app  # noqa: E402  — ASGI app que a Vercel serve

# --- Frontend estático servido pela própria função -------------------------
from fastapi.responses import FileResponse, JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

_DIST = os.path.abspath(os.path.join(_HERE, "..", "frontend", "dist"))
_INDEX = os.path.join(_DIST, "index.html")
_ASSETS = os.path.join(_DIST, "assets")

if os.path.isdir(_ASSETS):
    # Arquivos com hash (JS/CSS/fontes/imagens) — cache-friendly.
    app.mount("/assets", StaticFiles(directory=_ASSETS), name="assets")


# Catch-all: registrado DEPOIS das rotas da API, então /api/... continua tendo
# prioridade. Serve o arquivo pedido se existir; senão, o index.html (SPA).
@app.get("/{caminho:path}")
def _frontend(caminho: str):
    alvo = os.path.join(_DIST, caminho)
    if caminho and os.path.isfile(alvo) and os.path.commonpath([_DIST, os.path.abspath(alvo)]) == _DIST:
        return FileResponse(alvo)
    if os.path.isfile(_INDEX):
        return FileResponse(_INDEX)
    return JSONResponse({"detail": "frontend build ausente"}, status_code=404)
