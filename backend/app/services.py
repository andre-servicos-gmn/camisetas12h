"""
Camada de serviço — transforma os modelos ORM nas respostas da API, aplicando
o motor de SLA. Mantém a lógica fora dos routers (que ficam finos).
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import sla
from .models import Evento, Pedido, PIPELINE


def _resumo_dict(p: Pedido) -> dict:
    """Campos comuns de PedidoResumo, já com SLA calculado."""
    atual = next((h for h in p.historico if h.saiu_em is None), None)
    entrou_em = atual.entrou_em if atual else p.data_criacao
    aval = sla.avaliar_pedido(p.etapa_atual, entrou_em)
    return {
        "id": p.id,
        "numero": p.numero,
        "is_lead": p.is_lead,
        "cliente_nome": p.cliente_nome,
        "vendedor": p.vendedor,
        "produto_descricao": p.produto_descricao,
        "quantidade": p.quantidade,
        "valor": p.valor,
        "etapa_atual": p.etapa_atual,
        "metodo_entrega": p.metodo_entrega,
        "status_pagamento": p.status_pagamento,
        "nf_emitida": p.nf_emitida,
        "cliente_aguardando_resposta": p.cliente_aguardando_resposta,
        "motivo_alerta": p.motivo_alerta if aval["cor"] != "verde" else None,
        "horas_na_etapa": aval["horas_na_etapa"],
        "cor": aval["cor"],
        "_entrou_em": entrou_em,
        "_limiar_amarelo_h": aval["limiar_amarelo_h"],
        "_limiar_vermelho_h": aval["limiar_vermelho_h"],
    }


def pedido_resumo(p: Pedido) -> dict:
    d = _resumo_dict(p)
    for k in ("_entrou_em", "_limiar_amarelo_h", "_limiar_vermelho_h"):
        d.pop(k, None)
    return d


def _mensagem_destaque(p: Pedido) -> str | None:
    """Última mensagem de WhatsApp quando o cliente está aguardando resposta."""
    if not p.cliente_aguardando_resposta:
        return None
    wpp = [e for e in p.eventos if e.sistema_origem == "WhatsApp"]
    if not wpp:
        return None
    return max(wpp, key=lambda e: e.timestamp).descricao


def _jornada(p: Pedido) -> list[dict]:
    """Monta a timeline vertical completa (Lead → ... → Entrega/Entregue)."""
    hist_por_etapa = {h.etapa: h for h in p.historico}
    idx_atual = PIPELINE.index(p.etapa_atual)
    jornada = []
    for i, etapa in enumerate(PIPELINE):
        if i < idx_atual:
            status = "concluida"
        elif i == idx_atual:
            status = "atual"
        else:
            status = "futura"
        h = hist_por_etapa.get(etapa)
        jornada.append({
            "etapa": etapa,
            "status": status,
            "entrou_em": h.entrou_em if h else None,
            "saiu_em": h.saiu_em if h else None,
        })
    return jornada


def pedido_detalhe(p: Pedido) -> dict:
    d = _resumo_dict(p)
    entrou_em = d.pop("_entrou_em")
    detalhe = {
        **d,
        "limiar_amarelo_h": d.pop("_limiar_amarelo_h"),
        "limiar_vermelho_h": d.pop("_limiar_vermelho_h"),
        "cliente_telefone": p.cliente_telefone,
        "origem_lead": p.origem_lead,
        "data_criacao": p.data_criacao,
        "jornada": _jornada(p),
        "eventos": sorted(
            ({
                "id": e.id, "tipo": e.tipo, "descricao": e.descricao,
                "timestamp": e.timestamp, "sistema_origem": e.sistema_origem,
            } for e in p.eventos),
            key=lambda e: e["timestamp"], reverse=True,
        ),
        "mensagem_destaque": _mensagem_destaque(p),
    }
    return detalhe


def todos_pedidos(db: Session) -> list[Pedido]:
    return list(db.scalars(select(Pedido)).all())


def buscar_por_numero(db: Session, numero: str) -> Pedido | None:
    numero = (numero or "").strip().upper()
    return db.scalar(select(Pedido).where(Pedido.numero == numero))


def feed_recente(db: Session, limite: int = 12) -> list[dict]:
    """Últimas movimentações entre todos os pedidos, para o feed do painel."""
    agora = sla.agora()
    rows = db.execute(
        select(Evento, Pedido.numero)
        .join(Pedido, Evento.pedido_id == Pedido.id)
        .order_by(Evento.timestamp.desc())
        .limit(limite)
    ).all()
    feed = []
    for ev, numero in rows:
        ts = ev.timestamp.replace(tzinfo=timezone.utc) if ev.timestamp.tzinfo is None else ev.timestamp
        minutos = max(int((agora - ts).total_seconds() // 60), 0)
        feed.append({
            "numero": numero,
            "descricao": ev.descricao,
            "sistema_origem": ev.sistema_origem,
            "timestamp": ev.timestamp,
            "minutos_atras": minutos,
        })
    return feed
