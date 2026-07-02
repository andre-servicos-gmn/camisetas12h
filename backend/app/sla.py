"""
Motor de SLA — calcula a cor do alerta de cada pedido pela etapa atual.

Para cada pedido olhamos quantas horas ele está na etapa atual (entrou_em -> AGORA)
e comparamos com os limiares da etapa para gerar a cor:
  verde   = no prazo
  amarelo = atenção  (>= limiar amarelo)
  vermelho= crítico  (>= limiar vermelho)

POC: usamos HORAS DE RELÓGIO (24/7). Em produção, isto usaria HORAS ÚTEIS
(considerando expediente, fins de semana e feriados) e os limiares seriam
recalibrados com 60-90 dias de dados reais de operação da Camisetas em 12 Horas.
"""
from __future__ import annotations

from datetime import datetime, timezone

# Limiares por etapa: (amarelo_h, vermelho_h). Etapas sem SLA definido não
# disparam alerta de tempo (Lead, Aprovação interna concluída, Entregue).
SLA_LIMIARES: dict[str, tuple[float, float]] = {
    "Negociação": (48, 120),          # 120h = 5 dias
    "Layout": (4, 8),
    "Arte Final": (4, 8),
    "Aprovação": (12, 24),            # aguardando o cliente aprovar
    "Compras": (12, 24),
    "Produção (DTF/Silk)": (8, 16),
    "Conferência": (4, 8),
    "Expedição": (12, 24),
    "Entrega": (24, 48),
}

# Ordem de severidade para ranquear/contabilizar.
SEVERIDADE = {"verde": 0, "amarelo": 1, "vermelho": 2}


def agora() -> datetime:
    """AGORA, sempre — fonte única de 'tempo presente' do motor."""
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    """Garante datetime tz-aware em UTC (o SQLite devolve naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def horas_na_etapa(entrou_em: datetime, ref: datetime | None = None) -> float:
    """Horas decorridas desde que o pedido entrou na etapa atual."""
    ref = ref or agora()
    delta = ref - _as_utc(entrou_em)
    return max(delta.total_seconds() / 3600.0, 0.0)


def cor_sla(etapa: str, horas: float) -> str:
    """Cor do alerta para uma etapa e o tempo nela."""
    limiares = SLA_LIMIARES.get(etapa)
    if not limiares:
        return "verde"  # etapa sem SLA de tempo
    amarelo, vermelho = limiares
    if horas >= vermelho:
        return "vermelho"
    if horas >= amarelo:
        return "amarelo"
    return "verde"


def avaliar_pedido(etapa_atual: str, entrou_em: datetime, ref: datetime | None = None) -> dict:
    """
    Avaliação de SLA completa de um pedido na etapa atual.
    Retorna horas, cor e os limiares aplicados (útil pro front explicar o porquê).
    """
    horas = horas_na_etapa(entrou_em, ref)
    cor = cor_sla(etapa_atual, horas)
    limiares = SLA_LIMIARES.get(etapa_atual)
    return {
        "horas_na_etapa": round(horas, 1),
        "cor": cor,
        "limiar_amarelo_h": limiares[0] if limiares else None,
        "limiar_vermelho_h": limiares[1] if limiares else None,
    }
