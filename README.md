# Central de Inteligência Operacional — C12H

POC para a **Camisetas em 12 Horas** (cliente Nouvaris). Uma camada de
inteligência que conecta as informações de cada pedido — hoje espalhadas em
CRM, ERP, produção e comunicação — usando o **número do pedido** (`C1xxxxx`)
como identificador único, entregando uma **visão única** de cada pedido, do
lead à entrega.

> **Protótipo navegável para reunião.** Roda 100% local sobre dados **simulados**.
> Não integra sistemas reais nem autentica nada. A única chamada externa é a
> API da OpenAI, usada apenas pelo assistente de IA.

---

## O que tem dentro

| Tela | Rota | O que mostra |
|------|------|--------------|
| **Painel de TV** | `/tv` | Telão de operação: contadores, filas por setor, alertas de SLA, feed em tempo real. Auto-refresh a cada 10s. |
| **Visão Única do Pedido** | `/pedido/:numero` | Tudo de um pedido numa tela: comercial, financeiro, entrega, timeline da jornada e histórico de eventos por sistema. |
| **Dashboard de Gestão** | `/` | Métricas, pipeline por etapa, funil de vendas, carteira por vendedor, composição, clientes aguardando resposta, pedidos críticos e atividade recente. |
| **Assistente de IA** | `/assistente` | Chat em linguagem natural que consulta o banco via *tool use* (OpenAI), com histórico de conversas. |
| **Busca** | `/buscar` | Busca por `C1xxxxx` + lista navegável de todos os pedidos. |

---

## Stack

- **Backend:** Python + FastAPI + SQLAlchemy. Banco **SQLite** (zero-config para a
  POC). *Em produção, a Nouvaris entrega isto sobre **PostgreSQL** gerenciado —
  o mesmo código roda só trocando a `DATABASE_URL`.*
- **Frontend:** React + Vite + TailwindCSS + React Router. Visual claro inspirado
  no site do cliente, com acento roxo da marca.
- **IA:** *tool use* (function calling) da **OpenAI** (GPT), conforme a
  `OPENAI_API_KEY` no `.env`. Modelo configurável via `OPENAI_MODEL` (default
  `gpt-4o`; `gpt-4o-mini` é a alternativa mais barata).

---

## Como rodar (2 terminais)

### Pré-requisitos
- Python 3.11+
- Node.js 18+

### Terminal 1 — Backend (porta 8000)

```bash
cd backend

# 1. Criar e ativar o ambiente virtual
python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Git Bash) ou macOS/Linux:
source .venv/Scripts/activate   # (no Linux/Mac: source .venv/bin/activate)

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Configurar variáveis de ambiente
cp .env.example .env
#   -> abra o .env e cole a sua chave da OpenAI:
#        OPENAI_API_KEY=...
#      Sem chave, o app funciona normal e só o assistente fica "indisponível".

# 4. Popular o banco com os dados simulados (cria/zera o c12h.db)
python -m app.seed

# 5. Subir a API
uvicorn app.main:app --reload --port 8000
```

API em `http://localhost:8000` · documentação automática em `http://localhost:8000/docs`.

### Terminal 2 — Frontend (porta 5173)

```bash
cd frontend
npm install
npm run dev
```

Abra **`http://localhost:5173`**. Para o telão, abra **`http://localhost:5173/tv`**
em tela cheia.

---

## Resetar os dados da demo

O seed usa **timestamps relativos a AGORA**, então os estados de alerta ficam
sempre corretos. Para zerar e repopular (ex.: antes da reunião):

```bash
cd backend
python -m app.seed      # comando único: dropa, recria e popula o SQLite
```

---

## Variáveis de ambiente (`backend/.env`)

| Variável | Para quê | Default |
|----------|----------|---------|
| `OPENAI_API_KEY` | Habilita o assistente de IA (OpenAI). | *(vazio)* |
| `OPENAI_MODEL` | Modelo OpenAI usado pelo assistente. | `gpt-4o` |
| `FRONTEND_ORIGIN` | Origem liberada no CORS. | `http://localhost:5173` |

> Sem a chave, o assistente responde "indisponível" e o resto do app
> funciona normalmente — a demo nunca quebra ali.

O frontend lê a URL do backend em `frontend/.env` (`VITE_API_URL`, default
`http://localhost:8000`). Em produção (mesma origem) ele chama `/api/...`.

---

## Deploy (Vercel)

O projeto sobe como **um único projeto Vercel**: o frontend (Vite) é buildado e a
**própria FastAPI serve o `dist/`** além das rotas `/api/...` (via
[`api/index.py`](api/index.py) + [`vercel.json`](vercel.json)). O SQLite roda em
`/tmp` e o seed/auto-reseed recria os dados a cada cold start — a demo abre sempre
fresca. Não depende do roteamento estático da Vercel.

**Passos:**

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
   O `vercel.json` já define build, função Python e rotas — não precisa mexer.
2. **Environment Variables** (Settings → Environment Variables), com escopo
   **Production**:
   - `OPENAI_API_KEY` = sua chave da OpenAI (sem aspas) — habilita o assistente.
   - `OPENAI_MODEL` = `gpt-4o-mini` *(opcional, mais barato)*.
3. **Deploy.** Cada `git push` na `main` redeploya automaticamente.

> ⚠️ Variáveis de ambiente só valem em deploys **criados depois** de você as
> cadastrar. Se adicionar/alterar a chave, faça um **Redeploy** (Deployments →
> ⋯ → Redeploy) — senão o assistente continua "indisponível". Confira em
> `/api/health`: deve mostrar `"assistente_ia":"openai"` e o modelo.

---

## Como funciona (resumo técnico)

- **Modelo de dados:** `pedidos`, `etapas_historico`, `eventos` — unificados pelo
  número do pedido. Leads ainda não têm `C1xxxxx` (usam `L-xxxx`); o número é
  gerado no fechamento (Conta Azul).
- **Motor de SLA** (`app/sla.py`): calcula horas na etapa atual e a cor do alerta
  (verde / amarelo / vermelho) por etapa. *Para a POC usa horas de relógio; em
  produção usaria horas úteis e SLAs recalibrados com 60–90 dias de dados reais.*
- **Assistente:** o modelo decide quais ferramentas chamar
  (`buscar_pedido`, `listar_pedidos_por_etapa`, `listar_pedidos_em_alerta`,
  `metricas_gerais`); o backend executa contra o banco e devolve os dados. O
  modelo responde **só** com base no que as ferramentas retornam — nunca inventa.

---

## Estrutura

```
.
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI + CORS + rotas
│   │   ├── config.py          # .env, paths, modelo
│   │   ├── database.py        # engine/sessão SQLite
│   │   ├── models.py          # tabelas (pedidos, etapas_historico, eventos)
│   │   ├── schemas.py         # respostas Pydantic
│   │   ├── sla.py             # motor de SLA
│   │   ├── services.py        # ORM -> resposta + SLA
│   │   ├── seed.py            # dados simulados (timestamps relativos)
│   │   ├── routers/           # pedidos, painel, dashboard, integracoes, assistente
│   │   └── ai/tools.py        # ferramentas (tool use) do assistente
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/             # PainelTV, Pedido, Dashboard, Buscar, Assistente
    │   ├── components/        # Layout, SLA, Sistema, Brand, Markdown, States
    │   ├── lib/               # format, hooks, conversas
    │   └── api.js
    └── package.json
```
