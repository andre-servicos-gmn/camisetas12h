"""
Modelos ORM da C12H — espelham o que viria dos sistemas integrados.

São 3 tabelas:
  - pedidos:           a "visão única" de cada pedido (lead → entrega)
  - etapas_historico:  o trilho de cada etapa que o pedido percorreu
  - eventos:           o feed cru de acontecimentos vindos de cada sistema

O identificador único de negócio é `pedidos.numero` (C1xxxxx), gerado só no
fechamento (Conta Azul). Leads ainda não têm número — usam um id temporário
(ex.: "L-0007") guardado no mesmo campo `numero`, ou ficam com numero=None.
Para a POC mantemos `numero` sempre preenchido (C1xxxxx para fechados, L-xxxx
para leads) para facilitar a navegação; `is_lead` distingue os dois mundos.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# --- Pipeline canônico de etapas (ordem importa para a timeline) -----------
PIPELINE = [
    "Lead",
    "Negociação",
    "Layout",
    "Arte Final",
    "Aprovação",
    "Compras",
    "Produção (DTF/Silk)",
    "Conferência",
    "Expedição",
    "Entrega",
    "Entregue",
]


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # C1xxxxx para fechados, L-xxxx para leads ainda sem fechamento na Conta Azul.
    numero: Mapped[str] = mapped_column(String, unique=True, index=True)
    is_lead: Mapped[bool] = mapped_column(Boolean, default=False)

    cliente_nome: Mapped[str] = mapped_column(String)
    cliente_telefone: Mapped[str] = mapped_column(String)
    vendedor: Mapped[str] = mapped_column(String)
    produto_descricao: Mapped[str] = mapped_column(String)
    quantidade: Mapped[int] = mapped_column(Integer)
    valor: Mapped[float] = mapped_column(Float)

    origem_lead: Mapped[str] = mapped_column(String)  # "RD Station" | "Direto"
    data_criacao: Mapped[datetime] = mapped_column(DateTime)
    etapa_atual: Mapped[str] = mapped_column(String)

    metodo_entrega: Mapped[str] = mapped_column(String)  # "Lalamove" | "Correios"
    status_pagamento: Mapped[str] = mapped_column(String)  # pago | parcial | pendente
    nf_emitida: Mapped[bool] = mapped_column(Boolean, default=False)
    cliente_aguardando_resposta: Mapped[bool] = mapped_column(Boolean, default=False)
    # Motivo do alerta (por que está amarelo/vermelho) — geralmente um fator
    # externo (cliente não aprovou, insumo em falta). None quando está no prazo.
    motivo_alerta: Mapped[str | None] = mapped_column(String, nullable=True)

    historico: Mapped[list["EtapaHistorico"]] = relationship(
        back_populates="pedido",
        cascade="all, delete-orphan",
        order_by="EtapaHistorico.entrou_em",
    )
    eventos: Mapped[list["Evento"]] = relationship(
        back_populates="pedido",
        cascade="all, delete-orphan",
        order_by="Evento.timestamp",
    )


class EtapaHistorico(Base):
    __tablename__ = "etapas_historico"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    etapa: Mapped[str] = mapped_column(String)
    entrou_em: Mapped[datetime] = mapped_column(DateTime)
    # saiu_em = None significa "etapa atual" (ainda não saiu dela).
    saiu_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    pedido: Mapped["Pedido"] = relationship(back_populates="historico")


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(ForeignKey("pedidos.id"))
    tipo: Mapped[str] = mapped_column(String)
    descricao: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    # De qual sistema o evento "veio": Agendor / RD Station / Conta Azul /
    # Trello / WhatsApp / Gmail / Lalamove / Correios
    sistema_origem: Mapped[str] = mapped_column(String)

    pedido: Mapped["Pedido"] = relationship(back_populates="eventos")
