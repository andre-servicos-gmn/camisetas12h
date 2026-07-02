# Central de Inteligência Operacional — C12H
### Documentação completa do produto (POC)

Camisetas em 12 Horas · *por Nouvaris*

Este documento descreve **tudo o que existe na POC**: o que ela é, como é construída, o
modelo de dados, as telas, a inteligência e — em detalhe — o **visual**. É a referência
única para entender e apresentar o C12H.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Arquitetura & stack](#2-arquitetura--stack)
3. [Modelo de dados](#3-modelo-de-dados)
4. [Motor de SLA](#4-motor-de-sla)
5. [Seed de dados (a demo)](#5-seed-de-dados-a-demo)
6. [Endpoints REST](#6-endpoints-rest)
7. [Assistente de IA](#7-assistente-de-ia)
8. [As telas](#8-as-telas)
9. [Insights de fechamento](#9-insights-de-fechamento)
10. [Aba de Integrações](#10-aba-de-integrações)
11. [O VISUAL (em detalhe)](#11-o-visual-em-detalhe)
12. [Como rodar](#12-como-rodar)
13. [Estrutura de arquivos](#13-estrutura-de-arquivos)
14. [Decisões de projeto](#14-decisões-de-projeto)
15. [POC vs. produção](#15-poc-vs-produção)

---

## 1. Visão geral

A **Camisetas em 12 Horas** é uma gráfica de personalização (camisetas, uniformes, brindes)
que compete por **prazo curto**. Hoje, as informações de cada pedido vivem espalhadas em
sistemas que não conversam — **CRM (Agendor)**, **ERP (Conta Azul)**, **produção (Trello)**,
**comunicação (WhatsApp/Gmail)** e **logística (Lalamove/Correios)**. Para saber a situação
real de um pedido, alguém abre vários sistemas na mão.

O **C12H** é uma camada de inteligência que conecta tudo usando o **número do pedido**
(formato `C1xxxxx`, ex.: `C100470`) como **identificador único** — entregando uma **visão
única** de cada pedido, do lead à entrega.

> **Esta é uma POC (protótipo navegável para reunião).** Roda 100% local sobre **dados
> simulados** (seed) num banco local. Não integra sistemas reais nem autentica nada. A
> **única chamada externa** é a **API da OpenAI**, usada apenas pelo assistente de IA.

---

## 2. Arquitetura & stack

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | Python · **FastAPI** · SQLAlchemy · banco **SQLite** (zero-config) |
| **Frontend** | **React** · Vite · TailwindCSS · React Router |
| **IA** | **OpenAI** (chat completions) com *function calling* (tools) |

```
Frontend (React/Vite :5173)  ──HTTP/JSON──►  Backend (FastAPI :8000)  ──►  SQLite (c12h.db)
                                                      │
                                                      └──►  OpenAI API (só o assistente)
```

> **Produção:** o mesmo código roda sobre **PostgreSQL** gerenciado (basta trocar a
> `DATABASE_URL`) e as integrações reais alimentariam o mesmo modelo de dados por
> **conectores próprios** (código, sem no-code).

---

## 3. Modelo de dados

Três tabelas, unificadas pelo número do pedido (`backend/app/models.py`):

- **`pedidos`** — a visão única: `numero` (C1xxxxx ou L-xxxx), `is_lead`, `cliente_nome`,
  `cliente_telefone`, `vendedor`, `produto_descricao`, `quantidade`, `valor`, `origem_lead`,
  `data_criacao`, `etapa_atual`, `metodo_entrega`, `status_pagamento`, `nf_emitida`,
  `cliente_aguardando_resposta`.
- **`etapas_historico`** — o trilho de cada etapa: `pedido_id`, `etapa`, `entrou_em`,
  `saiu_em` (`null` = etapa atual).
- **`eventos`** — o feed cru por sistema: `pedido_id`, `tipo`, `descricao`, `timestamp`,
  `sistema_origem`.

**Pipeline canônico (11 etapas, em ordem):**

```
Lead → Negociação → Layout → Arte Final → Aprovação → Compras →
Produção (DTF/Silk) → Conferência → Expedição → Entrega → Entregue
```

> O número `C1xxxxx` só é gerado no **fechamento** (na Conta Azul). Por isso, registros em
> **Lead/Negociação** ainda não têm número — usam um id temporário `L-xxxx`. O campo
> `is_lead` distingue os dois mundos.

---

## 4. Motor de SLA

Para cada pedido, o motor (`backend/app/sla.py`) calcula **quantas horas ele está na etapa
atual** (`entrou_em` → agora) e gera uma **cor de alerta**:

🟢 **verde** (no prazo) · 🟡 **amarelo** (atenção) · 🔴 **vermelho** (crítico)

| Etapa | Amarelo (≥) | Vermelho (≥) |
|-------|:----------:|:-----------:|
| Negociação | 48h | 120h (5 dias) |
| Layout | 4h | 8h |
| Arte Final | 4h | 8h |
| Aprovação (cliente) | 12h | 24h |
| Compras | 12h | 24h |
| Produção (DTF/Silk) | 8h | 16h |
| Conferência | 4h | 8h |
| Expedição | 12h | 24h |
| Entrega | 24h | 48h |

**Regra extra:** se `cliente_aguardando_resposta = true`, o pedido entra em **destaque
máximo** ("Cliente perguntando sobre o pedido"), independente da cor do SLA.

> **POC:** usa **horas de relógio** (24/7). Em produção usaria **horas úteis** (expediente,
> fins de semana, feriados) com limiares recalibrados a partir de 60–90 dias de dados reais.

---

## 5. Seed de dados (a demo)

O que torna a demo convincente (`backend/app/seed.py`): **~22 registros** realistas de uma
gráfica brasileira.

- **18 pedidos fechados** (com `C1xxxxx`, a partir de `C100470`) espalhados por todas as
  etapas de produção + **4 leads** (`L-xxxx`) no topo do funil.
- Clientes realistas (academias, colégios, times de várzea, igrejas, restaurantes…),
  produtos realistas ("80 camisetas DTF", "120 uniformes silk"…), 4 vendedores, valores de
  R$ 800 a R$ 18.000, pagamento/NF/entrega variados.
- **Timestamps relativos a AGORA** (`entrou_em = agora − N horas`) → os estados de alerta
  ficam **sempre corretos**, toda vez que a demo roda. Vários amarelos e ≥ 3–4 vermelhos
  plantados de propósito.
- **Pedido herói: `C100470`** — em **Produção (DTF/Silk)**, com
  `cliente_aguardando_resposta = true` e um evento recente de WhatsApp
  ("Cliente perguntou: 'meu pedido C100470 já está pronto?'").
- Cada pedido tem `etapas_historico` coerente (passou pelas etapas anteriores) e 4–8 eventos
  de sistemas diferentes, deixando a timeline rica.

**Resetar a demo:** `python -m app.seed` (dropa, recria e repopula o SQLite).

---

## 6. Endpoints REST

Base: `http://localhost:8000` · documentação automática em `/docs`.

| Método | Rota | Retorna |
|--------|------|---------|
| GET | `/api/pedidos` | Lista de pedidos (filtros: `etapa`, `cor`, `incluir_leads`), já com cor de SLA |
| GET | `/api/pedidos/{numero}` | Visão única completa: cabeçalho, jornada, eventos, mensagem em destaque |
| GET | `/api/painel` | Dados do Painel de TV: contadores, destaques, filas por setor, feed |
| GET | `/api/dashboard` | Métricas, pipeline, funil, críticos **+ insights** (gargalo, valor em risco, ranking) |
| GET | `/api/produtos` | Catálogo (mock) de produtos do cliente |
| GET | `/api/integracoes` | Sistemas conectados, eventos sincronizados e última atividade por sistema |
| POST | `/api/assistente` | Resposta do assistente de IA (`{ resposta, disponivel }`) |
| GET | `/api/health` | Sanidade: banco populado? provedor de IA? modelo ativo? |

---

## 7. Assistente de IA

Chat em linguagem natural sobre a operação, via **OpenAI** com *function calling*
(`backend/app/routers/assistente.py` + `backend/app/ai/tools.py`).

**Ferramentas (tools) que o modelo pode chamar contra o banco:**

| Tool | O que faz |
|------|-----------|
| `buscar_pedido(numero)` | Encontra um pedido específico |
| `listar_pedidos_por_etapa(etapa)` | Lista pedidos numa etapa |
| `listar_pedidos_em_alerta(cor?)` | Lista amarelos/vermelhos (cor opcional) |
| `metricas_gerais()` | Métricas gerais da operação |

**Fluxo:** envia a mensagem + a definição das tools → quando o modelo pede uma tool, o
backend executa a query e devolve os dados → o modelo formula a resposta final **só com base
no que as ferramentas retornam** (nunca inventa).

Responde a perguntas como *"Como está a operação hoje?"*, *"Quais pedidos estão atrasados?"*,
*"Onde está o pedido C100470?"*, *"Quantos pedidos estão em produção?"*.

**Configuração** (`.env`): `OPENAI_API_KEY` e `OPENAI_MODEL` (default **`gpt-4o`**;
`gpt-4o-mini` é a alternativa mais barata).

> **Robustez:** se faltar a chave ou a chamada falhar, o assistente responde
> *"Assistente indisponível no momento"* — o resto do app continua funcionando. **A demo
> nunca quebra aqui.**

---

## 8. As telas

| Tela | Rota | O que mostra |
|------|------|--------------|
| **Dashboard de gestão** | `/` | Métricas, pipeline por etapa, mini-funil de vendas, pedidos críticos **+ insights** |
| **Painel de TV** | `/tv` | Telão de operação: contadores grandes, faixa de "cliente aguardando", filas por setor, feed. Auto-refresh a cada **10s** |
| **Visão Única do Pedido** | `/pedido/:numero` | Tudo de um pedido numa tela: cabeçalho com SLA, cartões (Comercial/Financeiro/Entrega), **timeline** da jornada, histórico de eventos por sistema |
| **Buscar** | `/buscar` | Busca por `C1xxxxx` + lista navegável de todos os pedidos |
| **Integrações** | `/integracoes` | Os sistemas conectados e como tudo converge no número do pedido |
| **Produtos** | `/produtos` | Catálogo da linha de personalização do cliente (bônus) |
| **Assistente IA** | `/assistente` | Chat em linguagem natural sobre a operação |

**Painel de TV** é a peça principal: pensado para tela cheia, lido de longe, alto contraste.
Topo com a **logo do cliente**, relógio e contadores (No prazo / Atenção / Crítico); faixa de
destaque para clientes aguardando resposta; filas por setor (Arte, DTF/Silk, Conferência,
Expedição) em colunas, cada pedido um card com nº (mono), cliente, tempo na etapa e cor de
SLA; e um feed lateral com as últimas movimentações.

---

## 9. Insights de fechamento

Seção **"Insights da operação"** no Dashboard — inteligência que o cliente **não tem hoje**,
calculada dos próprios dados:

- **Gargalo da operação** — a etapa onde os pedidos mais travam vs. o alvo de SLA
  (ex.: *"Produção (DTF/Silk): 11,5h vs. alvo 8h = 1,43× o SLA"*), com um mini-ranking das
  etapas mais lentas.
- **Valor em risco** — a soma em **R$** dos pedidos no vermelho (furando o prazo agora).
  Liga o SLA a dinheiro.
- **ROI / tempo economizado** — uma **calculadora configurável** (consultas/dia × minutos ×
  custo/hora) que estima as horas e o R$ por mês gastos hoje procurando status na mão.
  Serve para ajustar com o cliente na reunião.

---

## 10. Aba de Integrações

A aba `/integracoes` é a **peça de fechamento**: mostra que a inteligência **conecta o que o
cliente já usa** — ninguém troca de sistema.

- Faixa de valor: **sistemas conectados · eventos sincronizados · pedidos unificados** (dados
  reais do banco).
- Visual *"tudo converge no número do pedido"*: os sistemas → **`C1xxxxx`** → visão única.
- Cards por categoria (Marketing, CRM, ERP, Produção, Comunicação, Logística), com o papel de
  cada sistema, status **Conectado** e a **última sincronização**.

| Sistema | Categoria | Papel na jornada |
|---------|-----------|------------------|
| RD Station | Marketing | Captação e origem dos leads |
| Agendor | CRM | Funil de vendas, contatos e negociação |
| Conta Azul | ERP · Financeiro | Fechamento, NF e geração do número (`C1xxxxx`) |
| Trello | Produção | Quadro de produção: arte, DTF/silk, conferência |
| WhatsApp | Comunicação | Conversa direta com o cliente |
| Gmail | Comunicação | E-mails, propostas e aprovações |
| Lalamove | Logística | Entrega expressa na região |
| Correios | Logística | Envio e rastreio para fora |

---

## 11. O VISUAL (em detalhe)

### 11.1 Identidade

- **Marca visível = o cliente.** A **logo oficial** (`camisetasem12h.png` — camiseta + coração
  e "CAMISETAS 12 HORAS", em roxo sobre fundo transparente) aparece no topo do Painel de TV,
  no menu lateral e na tela do Assistente.
- **Acento da marca: roxo (violeta).** Usado em detalhes, no número do pedido, em elementos de
  marca e no realce de navegação.
- **Crédito discreto "por Nouvaris"** apenas no rodapé (texto pequeno, secundário). Nada além
  disso — a tela pode ser compartilhada com o cliente.

### 11.2 Tema claro (padrão) + escuro (toggle)

O sistema tem **dois temas**. O **claro é o padrão** (inspirado no site do cliente); há um
**tema escuro premium** opcional.

- **Como funciona:** as cores são **variáveis CSS** (em `src/index.css`): o bloco `:root` traz
  a paleta clara e a classe `.dark` (no `<html>`) sobrescreve com a escura. Um clique troca a
  paleta **inteira** — cards, texto, bordas, acento, SLA, timeline, tudo acompanha.
- **Toggle:** ícone de **sol/lua** fixo no **canto superior direito** (em todas as telas com
  menu) e no cabeçalho do Painel de TV. A escolha fica **salva** (localStorage) e é aplicada
  antes do primeiro paint (sem flash).

### 11.3 Paletas

**Tokens de interface**

| Token | Tema claro | Tema escuro |
|-------|:----------:|:-----------:|
| Fundo base | `#F6F7FB` | `#0A0A0F` |
| Superfície / cards | `#FFFFFF` | `#14141B` |
| Superfície 2 (inputs) | `#EFF1F7` | `#1E1E28` |
| Borda sutil | `#E4E7F0` | `#232330` |
| Texto primário | `#171A2B` | `#F5F5F7` |
| Texto secundário | `#6B7280` | `#9CA3AF` |
| Acento (roxo) | `#7C3AED` | `#8B5CF6` |
| Acento 2 (realce/texto) | `#6D28D9` | `#A78BFA` |
| Acento suave (tints) | `#EDE9FE` | `#211B33` |

**Cores de SLA** (semântica universal — só ajustam o brilho por tema)

| SLA | Tema claro | Tema escuro |
|-----|:----------:|:-----------:|
| 🟢 Verde (no prazo) | `#16A34A` | `#22C55E` |
| 🟡 Amarelo (atenção) | `#D97706` | `#F59E0B` |
| 🔴 Vermelho (crítico) | `#DC2626` | `#EF4444` |

### 11.4 Tipografia

- **Texto:** **Inter** (sans).
- **Números e métricas** (nº do pedido, valores, relógio): **JetBrains Mono** (monoespaçada).
- Fontes auto-hospedadas via `@fontsource` (sem depender de CDN externo na demo).

### 11.5 Sistema de ícones (sem emojis)

Nada de emoji — a UI tem cara de produto, não de IA:

- **Ícones de interface** (sino, busca, navegação, erro, assistente, tema…): **lucide-react**
  (ícones de linha, estética Linear/Vercel).
- **Sistemas de origem**: **chips de monograma** de 2 letras na **cor da marca** de cada um —
  em `src/components/Sistema.jsx`:

  `Ag` Agendor · `RD` RD Station · `CA` Conta Azul · `Tr` Trello · `Wa` WhatsApp ·
  `Gm` Gmail · `La` Lalamove · `Co` Correios

### 11.6 Estética geral

Muito espaço negativo, cantos arredondados suaves, linhas finas de acento roxo, tipografia
limpa. Inspiração: dashboards premium tipo **Linear/Vercel**, com o roxo do cliente como
assinatura visual. O menu lateral é **fixo** (continua visível ao rolar o conteúdo).

---

## 12. Como rodar

Há scripts de conveniência (`.bat`) na raiz e o caminho manual (2 terminais).

**Scripts rápidos (Windows):**

| Script | Para quê |
|--------|----------|
| `instalar.bat` | Instala dependências do backend e do frontend (uma vez) |
| `iniciar.bat` | Sobe backend (porta 8000) e frontend (porta 5173) |
| `resetar-dados.bat` | Repopula o banco com os dados simulados (reset da demo) |

**Manual:**

```bash
# Backend (terminal 1)
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # cole a OPENAI_API_KEY no .env
python -m app.seed              # popula o SQLite
uvicorn app.main:app --reload --port 8000

# Frontend (terminal 2)
cd frontend
npm install
npm run dev                     # abre em http://localhost:5173
```

**Variáveis de ambiente (`backend/.env`):** `OPENAI_API_KEY` (obrigatória para o assistente),
`OPENAI_MODEL` (default `gpt-4o`), `FRONTEND_ORIGIN` (CORS, default `http://localhost:5173`).
O `.env` está no `.gitignore`; use o `.env.example` como modelo. Sem chave, o app funciona
normal e só o assistente fica "indisponível".

Para o telão, abra **`http://localhost:5173/tv`** em tela cheia.

---

## 13. Estrutura de arquivos

```
Camisetas12h/
├── camisetasem12h.png            # logo do cliente
├── README.md                     # como rodar (resumo)
├── DOCUMENTACAO.md               # este documento
├── instalar.bat / iniciar.bat / resetar-dados.bat   # atalhos
├── backend/
│   ├── .env.example
│   ├── requirements.txt          # fastapi, uvicorn, SQLAlchemy, pydantic, dotenv, openai
│   └── app/
│       ├── main.py               # FastAPI + CORS + rotas + /health
│       ├── config.py             # .env, DATABASE_URL, OPENAI_*
│       ├── database.py           # engine/sessão SQLite
│       ├── models.py             # tabelas + PIPELINE
│       ├── schemas.py            # respostas Pydantic
│       ├── sla.py                # motor de SLA (limiares, cores)
│       ├── services.py           # ORM → resposta + SLA, jornada, feed
│       ├── seed.py               # dados simulados (timestamps relativos)
│       ├── catalogo.py           # catálogo de produtos (mock)
│       ├── ai/tools.py           # ferramentas (function calling) do assistente
│       └── routers/              # pedidos, painel, dashboard, produtos,
│                                 #   integracoes, assistente
└── frontend/
    ├── tailwind.config.js        # tokens → variáveis CSS (tema)
    └── src/
        ├── main.jsx              # entrada; aplica o tema salvo
        ├── App.jsx               # rotas
        ├── api.js                # cliente do backend
        ├── index.css            # variáveis de tema (:root claro / .dark escuro)
        ├── assets/camisetasem12h.png
        ├── lib/                  # format.js, hooks.js, theme.js
        ├── components/           # Layout, Brand, Sistema, SlaBadge, States, ThemeToggle
        └── pages/                # Dashboard, PainelTV, Pedido, Buscar,
                                  #   Integracoes, Produtos, Assistente
```

---

## 14. Decisões de projeto

- **Tema claro é o padrão**; o escuro existe como opção (toggle). A paleta vem de variáveis CSS.
- **Assistente é OpenAI-only.** Sem provedores alternativos e **sem nenhuma referência a como
  o sistema foi construído** — a marca visível é só a do cliente.
- **Sem emojis** na interface (lucide + chips de monograma).
- **Foco nas telas principais.** A tela `/produtos` é um bônus; o resto segue o escopo do
  protótipo.
- **Dados 100% simulados.** A única chamada externa é a OpenAI (só o assistente).

---

## 15. POC vs. produção

| Aspecto | POC (hoje) | Produção |
|---------|-----------|----------|
| Banco | SQLite (arquivo local) | **PostgreSQL** gerenciado (troca a `DATABASE_URL`) |
| Integrações | **dados simulados** (seed) | **conectores próprios** (código, sem no-code) |
| SLA | horas de relógio (24/7) | horas úteis + limiares recalibrados com dados reais |
| Autenticação | nenhuma | OAuth real por sistema |
| IA | OpenAI (assistente) | igual, com modelo configurável |

---

*Camisetas em 12 Horas · Central de Inteligência Operacional (C12H) — POC. por Nouvaris.*
