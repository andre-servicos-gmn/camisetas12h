"""
Ponto de entrada do backend na Vercel (Python serverless).

A Vercel serve a aplicação ASGI exportada como `app`. Aqui só:
  1. colocamos a pasta `backend/` no path (o pacote real é `app`, mora lá);
  2. apontamos o SQLite para /tmp — o único diretório gravável no serverless
     (o seed/auto-reseed recria o banco a cada cold start, sempre fresco);
  3. importamos a FastAPI já pronta de backend/app/main.py.

As rotas continuam com prefixo /api/... (o vercel.json manda /api/* pra cá).
"""
import os
import sys

_BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_BACKEND))

os.environ.setdefault("C12H_DB_PATH", "/tmp/c12h.db")

from app.main import app  # noqa: E402  — ASGI app que a Vercel serve
