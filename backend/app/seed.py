"""
Seed da POC — popula o SQLite com uma operação realista da Camisetas em 12 Horas.

TUDO É SIMULADO. Nenhum sistema real é consultado. Estes dados imitam o que
viria do Agendor, RD Station, Conta Azul, Trello, WhatsApp, Gmail e das
transportadoras — unificados pelo número do pedido (C1xxxxx).

Pontos-chave do seed:
  - Timestamps são SEMPRE relativos a AGORA (entrou_em = agora - N horas), então
    os estados de alerta ficam corretos toda vez que a demo roda.
  - Retrato de uma operação BEM TOCADA (a gráfica entrega no menor prazo): a
    MAIORIA está no prazo (verde), 4 em atenção (amarelo) e só 2 críticos
    (vermelho) — e os dois travados por fator EXTERNO (cliente não aprovou a
    arte; insumo em falta no fornecedor), não por falha da produção. Todo pedido
    em alerta carrega um `motivo` explicando o porquê.
  - C100470 é o pedido "herói": em Produção (DTF/Silk), no prazo, mas com o
    cliente cobrando previsão no WhatsApp — caso de atendimento, não de atraso.

Rodar:  python -m app.seed   (a partir da pasta backend/)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .database import Base, SessionLocal, engine
from .models import Evento, EtapaHistorico, Pedido, PIPELINE

# AGORA, congelado no início do seed para coerência entre todos os registros.
BASE_NOW = datetime.now(timezone.utc)


def ago(horas: float) -> datetime:
    """Datetime (naive UTC) há `horas` horas atrás — formato que o SQLite guarda."""
    return (BASE_NOW - timedelta(hours=horas)).replace(tzinfo=None)


# Tempo típico que um pedido passa em cada etapa já concluída (para reconstruir
# a jornada para trás a partir da etapa atual). Em produção isto sairia do
# histórico real do Trello / Conta Azul.
BACKFILL_HORAS = {
    "Lead": 18,
    "Negociação": 50,
    "Layout": 5,
    "Arte Final": 5,
    "Aprovação": 14,
    "Compras": 16,
    "Produção (DTF/Silk)": 11,
    "Conferência": 4,
    "Expedição": 10,
    "Entrega": 18,
}

VENDEDORES = ["Marina Alves", "Rafael Souza", "Juliana Costa", "Diego Martins"]


# ===========================================================================
# OS 22 REGISTROS
# `horas` = há quantas horas o pedido está na etapa atual (controla a cor do SLA)
# ===========================================================================
# Distribuição alvo (com timestamps frescos): 2 vermelhos (fator externo),
# 4 amarelos (atenção), o resto no prazo. `motivo` explica todo alerta.
PEDIDOS_SEED = [
    # --- HERÓI DA DEMO: no prazo, mas cliente cobrando previsão ------------
    dict(numero="C100470", etapa="Produção (DTF/Silk)", horas=5,  # verde
         cliente="Academia Corpo em Movimento", tel="(11) 98477-2103",
         vendedor="Marina Alves", produto="120 Camiseta Dry-Fit (sublimação)", qtd=120,
         valor=4800, origem="RD Station", entrega="Lalamove", pgto="pago",
         nf=True, aguardando=True,
         msg="Cliente perguntou: 'meu pedido C100470 já está pronto?'"),

    # --- PEDIDOS FECHADOS (espalhados por todas as etapas) -----------------
    dict(numero="C100471", etapa="Entrega", horas=10,  # verde
         cliente="Colégio São Bento", tel="(11) 99123-4455",
         vendedor="Rafael Souza", produto="300 Camiseta Basic (DTF) - turma 2026", qtd=300,
         valor=12000, origem="RD Station", entrega="Correios", pgto="pago",
         nf=True),

    dict(numero="C100472", etapa="Conferência", horas=3,  # verde
         cliente="Hamburgueria do Beto", tel="(11) 98712-9090",
         vendedor="Juliana Costa", produto="80 Camiseta Basic (silk) frente/verso", qtd=80,
         valor=2400, origem="Direto", entrega="Lalamove", pgto="parcial",
         nf=True),

    dict(numero="C100473", etapa="Arte Final", horas=2,  # verde
         cliente="Várzea FC", tel="(11) 99655-3321",
         vendedor="Diego Martins", produto="40 Camiseta Dry-Fit (sublimação) - uniforme", qtd=40,
         valor=3600, origem="Direto", entrega="Correios", pgto="parcial",
         nf=False),

    dict(numero="C100474", etapa="Aprovação", horas=30,  # VERMELHO (externo) + AGUARDANDO
         cliente="Igreja Vida Nova", tel="(11) 98388-7766",
         vendedor="Marina Alves", produto="200 Camiseta Basic (DTF) - evento", qtd=200,
         valor=5000, origem="RD Station", entrega="Lalamove", pgto="parcial",
         nf=False, aguardando=True,
         motivo="Arte enviada há 2 dias — cliente ainda não aprovou. Produção travada até o OK.",
         msg="Cliente perguntou: 'a arte já saiu? preciso aprovar ainda hoje'"),

    dict(numero="C100475", etapa="Compras", horas=14,  # amarelo
         cliente="Restaurante Sabor Caseiro", tel="(11) 99012-1188",
         vendedor="Rafael Souza", produto="60 Camisa Polo (bordado)", qtd=60,
         valor=1800, origem="Direto", entrega="Correios", pgto="pago", nf=True,
         motivo="Aguardando cotação do fornecedor para liberar a compra do insumo."),

    dict(numero="C100476", etapa="Produção (DTF/Silk)", horas=5,  # verde
         cliente="Loja Surf Norte", tel="(11) 98555-6644",
         vendedor="Juliana Costa", produto="150 Camiseta Premium (DTF) estampa full", qtd=150,
         valor=6750, origem="RD Station", entrega="Lalamove", pgto="pago", nf=True),

    dict(numero="C100477", etapa="Layout", horas=2,  # verde
         cliente="Pizzaria Forno a Lenha", tel="(11) 99777-2200",
         vendedor="Diego Martins", produto="50 Camiseta Basic (silk) + 20 Boné", qtd=70,
         valor=2100, origem="Direto", entrega="Correios", pgto="parcial", nf=False),

    dict(numero="C100478", etapa="Expedição", horas=16,  # amarelo
         cliente="Colégio Dom Bosco", tel="(11) 98244-9911",
         vendedor="Marina Alves", produto="250 Camiseta Basic (DTF) - turma 2026", qtd=250,
         valor=9500, origem="RD Station", entrega="Lalamove", pgto="pago", nf=True,
         motivo="Pedido pronto e embalado — aguardando a coleta da transportadora."),

    dict(numero="C100479", etapa="Produção (DTF/Silk)", horas=6,  # verde
         cliente="Mercado União", tel="(11) 99488-1230",
         vendedor="Rafael Souza", produto="180 Camisa Polo (bordado) - uniforme interno", qtd=180,
         valor=7200, origem="Direto", entrega="Correios", pgto="parcial", nf=True),

    dict(numero="C100480", etapa="Conferência", horas=3,  # verde
         cliente="Padaria Pão Quente", tel="(11) 98101-4567",
         vendedor="Juliana Costa", produto="35 Camiseta Basic (silk)", qtd=35,
         valor=1500, origem="Direto", entrega="Lalamove", pgto="pago", nf=True),

    dict(numero="C100481", etapa="Compras", horas=30,  # VERMELHO (externo)
         cliente="Auto Peças Veloz", tel="(11) 99320-8855",
         vendedor="Diego Martins", produto="90 Camisa Polo (bordado) - logo", qtd=90,
         valor=3150, origem="RD Station", entrega="Correios", pgto="pago", nf=True,
         motivo="Linha de bordado em falta no fornecedor — reposição prevista para amanhã."),

    dict(numero="C100482", etapa="Conferência", horas=0.25,  # verde · recente (feed)
         cliente="Hotel Mar Azul", tel="(11) 98699-3412",
         vendedor="Marina Alves", produto="120 Camiseta Basic + 40 Camisa Polo", qtd=160,
         valor=5400, origem="RD Station", entrega="Lalamove", pgto="pago", nf=True),

    dict(numero="C100483", etapa="Entrega", horas=30,  # amarelo
         cliente="Escola Infantil Pequeno Mundo", tel="(11) 99566-7788",
         vendedor="Rafael Souza", produto="70 Camiseta Infantil (DTF) - evento", qtd=70,
         valor=2450, origem="Direto", entrega="Correios", pgto="pago", nf=True,
         motivo="Em rota de entrega — chegada prevista para hoje."),

    dict(numero="C100484", etapa="Produção (DTF/Silk)", horas=5,  # verde
         cliente="Crossfit Ferro & Fogo", tel="(11) 98233-1900",
         vendedor="Juliana Costa", produto="100 Camiseta Dry-Fit (sublimação) performance", qtd=100,
         valor=4500, origem="RD Station", entrega="Lalamove", pgto="parcial", nf=True),

    dict(numero="C100485", etapa="Arte Final", horas=2,  # verde
         cliente="Bar do Zé", tel="(11) 99844-5500",
         vendedor="Diego Martins", produto="25 Camiseta Basic (silk)", qtd=25,
         valor=950, origem="Direto", entrega="Correios", pgto="pendente", nf=False),

    dict(numero="C100486", etapa="Entregue", horas=48,  # entregue há 2 dias
         cliente="Salão Beleza Pura", tel="(11) 98060-7234",
         vendedor="Marina Alves", produto="30 Baby Look (DTF) + 10 Caneca", qtd=40,
         valor=1200, origem="Direto", entrega="Lalamove", pgto="pago", nf=True),

    dict(numero="C100487", etapa="Entregue", horas=120,  # entregue há 5 dias
         cliente="Construtora Alicerce", tel="(11) 99711-6622",
         vendedor="Rafael Souza", produto="150 Camiseta Basic (DTF) - obra", qtd=150,
         valor=6000, origem="RD Station", entrega="Correios", pgto="pago", nf=True),

    # --- LEADS (ainda sem C1xxxxx — funil de vendas) -----------------------
    dict(numero="L-0007", etapa="Lead", horas=8, is_lead=True,
         cliente="Buffet Festa & Cia", tel="(11) 98900-3344",
         vendedor="Juliana Costa", produto="~200 Camiseta Basic (DTF) - evento (estimativa)",
         qtd=200, valor=6000, origem="RD Station", entrega="Lalamove",
         pgto="pendente", nf=False),

    dict(numero="L-0008", etapa="Negociação", horas=40, is_lead=True,  # verde
         cliente="Time Águias FC", tel="(11) 99277-8810",
         vendedor="Diego Martins", produto="50 Camiseta Dry-Fit (sublimação) - uniforme",
         qtd=50, valor=4500, origem="Direto", entrega="Correios",
         pgto="pendente", nf=False),

    dict(numero="L-0009", etapa="Negociação", horas=100, is_lead=True,  # amarelo (lead parado)
         cliente="Studio Pilates Equilíbrio", tel="(11) 98155-9070",
         vendedor="Marina Alves", produto="40 Baby Look (DTF) + 40 Ecobag",
         qtd=80, valor=3200, origem="RD Station", entrega="Lalamove",
         pgto="pendente", nf=False,
         motivo="Proposta enviada — cliente avaliando, sem retorno há 4 dias."),

    dict(numero="L-0010", etapa="Lead", horas=12, is_lead=True,
         cliente="Festa Junina Bairro Alegre", tel="(11) 99033-2211",
         vendedor="Rafael Souza", produto="300 brindes: Ecobag + Boné personalizados",
         qtd=300, valor=4200, origem="Direto", entrega="Correios",
         pgto="pendente", nf=False),
]


def _tipo_producao(produto: str) -> str:
    p = produto.lower()
    if "silk" in p:
        return "Silk"
    if "sublima" in p:
        return "Sublimação"
    if "bordado" in p or "polo" in p:
        return "Bordado"
    return "DTF"


def _build_historico(p: dict) -> list[EtapaHistorico]:
    """Reconstrói a jornada para trás a partir da etapa atual."""
    idx = PIPELINE.index(p["etapa"])
    concluidas = PIPELINE[:idx]

    entrou_atual = ago(p["horas"])
    registros = [EtapaHistorico(etapa=p["etapa"], entrou_em=entrou_atual, saiu_em=None)]

    cursor = entrou_atual
    for etapa in reversed(concluidas):
        dur = BACKFILL_HORAS.get(etapa, 6)
        entrou = cursor - timedelta(hours=dur)
        registros.append(EtapaHistorico(etapa=etapa, entrou_em=entrou, saiu_em=cursor))
        cursor = entrou

    registros.reverse()  # ordem cronológica
    return registros


def _build_eventos(p: dict, historico: list[EtapaHistorico]) -> list[Evento]:
    """Gera 4-8 eventos coerentes vindos de sistemas diferentes."""
    eventos: list[Evento] = []
    by_etapa = {h.etapa: h for h in historico}
    num = p["numero"]
    transportadora = p["entrega"]

    def add(etapa_ref: str, tipo: str, descricao: str, sistema: str, offset_h: float = 0.1):
        h = by_etapa.get(etapa_ref)
        if not h:
            return
        eventos.append(Evento(
            tipo=tipo, descricao=descricao, sistema_origem=sistema,
            timestamp=h.entrou_em + timedelta(hours=offset_h),
        ))

    # Lead — captação
    if p["origem"] == "RD Station":
        add("Lead", "lead", "Lead capturado via formulário do site", "RD Station")
    else:
        add("Lead", "lead", f"Lead cadastrado pelo vendedor {p['vendedor']}", "Agendor")

    # Negociação — proposta
    add("Negociação", "proposta",
        f"Proposta enviada — {p['qtd']} un., R$ {p['valor']:,.0f}".replace(",", "."),
        "Agendor")

    # Fechamento (gera o C1xxxxx na Conta Azul) — acontece ao entrar em Layout
    if not p.get("is_lead"):
        add("Layout", "fechamento",
            f"Pedido {num} faturado — fechamento confirmado", "Conta Azul")
        if p["pgto"] == "pago":
            add("Layout", "pagamento", "Pagamento integral confirmado", "Conta Azul", 0.3)
        elif p["pgto"] == "parcial":
            add("Layout", "pagamento", "Pagamento parcial recebido (50% de sinal)",
                "Conta Azul", 0.3)
        add("Layout", "trello", "Card criado na coluna Layout", "Trello", 0.2)

    # Produção / etapas internas (Trello)
    add("Arte Final", "trello", "Card movido para Arte Final", "Trello")
    add("Aprovação", "aprovacao", "Arte enviada para aprovação do cliente", "Gmail")
    add("Compras", "compras", "Ordem de compra de insumos lançada", "Conta Azul")
    add("Produção (DTF/Silk)", "producao",
        f"Produção iniciada — processo {_tipo_producao(p['produto'])}", "Trello")
    add("Conferência", "trello", "Card movido para Conferência", "Trello")
    add("Expedição", "expedicao", "Pedido embalado e pronto para coleta", "Trello")

    # Logística (transportadora)
    add("Entrega", "logistica", f"Coleta realizada — a caminho do cliente", transportadora)
    add("Entregue", "logistica",
        "Entregue ao cliente — comprovante de entrega recebido", transportadora)

    # WhatsApp do cliente aguardando (recente, vira destaque no painel)
    if p.get("aguardando"):
        # offset pequeno e negativo a partir de agora para parecer "agora mesmo"
        ts = (BASE_NOW - timedelta(minutes=35 if num == "C100470" else 60)).replace(tzinfo=None)
        eventos.append(Evento(
            tipo="whatsapp", descricao=p["msg"], sistema_origem="WhatsApp", timestamp=ts,
        ))

    return eventos


def seed() -> None:
    print("Recriando o banco (drop + create)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for p in PEDIDOS_SEED:
            historico = _build_historico(p)
            data_criacao = historico[0].entrou_em  # entrada no Lead
            pedido = Pedido(
                numero=p["numero"],
                is_lead=p.get("is_lead", False),
                cliente_nome=p["cliente"],
                cliente_telefone=p["tel"],
                vendedor=p["vendedor"],
                produto_descricao=p["produto"],
                quantidade=p["qtd"],
                valor=float(p["valor"]),
                origem_lead=p["origem"],
                data_criacao=data_criacao,
                etapa_atual=p["etapa"],
                metodo_entrega=p["entrega"],
                status_pagamento=p["pgto"],
                nf_emitida=p.get("nf", False),
                cliente_aguardando_resposta=p.get("aguardando", False),
                motivo_alerta=p.get("motivo"),
                historico=historico,
                eventos=_build_eventos(p, historico),
            )
            db.add(pedido)
        db.commit()

        total = db.query(Pedido).count()
        leads = db.query(Pedido).filter(Pedido.is_lead.is_(True)).count()
        print(f"OK - Seed concluido: {total} pedidos ({leads} leads, {total - leads} fechados).")
        print("  Pedido heroi: C100470 (Producao/DTF - cliente aguardando resposta).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
