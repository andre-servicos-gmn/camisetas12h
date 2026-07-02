"""
Endpoint de Integrações — os sistemas que a C12H unifica pelo número do pedido.

É o "asset de fechamento": mostra que a inteligência conecta o que a Camisetas
em 12 Horas JÁ usa (CRM, ERP, produção, comunicação, logística) — ninguém troca
de sistema. As estatísticas (eventos sincronizados, última atividade) saem dos
dados simulados; em produção cada sistema teria um conector real alimentando o
mesmo modelo de dados.
"""
from __future__ import annotations

from datetime import timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import sla
from ..database import get_db
from ..models import Evento, Pedido

router = APIRouter(prefix="/api/integracoes", tags=["integracoes"])

# Os sistemas conectados, na ordem da jornada (do lead à entrega).
SISTEMAS_META = [
    {"nome": "RD Station", "categoria": "Marketing", "papel": "Captação e origem dos leads"},
    {"nome": "Agendor", "categoria": "CRM", "papel": "Funil de vendas, contatos e negociação"},
    {"nome": "Conta Azul", "categoria": "ERP · Financeiro", "papel": "Fechamento, NF e geração do número do pedido (C1xxxxx)"},
    {"nome": "Trello", "categoria": "Produção", "papel": "Quadro de produção: arte, DTF/silk, conferência"},
    {"nome": "WhatsApp", "categoria": "Comunicação", "papel": "Conversa direta com o cliente"},
    {"nome": "Gmail", "categoria": "Comunicação", "papel": "E-mails, propostas e aprovações"},
    {"nome": "Lalamove", "categoria": "Logística", "papel": "Entrega expressa na região"},
    {"nome": "Correios", "categoria": "Logística", "papel": "Envio e rastreio para fora"},
]


@router.get("")
def integracoes(db: Session = Depends(get_db)):
    agora = sla.agora()

    # Contagem de eventos e última atividade por sistema de origem.
    rows = db.execute(
        select(
            Evento.sistema_origem,
            func.count(Evento.id),
            func.max(Evento.timestamp),
        ).group_by(Evento.sistema_origem)
    ).all()
    stats = {nome: (cnt, ts) for nome, cnt, ts in rows}

    sistemas = []
    total_eventos = 0
    for meta in SISTEMAS_META:
        cnt, ts = stats.get(meta["nome"], (0, None))
        total_eventos += cnt
        minutos = None
        if ts is not None:
            ts_utc = ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts
            minutos = max(int((agora - ts_utc).total_seconds() // 60), 0)
        sistemas.append({
            **meta,
            "status": "Conectado",
            "eventos": cnt,
            "ultimo_evento_em": ts,
            "minutos_atras": minutos,
        })

    total_pedidos = db.scalar(select(func.count(Pedido.id))) or 0

    return {
        # A "chave" que costura tudo: o número do pedido.
        "chave_unica": "C1xxxxx",
        "total_sistemas": len(SISTEMAS_META),
        "total_eventos": total_eventos,
        "pedidos_unificados": total_pedidos,
        "sistemas": sistemas,
    }
