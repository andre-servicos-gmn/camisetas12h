"""Endpoint do Painel de TV — a peça principal da demo."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..schemas import PainelTV
from ..sla import agora

router = APIRouter(prefix="/api/painel", tags=["painel"])

# Colunas do telão por setor → quais etapas cada uma agrega.
COLUNAS = [
    {"titulo": "Arte", "etapas": ["Layout", "Arte Final"]},
    {"titulo": "DTF / Silk", "etapas": ["Produção (DTF/Silk)"]},
    {"titulo": "Conferência", "etapas": ["Conferência"]},
    {"titulo": "Expedição", "etapas": ["Expedição"]},
]

# Etapas consideradas "operação ativa" para os contadores grandes.
ETAPAS_ATIVAS = {
    "Layout", "Arte Final", "Aprovação", "Compras",
    "Produção (DTF/Silk)", "Conferência", "Expedição", "Entrega",
}


@router.get("", response_model=PainelTV)
def painel_tv(db: Session = Depends(get_db)):
    pedidos = services.todos_pedidos(db)
    resumos = [services.pedido_resumo(p) for p in pedidos]

    # Contadores grandes (No prazo / Atenção / Crítico) sobre a operação ativa.
    ativos = [r for r in resumos if r["etapa_atual"] in ETAPAS_ATIVAS]
    contadores = {"verde": 0, "amarelo": 0, "vermelho": 0}
    for r in ativos:
        contadores[r["cor"]] = contadores.get(r["cor"], 0) + 1

    # Destaques: clientes aguardando resposta (prioridade máxima).
    destaques = [
        {
            "numero": r["numero"],
            "cliente_nome": r["cliente_nome"],
            "etapa_atual": r["etapa_atual"],
            "horas_na_etapa": r["horas_na_etapa"],
            "mensagem": services._mensagem_destaque(
                next(p for p in pedidos if p.numero == r["numero"])
            ),
        }
        for r in resumos if r["cliente_aguardando_resposta"]
    ]

    # Colunas por setor.
    from ..sla import SEVERIDADE
    colunas = []
    for col in COLUNAS:
        cards = [r for r in resumos if r["etapa_atual"] in col["etapas"]]
        cards.sort(key=lambda r: (-SEVERIDADE.get(r["cor"], 0), -r["horas_na_etapa"]))
        colunas.append({"titulo": col["titulo"], "etapas": col["etapas"], "pedidos": cards})

    return {
        "gerado_em": agora(),
        "contadores": contadores,
        "destaques": destaques,
        "colunas": colunas,
        "feed": services.feed_recente(db, limite=12),
    }
