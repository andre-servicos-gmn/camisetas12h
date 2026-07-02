"""
Configuração central da POC C12H.

Carrega variáveis de ambiente do .env e expõe constantes usadas pelo app.
POC roda 100% local sobre SQLite — em produção, DATABASE_URL apontaria para
um PostgreSQL gerenciado (é o que a Nouvaris entrega).
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Diretório raiz do backend (onde mora o .env e o arquivo .db)
BACKEND_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BACKEND_DIR / ".env")

# --- Banco -----------------------------------------------------------------
# POC: SQLite num arquivo local, zero-config.
# Em serverless (Vercel) só /tmp é gravável — por isso o caminho é configurável
# via C12H_DB_PATH. O seed/auto-reseed recria o banco a cada cold start.
# PRODUÇÃO real: trocaríamos por algo como
#   DATABASE_URL = "postgresql+psycopg://user:pass@host:5432/c12h"
DB_PATH = Path(os.getenv("C12H_DB_PATH", str(BACKEND_DIR / "c12h.db")))
DATABASE_URL = f"sqlite:///{DB_PATH}"

# --- Assistente de IA (OpenAI) ---------------------------------------------
# O assistente é a ÚNICA chamada externa da POC. Sem chave, ele degrada com
# elegância ("indisponível") e o resto do app funciona normalmente.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o").strip()


def ai_provider() -> str | None:
    """Provedor de IA ativo: 'openai' ou None (sem chave)."""
    return "openai" if OPENAI_API_KEY else None

# --- CORS ------------------------------------------------------------------
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip()
