"""
Aplicação FastAPI da Central de Inteligência Operacional (C12H).

POC para a Camisetas em 12 Horas — roda 100% local sobre SQLite com dados
simulados. A única chamada externa é a API da OpenAI (assistente de IA).

Em produção, a Nouvaris entrega isto sobre PostgreSQL gerenciado, com as
integrações reais (Agendor, Conta Azul, Trello, WhatsApp, Gmail, transportadoras)
alimentando o mesmo modelo de dados.
"""
from __future__ import annotations

from datetime import timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from . import config
from .database import Base, SessionLocal, engine
from .models import Evento
from .routers import assistente, dashboard, integracoes, painel, pedidos
from .sla import agora

app = FastAPI(
    title="C12H — Central de Inteligência Operacional",
    description="Visão única de cada pedido, do lead à entrega. POC (dados simulados).",
    version="0.1.0",
)

# CORS liberado para o frontend Vite (dev local).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Garante que as tabelas existem.
Base.metadata.create_all(bind=engine)

# Como os alertas de SLA são relativos a AGORA, dados antigos "envelhecem" e
# viram tudo vermelho. Então, na subida, se o banco está vazio OU o seed tem
# mais de 6h, repopulamos com timestamps frescos — a demo sempre abre coerente.
# (Dados 100% simulados, sem mutação do usuário, então repopular não perde nada.)
_LIMITE_FRESCOR_H = 6


def _seed_se_necessario() -> None:
    db = SessionLocal()
    try:
        ultimo = db.scalar(select(func.max(Evento.timestamp)))
    except Exception:  # noqa: BLE001 — tabela pode não existir na 1ª subida
        ultimo = None
    finally:
        db.close()

    precisa = ultimo is None
    if ultimo is not None:
        ultimo = ultimo.replace(tzinfo=timezone.utc) if ultimo.tzinfo is None else ultimo
        idade_h = (agora() - ultimo).total_seconds() / 3600.0
        precisa = idade_h > _LIMITE_FRESCOR_H

    if precisa:
        from . import seed as _seed
        print("[startup] dados ausentes ou desatualizados — repopulando o seed…")
        _seed.seed()


_seed_se_necessario()

app.include_router(pedidos.router)
app.include_router(painel.router)
app.include_router(dashboard.router)
app.include_router(integracoes.router)
app.include_router(assistente.router)


@app.get("/api/health", tags=["health"])
def health():
    """Sanidade da API + se o banco foi populado e qual provedor de IA está ativo."""
    db_existe = Path(config.DB_PATH).exists()
    provedor = config.ai_provider()
    modelo = config.OPENAI_MODEL if provedor else None
    return {
        "status": "ok",
        "banco": "pronto" if db_existe else "vazio — rode o seed",
        "assistente_ia": provedor or "sem chave",
        "modelo": modelo,
    }
