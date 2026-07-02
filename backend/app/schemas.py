"""
Schemas Pydantic — o formato dos dados que a API devolve para o frontend.

Mantemos separados dos modelos ORM para poder enriquecer a resposta com campos
calculados (cor de SLA, horas na etapa, jornada montada) sem poluir o banco.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class EventoOut(BaseModel):
    id: int
    tipo: str
    descricao: str
    timestamp: datetime
    sistema_origem: str

    class Config:
        from_attributes = True


class EtapaJornada(BaseModel):
    """Um ponto da timeline vertical (Lead → ... → Entrega)."""
    etapa: str
    status: str  # "concluida" | "atual" | "futura"
    entrou_em: datetime | None = None
    saiu_em: datetime | None = None


class PedidoResumo(BaseModel):
    """Card de pedido — usado em listas, painel de TV e dashboard."""
    id: int
    numero: str
    is_lead: bool
    cliente_nome: str
    vendedor: str
    produto_descricao: str
    quantidade: int
    valor: float
    etapa_atual: str
    metodo_entrega: str
    status_pagamento: str
    nf_emitida: bool
    cliente_aguardando_resposta: bool
    # Campos calculados pelo motor de SLA:
    horas_na_etapa: float
    cor: str
    # Por que está em alerta (só preenchido quando amarelo/vermelho).
    motivo_alerta: str | None = None


class PedidoDetalhe(PedidoResumo):
    """Visão única completa de um pedido."""
    cliente_telefone: str
    origem_lead: str
    data_criacao: datetime
    limiar_amarelo_h: float | None = None
    limiar_vermelho_h: float | None = None
    jornada: list[EtapaJornada]
    eventos: list[EventoOut]
    # Mensagem de WhatsApp em destaque quando o cliente está aguardando.
    mensagem_destaque: str | None = None


# --- Painel de TV ----------------------------------------------------------
class FeedItem(BaseModel):
    numero: str
    descricao: str
    sistema_origem: str
    timestamp: datetime
    minutos_atras: int


class DestaqueCliente(BaseModel):
    numero: str
    cliente_nome: str
    etapa_atual: str
    horas_na_etapa: float
    mensagem: str | None = None


class PainelColuna(BaseModel):
    titulo: str
    etapas: list[str]
    pedidos: list[PedidoResumo]


class PainelTV(BaseModel):
    gerado_em: datetime
    contadores: dict[str, int]  # {"verde": n, "amarelo": n, "vermelho": n}
    destaques: list[DestaqueCliente]
    colunas: list[PainelColuna]
    feed: list[FeedItem]


# --- Dashboard -------------------------------------------------------------
class FunilEtapa(BaseModel):
    etapa: str
    quantidade: int


class Funil(BaseModel):
    leads: int
    negociacao: int
    fechados: int
    taxa_conversao: float  # %
    tempo_medio_fechamento_h: float | None


class EtapaTempo(BaseModel):
    """Tempo médio que os pedidos passam numa etapa vs. o alvo de SLA."""
    etapa: str
    horas_medias: float
    alvo_h: float          # limiar amarelo da etapa
    fator: float           # horas_medias / alvo (>1 = acima do alvo)
    em_andamento: int      # pedidos atualmente nessa etapa


class VendedorResumo(BaseModel):
    """Carteira ativa por vendedor — quanto cada um tem em jogo agora."""
    vendedor: str
    pedidos: int           # pedidos ativos (em produção) do vendedor
    valor: float           # R$ somado da carteira ativa
    em_alerta: int         # quantos desses estão amarelos/vermelhos


class AguardandoItem(BaseModel):
    """Pedido onde o cliente mandou mensagem e está esperando resposta."""
    numero: str
    cliente_nome: str
    etapa_atual: str
    horas_na_etapa: float
    cor: str
    mensagem: str | None = None


class SlaDistribuicao(BaseModel):
    """Quantos pedidos ativos estão em cada estado de SLA."""
    verde: int = 0
    amarelo: int = 0
    vermelho: int = 0


class Composicao(BaseModel):
    """Como a carteira ativa se distribui — pagamento, entrega e origem."""
    pagamento: dict[str, int]  # {"pago": n, "parcial": n, "pendente": n}
    entrega: dict[str, int]    # {"Lalamove": n, "Correios": n}
    origem: dict[str, int]     # {"RD Station": n, "Direto": n}


class Dashboard(BaseModel):
    total_ativos: int
    em_alerta: int
    entregues_no_mes: int
    valor_em_producao: float
    valor_em_risco: float          # soma R$ dos pedidos no vermelho (furando o prazo)
    pedidos_em_risco: int
    por_etapa: list[FunilEtapa]
    funil: Funil
    criticos: list[PedidoResumo]
    gargalo: EtapaTempo | None = None      # etapa que mais trava vs. o SLA
    ranking_etapas: list[EtapaTempo] = []  # etapas ordenadas por fator
    ranking_vendedores: list[VendedorResumo] = []
    aguardando_resposta: list[AguardandoItem] = []
    composicao: Composicao | None = None
    sla_distribuicao: SlaDistribuicao | None = None  # verde/amarelo/vermelho (ativos)
    feed: list[FeedItem] = []              # últimas movimentações da operação
