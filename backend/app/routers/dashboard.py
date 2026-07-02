"""Endpoint do Dashboard de Gestão — métricas, pipeline, funil, críticos e insights."""
from __future__ import annotations

from collections import defaultdict
from datetime import timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..models import PIPELINE
from ..schemas import Dashboard
from ..sla import agora, SLA_LIMIARES

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Etapas que contam como "em produção" para o valor financeiro em jogo.
ETAPAS_PRODUCAO = {
    "Layout", "Arte Final", "Aprovação", "Compras",
    "Produção (DTF/Silk)", "Conferência", "Expedição", "Entrega",
}


@router.get("", response_model=Dashboard)
def dashboard(db: Session = Depends(get_db)):
    pedidos = services.todos_pedidos(db)
    resumos = [services.pedido_resumo(p) for p in pedidos]

    fechados = [r for r in resumos if not r["is_lead"]]
    ativos = [r for r in fechados if r["etapa_atual"] != "Entregue"]

    em_alerta = sum(1 for r in ativos if r["cor"] in ("amarelo", "vermelho"))
    valor_em_producao = sum(r["valor"] for r in ativos if r["etapa_atual"] in ETAPAS_PRODUCAO)

    # Distribuição de SLA entre os pedidos ativos (no prazo / atenção / crítico).
    sla_distribuicao = {"verde": 0, "amarelo": 0, "vermelho": 0}
    for r in ativos:
        sla_distribuicao[r["cor"]] = sla_distribuicao.get(r["cor"], 0) + 1

    # Entregues no mês corrente.
    now = agora()
    entregues_no_mes = 0
    for p in pedidos:
        if p.etapa_atual == "Entregue":
            atual = next((h for h in p.historico if h.saiu_em is None), None)
            dt = atual.entrou_em if atual else p.data_criacao
            if dt.year == now.year and dt.month == now.month:
                entregues_no_mes += 1

    # Pedidos por etapa (todas as etapas do pipeline, inclusive zeradas).
    contagem = {etapa: 0 for etapa in PIPELINE}
    for r in resumos:
        contagem[r["etapa_atual"]] = contagem.get(r["etapa_atual"], 0) + 1
    por_etapa = [{"etapa": e, "quantidade": contagem[e]} for e in PIPELINE]

    # Mini-funil de vendas (leads → negociação → fechado).
    leads = sum(1 for r in resumos if r["is_lead"] and r["etapa_atual"] == "Lead")
    negociacao = sum(1 for r in resumos if r["is_lead"] and r["etapa_atual"] == "Negociação")
    n_fechados = len(fechados)
    base_funil = leads + negociacao + n_fechados
    taxa_conversao = round((n_fechados / base_funil) * 100, 1) if base_funil else 0.0

    # Tempo médio de fechamento: Lead.entrou_em → saída da Negociação, nos fechados.
    tempos = []
    for p in pedidos:
        if p.is_lead:
            continue
        neg = next((h for h in p.historico if h.etapa == "Negociação"), None)
        lead = next((h for h in p.historico if h.etapa == "Lead"), None)
        if neg and neg.saiu_em and lead:
            horas = (neg.saiu_em - lead.entrou_em).total_seconds() / 3600.0
            if horas > 0:
                tempos.append(horas)
    tempo_medio = round(sum(tempos) / len(tempos), 1) if tempos else None

    # Pedidos críticos (vermelhos), do mais antigo na etapa para o menos.
    criticos = sorted(
        [r for r in resumos if r["cor"] == "vermelho"],
        key=lambda r: -r["horas_na_etapa"],
    )

    # Valor em risco: soma R$ dos pedidos no vermelho (furando o prazo agora).
    valor_em_risco = sum(r["valor"] for r in criticos)

    # Gargalo da operação: tempo médio que os pedidos passam em cada etapa
    # (segmentos do histórico; etapa atual conta o tempo até agora) comparado
    # ao alvo de SLA da etapa. O maior "fator" (média / alvo) é o gargalo.
    soma_h: dict[str, float] = defaultdict(float)
    cont: dict[str, int] = defaultdict(int)
    em_andamento: dict[str, int] = defaultdict(int)
    for p in pedidos:
        for h in p.historico:
            if h.etapa not in SLA_LIMIARES:
                continue
            entrou = h.entrou_em
            entrou = entrou.replace(tzinfo=timezone.utc) if entrou.tzinfo is None else entrou
            if h.saiu_em is None:
                fim = now
                em_andamento[h.etapa] += 1
            else:
                fim = h.saiu_em.replace(tzinfo=timezone.utc) if h.saiu_em.tzinfo is None else h.saiu_em
            horas = max((fim - entrou).total_seconds() / 3600.0, 0.0)
            soma_h[h.etapa] += horas
            cont[h.etapa] += 1

    ranking_etapas = []
    for etapa, (amarelo, _vermelho) in SLA_LIMIARES.items():
        if cont[etapa] == 0 or not amarelo:
            continue
        media = soma_h[etapa] / cont[etapa]
        ranking_etapas.append({
            "etapa": etapa,
            "horas_medias": round(media, 1),
            "alvo_h": amarelo,
            "fator": round(media / amarelo, 2),
            "em_andamento": em_andamento[etapa],
        })
    ranking_etapas.sort(key=lambda x: -x["fator"])
    gargalo = ranking_etapas[0] if ranking_etapas else None

    # Casa cada resumo com seu Pedido (mesma ordem) para acessar campos do ORM.
    pares = list(zip(pedidos, resumos))

    # Ranking de vendedores: carteira ativa (R$ e nº de pedidos) e quantos em alerta.
    por_vendedor: dict[str, dict] = {}
    for p, r in pares:
        if r["is_lead"] or r["etapa_atual"] == "Entregue":
            continue
        v = por_vendedor.setdefault(
            p.vendedor, {"vendedor": p.vendedor, "pedidos": 0, "valor": 0.0, "em_alerta": 0}
        )
        v["pedidos"] += 1
        v["valor"] += r["valor"]
        if r["cor"] in ("amarelo", "vermelho"):
            v["em_alerta"] += 1
    ranking_vendedores = sorted(por_vendedor.values(), key=lambda x: -x["valor"])

    # Clientes aguardando resposta — ação imediata (ex.: o herói C100470).
    aguardando_resposta = sorted(
        (
            {
                "numero": r["numero"],
                "cliente_nome": r["cliente_nome"],
                "etapa_atual": r["etapa_atual"],
                "horas_na_etapa": r["horas_na_etapa"],
                "cor": r["cor"],
                "mensagem": services._mensagem_destaque(p),
            }
            for p, r in pares
            if r["cliente_aguardando_resposta"]
        ),
        key=lambda x: -x["horas_na_etapa"],
    )

    # Composição da carteira ativa: pagamento, transportadora e origem do lead.
    composicao = {
        "pagamento": defaultdict(int),
        "entrega": defaultdict(int),
        "origem": defaultdict(int),
    }
    for p, r in pares:
        if r["is_lead"] or r["etapa_atual"] == "Entregue":
            continue
        composicao["pagamento"][p.status_pagamento] += 1
        composicao["entrega"][p.metodo_entrega] += 1
        composicao["origem"][p.origem_lead] += 1
    composicao = {k: dict(v) for k, v in composicao.items()}

    return {
        "total_ativos": len(ativos),
        "em_alerta": em_alerta,
        "entregues_no_mes": entregues_no_mes,
        "valor_em_producao": valor_em_producao,
        "valor_em_risco": valor_em_risco,
        "pedidos_em_risco": len(criticos),
        "por_etapa": por_etapa,
        "funil": {
            "leads": leads,
            "negociacao": negociacao,
            "fechados": n_fechados,
            "taxa_conversao": taxa_conversao,
            "tempo_medio_fechamento_h": tempo_medio,
        },
        "criticos": criticos,
        "gargalo": gargalo,
        "ranking_etapas": ranking_etapas[:4],
        "ranking_vendedores": ranking_vendedores,
        "aguardando_resposta": aguardando_resposta,
        "composicao": composicao,
        "sla_distribuicao": sla_distribuicao,
        "feed": services.feed_recente(db, limite=8),
    }
