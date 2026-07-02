"""
Assistente de IA — chat em linguagem natural sobre a operação.

Usa tool use (function calling) da OpenAI: o modelo decide quais ferramentas
chamar (definidas em ai/tools.py), nós executamos contra o banco e devolvemos os
dados. O modelo responde SÓ com base no que as ferramentas retornam.

ROBUSTEZ: esta é a única chamada externa da POC. Se faltar a OPENAI_API_KEY ou a
chamada falhar, devolvemos uma mensagem amigável — o app NUNCA cai aqui.
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import config
from ..ai import tools
from ..database import get_db

router = APIRouter(prefix="/api/assistente", tags=["assistente"])

MAX_ITERACOES = 6  # trava de segurança contra loop infinito de tool use

SYSTEM_PROMPT = """\
Você é o assistente da Central de Inteligência Operacional (C12H) da Camisetas em \
12 Horas, uma gráfica de personalização. Responde ao dono/gestor da operação.

Regras:
- Responda SEMPRE em português do Brasil, de forma concisa e direta.
- Use SOMENTE os dados retornados pelas ferramentas. NUNCA invente números, \
pedidos, clientes ou prazos.
- Se um pedido não for encontrado, diga claramente que não encontrou.
- Números de pedido têm o formato C1xxxxx (fechados) ou L-xxxx (leads).
- Cores de SLA: verde = no prazo, amarelo = atenção, vermelho = crítico.
- Ao listar pedidos, destaque os mais críticos primeiro e cite o número, o \
cliente e há quanto tempo estão na etapa.
- Quando o cliente está aguardando resposta, sinalize isso com prioridade.
- Seja útil e objetivo, como um gerente de operação experiente.

Formatação (a resposta é renderizada em Markdown):
- Para detalhar UM pedido, use uma lista curta de tópicos com o rótulo em \
negrito, ex.: "- **Cliente:** ...", "- **Etapa atual:** ...". Não repita o \
número do pedido em cada linha.
- Para COMPARAR vários pedidos, use uma tabela Markdown enxuta (número, cliente, \
etapa, SLA, tempo).
- Abra com uma frase curta de contexto e, se fizer sentido, feche com a ação \
recomendada. Seja conciso — nada de parágrafos longos.
- NÃO use emojis nem ícones; o sistema já colore o SLA visualmente."""

INDISPONIVEL = (
    "Assistente indisponível no momento. As demais telas do sistema continuam "
    "funcionando normalmente."
)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    mensagem: str
    historico: list[ChatMessage] = []


class ChatResponse(BaseModel):
    resposta: str
    disponivel: bool


# ===========================================================================
# Provedor: OpenAI (GPT)
# ===========================================================================
def _tools_openai() -> list[dict]:
    """Converte as ferramentas para o formato de function calling da OpenAI."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in tools.TOOLS
    ]


def _rodar_openai(mensagem: str, historico: list[ChatMessage], db: Session) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=config.OPENAI_API_KEY)
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in historico]
    messages.append({"role": "user", "content": mensagem})

    tools_oai = _tools_openai()

    for _ in range(MAX_ITERACOES):
        resposta = client.chat.completions.create(
            model=config.OPENAI_MODEL,
            messages=messages,
            tools=tools_oai,
            max_tokens=1024,
        )
        msg = resposta.choices[0].message

        if not msg.tool_calls:
            return (msg.content or "").strip() or "Não consegui formular uma resposta."

        # Registra a mensagem do assistente (com os tool_calls) e executa cada um.
        messages.append({
            "role": "assistant",
            "content": msg.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ],
        })
        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            saida = tools.executar(tc.function.name, args, db)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(saida, ensure_ascii=False, default=str),
            })

    return "Consultei bastante o sistema, mas não cheguei a uma resposta final. Tente reformular a pergunta."


# ===========================================================================
# Endpoint
# ===========================================================================
@router.post("", response_model=ChatResponse)
def conversar(req: ChatRequest, db: Session = Depends(get_db)):
    provedor = config.ai_provider()

    # Sem chave configurada: degrada com elegância, não quebra.
    if not provedor:
        return ChatResponse(resposta=INDISPONIVEL, disponivel=False)

    try:
        texto = _rodar_openai(req.mensagem, req.historico, db)
        return ChatResponse(resposta=texto, disponivel=True)
    except Exception as exc:  # noqa: BLE001 — a demo não pode cair aqui
        print(f"[assistente/openai] erro: {type(exc).__name__}: {exc}")
        return ChatResponse(resposta=INDISPONIVEL, disponivel=False)
