"""Endpoints de pedidos: lista (com filtros) e visão única por número."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import services
from ..database import get_db
from ..schemas import PedidoDetalhe, PedidoResumo

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])


@router.get("", response_model=list[PedidoResumo])
def listar_pedidos(
    db: Session = Depends(get_db),
    etapa: str | None = Query(None, description="Filtra por etapa exata"),
    cor: str | None = Query(None, description="Filtra por cor de SLA: verde|amarelo|vermelho"),
    incluir_leads: bool = Query(True),
):
    resumos = [services.pedido_resumo(p) for p in services.todos_pedidos(db)]
    if etapa:
        resumos = [r for r in resumos if r["etapa_atual"] == etapa]
    if cor:
        resumos = [r for r in resumos if r["cor"] == cor]
    if not incluir_leads:
        resumos = [r for r in resumos if not r["is_lead"]]
    # Ordena por severidade (vermelho primeiro) e, dentro, por mais tempo na etapa.
    from ..sla import SEVERIDADE
    resumos.sort(key=lambda r: (-SEVERIDADE.get(r["cor"], 0), -r["horas_na_etapa"]))
    return resumos


@router.get("/{numero}", response_model=PedidoDetalhe)
def obter_pedido(numero: str, db: Session = Depends(get_db)):
    p = services.buscar_por_numero(db, numero)
    if not p:
        raise HTTPException(status_code=404, detail=f"Pedido {numero} não encontrado")
    return services.pedido_detalhe(p)
