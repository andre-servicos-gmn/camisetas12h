"""
Ferramentas (tool use) que o assistente de IA pode chamar contra o banco.

O modelo de IA NUNCA acessa o banco direto — ele decide *qual* ferramenta
chamar e com quais argumentos; este módulo executa a consulta e devolve dados
crus. Assim o assistente responde só com base no que existe no banco.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from .. import services
from ..models import PIPELINE

# --- Definição das ferramentas (JSON Schema, formato da Messages API) -------
TOOLS = [
    {
        "name": "buscar_pedido",
        "description": (
            "Busca um pedido específico pelo número (C1xxxxx para pedidos fechados "
            "ou L-xxxx para leads). Retorna cliente, vendedor, valor, etapa atual, "
            "cor do SLA, tempo na etapa, status de pagamento e entrega."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "numero": {
                    "type": "string",
                    "description": "Número do pedido, ex.: C100470 ou L-0008",
                }
            },
            "required": ["numero"],
        },
    },
    {
        "name": "listar_pedidos_por_etapa",
        "description": (
            "Lista os pedidos que estão atualmente numa etapa do pipeline. "
            "Etapas válidas: " + ", ".join(PIPELINE) + "."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "etapa": {
                    "type": "string",
                    "description": "Nome exato da etapa, ex.: 'Produção (DTF/Silk)'",
                }
            },
            "required": ["etapa"],
        },
    },
    {
        "name": "listar_pedidos_em_alerta",
        "description": (
            "Lista os pedidos em alerta de SLA. Opcionalmente filtra por cor: "
            "'amarelo' (atenção) ou 'vermelho' (crítico). Sem cor, retorna amarelos "
            "e vermelhos. Use para perguntas sobre pedidos atrasados ou em risco."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "cor": {
                    "type": "string",
                    "enum": ["amarelo", "vermelho"],
                    "description": "Filtro opcional de severidade",
                }
            },
            "required": [],
        },
    },
    {
        "name": "metricas_gerais",
        "description": (
            "Retorna um panorama da operação: total de pedidos ativos, quantos em "
            "alerta, entregues no mês, valor em produção, contagem por etapa e o "
            "funil de vendas. Use para perguntas amplas sobre 'como está a operação'."
        ),
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


# --- Implementação das ferramentas -----------------------------------------
def _fmt_pedido(p) -> dict:
    """Resumo enxuto de um pedido para o modelo (sem ruído)."""
    r = services.pedido_resumo(p)
    return {
        "numero": r["numero"],
        "cliente": r["cliente_nome"],
        "vendedor": r["vendedor"],
        "produto": r["produto_descricao"],
        "valor": r["valor"],
        "etapa_atual": r["etapa_atual"],
        "horas_na_etapa": r["horas_na_etapa"],
        "alerta_sla": r["cor"],
        "motivo_alerta": r.get("motivo_alerta"),
        "status_pagamento": r["status_pagamento"],
        "nf_emitida": r["nf_emitida"],
        "metodo_entrega": r["metodo_entrega"],
        "cliente_aguardando_resposta": r["cliente_aguardando_resposta"],
    }


def buscar_pedido(db: Session, numero: str) -> dict:
    p = services.buscar_por_numero(db, numero)
    if not p:
        return {"encontrado": False, "numero": numero}
    return {"encontrado": True, **_fmt_pedido(p)}


def listar_pedidos_por_etapa(db: Session, etapa: str) -> dict:
    pedidos = [p for p in services.todos_pedidos(db) if p.etapa_atual == etapa]
    return {
        "etapa": etapa,
        "quantidade": len(pedidos),
        "pedidos": [_fmt_pedido(p) for p in pedidos],
    }


def listar_pedidos_em_alerta(db: Session, cor: str | None = None) -> dict:
    resumos = [(p, services.pedido_resumo(p)) for p in services.todos_pedidos(db)]
    alvo = {cor} if cor else {"amarelo", "vermelho"}
    selecionados = [p for p, r in resumos if r["cor"] in alvo]
    return {
        "filtro_cor": cor or "amarelo+vermelho",
        "quantidade": len(selecionados),
        "pedidos": [_fmt_pedido(p) for p in selecionados],
    }


def metricas_gerais(db: Session) -> dict:
    # Reusa a mesma lógica do endpoint de dashboard.
    from ..routers.dashboard import dashboard as _dashboard
    return _dashboard(db)


# --- Dispatcher ------------------------------------------------------------
def executar(nome: str, args: dict, db: Session) -> dict:
    if nome == "buscar_pedido":
        return buscar_pedido(db, args.get("numero", ""))
    if nome == "listar_pedidos_por_etapa":
        return listar_pedidos_por_etapa(db, args.get("etapa", ""))
    if nome == "listar_pedidos_em_alerta":
        return listar_pedidos_em_alerta(db, args.get("cor"))
    if nome == "metricas_gerais":
        return metricas_gerais(db)
    return {"erro": f"Ferramenta desconhecida: {nome}"}
