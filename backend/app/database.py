"""
Conexão e sessão do banco.

POC: SQLite via SQLAlchemy. `check_same_thread=False` porque o FastAPI/uvicorn
serve em múltiplas threads. Em produção, o mesmo código roda sobre PostgreSQL
apenas trocando a DATABASE_URL — nenhuma query precisa mudar.
"""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # necessário só para SQLite
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base declarativa de todos os modelos ORM."""


def get_db():
    """Dependency do FastAPI: entrega uma sessão e garante o fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
