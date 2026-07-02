import { Link } from "react-router-dom";
import {
  TrendingUp,
  AlertTriangle,
  Gauge,
  Users,
  MessageSquare,
  PieChart,
  Activity,
} from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/hooks";
import { moeda, horasLegivel, minutosLegivel, SLA, slaCor } from "../lib/format";
import { SlaDot } from "../components/SlaBadge";
import { SistemaChip } from "../components/Sistema";
import { Loading, ErroBackend, Vazio } from "../components/States";

function Metrica({ label, valor, sub, cor }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-widest text-secondary">
        {label}
      </div>
      <div
        className="mono mt-2 text-3xl font-bold"
        style={{ color: cor || "rgb(var(--color-primary))" }}
      >
        {valor}
      </div>
      {sub && <div className="mt-1 text-xs text-secondary">{sub}</div>}
    </div>
  );
}

function PorEtapa({ por_etapa }) {
  const max = Math.max(...por_etapa.map((e) => e.quantidade), 1);
  return (
    <div className="card p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-secondary">
        Pedidos por etapa do pipeline
      </div>
      <div className="space-y-2.5">
        {por_etapa.map((e) => (
          <div key={e.etapa} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-secondary">
              {e.etapa}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(e.quantidade / max) * 100}%`,
                  background:
                    e.quantidade === 0
                      ? "transparent"
                      : "linear-gradient(90deg,#7C3AED,#A78BFA)",
                  minWidth: e.quantidade ? 6 : 0,
                }}
              />
            </div>
            <span className="mono w-6 text-right text-sm">{e.quantidade}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Funil({ funil }) {
  const etapas = [
    { label: "Leads", valor: funil.leads, cor: "#9CA3AF" },
    { label: "Negociação", valor: funil.negociacao, cor: "#A78BFA" },
    { label: "Fechados", valor: funil.fechados, cor: "#7C3AED" },
  ];
  const max = Math.max(...etapas.map((e) => e.valor), 1);
  return (
    <div className="card p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-secondary">
        Funil de vendas
      </div>
      <div className="space-y-3">
        {etapas.map((e) => (
          <div key={e.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-secondary">{e.label}</span>
              <span className="mono font-semibold">{e.valor}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(e.valor / max) * 100}%`,
                  backgroundColor: e.cor,
                  minWidth: 6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
        <div>
          <div className="mono text-2xl font-bold text-accent-2">
            {funil.taxa_conversao}%
          </div>
          <div className="text-xs text-secondary">Taxa de conversão</div>
        </div>
        <div>
          <div className="mono text-2xl font-bold">
            {funil.tempo_medio_fechamento_h
              ? horasLegivel(funil.tempo_medio_fechamento_h)
              : "—"}
          </div>
          <div className="text-xs text-secondary">Tempo médio p/ fechar</div>
        </div>
      </div>
    </div>
  );
}

function Criticos({ criticos }) {
  const LIMITE = 6;
  const mostra = criticos.slice(0, LIMITE);
  const resto = criticos.length - mostra.length;
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <SlaDot cor="vermelho" /> Pedidos críticos
        {criticos.length > 0 && (
          <span className="ml-auto mono text-sm font-bold text-sla-vermelho">
            {criticos.length}
          </span>
        )}
      </div>
      {criticos.length === 0 ? (
        <Vazio>Nenhum pedido em estado crítico.</Vazio>
      ) : (
        <div className="space-y-2">
          {mostra.map((p) => (
            <Link
              key={p.numero}
              to={`/pedido/${encodeURIComponent(p.numero)}`}
              className="block rounded-lg border border-line bg-surface-2/40 px-3 py-2.5 transition-colors hover:border-sla-vermelho/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="pedido-num font-semibold">{p.numero}</span>
                    <span className="truncate text-sm text-primary">
                      {p.cliente_nome}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">{p.etapa_atual}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mono text-sm text-sla-vermelho">
                    {horasLegivel(p.horas_na_etapa)}
                  </div>
                  <div className="text-xs text-secondary">{moeda(p.valor)}</div>
                </div>
              </div>
              {p.motivo_alerta && (
                <div className="mt-1.5 border-t border-line/60 pt-1.5 text-xs leading-snug text-secondary">
                  {p.motivo_alerta}
                </div>
              )}
            </Link>
          ))}
          {resto > 0 && (
            <div className="pt-1 text-center text-xs text-secondary">
              +{resto} outro{resto === 1 ? "" : "s"} pedido{resto === 1 ? "" : "s"} no
              vermelho
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Carteira ativa (R$ em jogo) por vendedor, com quantos pedidos e em alerta.
function RankingVendedores({ vendedores }) {
  if (!vendedores?.length) return null;
  const max = Math.max(...vendedores.map((v) => v.valor), 1);
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <Users className="h-4 w-4" /> Carteira por vendedor
      </div>
      <div className="space-y-3.5">
        {vendedores.map((v) => (
          <div key={v.vendedor}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-primary">{v.vendedor}</span>
              <span className="mono font-semibold">{moeda(v.valor)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(v.valor / max) * 100}%`,
                  background: "linear-gradient(90deg,#7C3AED,#A78BFA)",
                  minWidth: 6,
                }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-secondary">
              <span>
                {v.pedidos} pedido{v.pedidos === 1 ? "" : "s"} ativo
                {v.pedidos === 1 ? "" : "s"}
              </span>
              {v.em_alerta > 0 && (
                <span className="text-sla-amarelo">{v.em_alerta} em alerta</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Clientes que mandaram mensagem e aguardam resposta — ação imediata.
function Aguardando({ itens }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <MessageSquare className="h-4 w-4 text-sla-verde" /> Aguardando resposta do
        cliente
      </div>
      {!itens?.length ? (
        <Vazio>Nenhum cliente aguardando resposta agora.</Vazio>
      ) : (
        <div className="space-y-2">
          {itens.map((p) => (
            <Link
              key={p.numero}
              to={`/pedido/${encodeURIComponent(p.numero)}`}
              className="block rounded-lg border border-line bg-surface-2/40 px-3 py-2.5 transition-colors hover:border-sla-verde/50"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <SlaDot cor={p.cor} />
                  <span className="pedido-num font-semibold">{p.numero}</span>
                  <span className="truncate text-sm text-primary">
                    {p.cliente_nome}
                  </span>
                </div>
                <span className="mono shrink-0 text-xs text-secondary">
                  {p.etapa_atual} · {horasLegivel(p.horas_na_etapa)}
                </span>
              </div>
              {p.mensagem && (
                <div className="mt-1 truncate text-xs text-secondary">
                  “{p.mensagem}”
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Cores das fatias na composição da carteira. Pagamento usa os tokens de SLA
// (acompanham o tema claro/escuro); as demais são cores de categoria fixas.
const FATIA = {
  pago: slaCor("verde"),
  parcial: slaCor("amarelo"),
  pendente: slaCor("vermelho"),
  Lalamove: "#D97706",
  Correios: "#CA8A04",
  "RD Station": "#059669",
  Direto: "#6D28D9",
};

function BarraSegmentada({ dados }) {
  const entradas = Object.entries(dados || {}).filter(([, n]) => n > 0);
  const total = entradas.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
        {entradas.map(([k, n]) => (
          <div
            key={k}
            style={{ width: `${(n / total) * 100}%`, backgroundColor: FATIA[k] || "#9CA3AF" }}
            title={`${k}: ${n}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-secondary">
        {entradas.map(([k, n]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: FATIA[k] || "#9CA3AF" }}
            />
            <span className="capitalize">{k}</span>
            <span className="mono text-primary">{n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Composicao({ composicao }) {
  if (!composicao) return null;
  const grupos = [
    { titulo: "Pagamento", dados: composicao.pagamento },
    { titulo: "Transportadora", dados: composicao.entrega },
    { titulo: "Origem do lead", dados: composicao.origem },
  ];
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <PieChart className="h-4 w-4" /> Composição da carteira ativa
      </div>
      <div className="space-y-4">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="mb-1.5 text-xs text-secondary">{g.titulo}</div>
            <BarraSegmentada dados={g.dados} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Feed das últimas movimentações, com o sistema de origem de cada evento.
function AtividadeRecente({ feed }) {
  if (!feed?.length) return null;
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <Activity className="h-4 w-4" /> Atividade recente
      </div>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {feed.map((e, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <SistemaChip sistema={e.sistema_origem} size={22} />
            <div className="min-w-0 flex-1">
              <div className="text-sm leading-snug text-primary">{e.descricao}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-secondary">
                <Link
                  to={`/pedido/${encodeURIComponent(e.numero)}`}
                  className="pedido-num hover:underline"
                >
                  {e.numero}
                </Link>
                <span>· há {minutosLegivel(e.minutos_atras)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Gargalo: a etapa que mais trava vs. o alvo de SLA, com mini-ranking.
function Gargalo({ gargalo, ranking }) {
  if (!gargalo) return null;
  const topo = ranking[0]?.fator || gargalo.fator || 1;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <TrendingUp className="h-4 w-4" /> Gargalo da operação
      </div>
      <div className="mt-3 text-lg font-semibold">{gargalo.etapa}</div>
      <div className="mt-1 text-sm text-secondary">
        média de <span className="mono text-primary">{horasLegivel(gargalo.horas_medias)}</span> na
        etapa · alvo {horasLegivel(gargalo.alvo_h)}
      </div>
      <div
        className="mt-2 inline-flex rounded-md px-2 py-1 text-xs font-medium"
        style={{
          color: slaCor(gargalo.fator >= 1 ? "vermelho" : "verde"),
          backgroundColor: slaCor(gargalo.fator >= 1 ? "vermelho" : "verde", 0.08),
        }}
      >
        {gargalo.fator}× o alvo de SLA
      </div>

      <div className="mt-4 space-y-2 border-t border-line pt-3">
        {ranking.map((e) => (
          <div key={e.etapa} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 truncate text-secondary">{e.etapa}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((e.fator / topo) * 100, 100)}%`,
                  background:
                    e.fator >= 1
                      ? "linear-gradient(90deg,#DC2626,#F59E0B)"
                      : "linear-gradient(90deg,#7C3AED,#A78BFA)",
                }}
              />
            </div>
            <span
              className="mono w-9 text-right"
              style={{ color: e.fator >= 1 ? SLA.vermelho.hex : SLA.amarelo.hex }}
            >
              {e.fator}×
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Valor em risco: soma R$ dos pedidos no vermelho (furando o prazo).
function ValorEmRisco({ valor, pedidos }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <AlertTriangle className="h-4 w-4 text-sla-vermelho" /> Valor em risco
      </div>
      <div className="mono mt-3 text-3xl font-bold text-sla-vermelho">{moeda(valor)}</div>
      <div className="mt-1 text-sm text-secondary">
        em <span className="text-primary">{pedidos}</span> pedido{pedidos === 1 ? "" : "s"} furando
        o prazo agora
      </div>
      <p className="mt-3 text-xs leading-relaxed text-secondary/80">
        Cada pedido no vermelho é prazo estourado — retrabalho, reenvio ou cliente insatisfeito.
        O painel mostra exatamente quais são, em tempo real.
      </p>
    </div>
  );
}

// Saúde do SLA: distribuição dos pedidos ativos entre no prazo / atenção / crítico.
function SaudeSLA({ dist }) {
  if (!dist) return null;
  const itens = [
    { key: "verde", label: "No prazo", valor: dist.verde },
    { key: "amarelo", label: "Atenção", valor: dist.amarelo },
    { key: "vermelho", label: "Crítico", valor: dist.vermelho },
  ];
  const total = itens.reduce((a, i) => a + i.valor, 0) || 1;
  const pct = (n) => Math.round((n / total) * 100);
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-secondary">
        <Gauge className="h-4 w-4" /> Saúde do SLA
      </div>
      <div className="mono mt-3 text-3xl font-bold" style={{ color: slaCor("verde") }}>
        {pct(dist.verde)}%
        <span className="ml-2 align-middle text-sm font-normal text-secondary">no prazo</span>
      </div>

      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2">
        {itens.map(
          (i) =>
            i.valor > 0 && (
              <div
                key={i.key}
                style={{ width: `${(i.valor / total) * 100}%`, backgroundColor: slaCor(i.key) }}
                title={`${i.label}: ${i.valor}`}
              />
            )
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {itens.map((i) => (
          <div key={i.key} className="flex items-center gap-2 text-sm">
            <SlaDot cor={i.key} />
            <span className="text-secondary">{i.label}</span>
            <span className="mono ml-auto font-semibold" style={{ color: slaCor(i.key) }}>
              {i.valor}
            </span>
            <span className="mono w-9 text-right text-xs text-secondary">{pct(i.valor)}%</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-secondary/70">
        Sobre {total} pedidos ativos. Os de atenção e crítico trazem o motivo junto —
        dá pra agir antes de virar atraso.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(api.dashboard, {
    intervalMs: 30000,
  });

  if (loading && !data) return <div className="p-8"><Loading /></div>;
  if (error && !data) return <div className="p-8"><ErroBackend onRetry={reload} /></div>;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard de gestão</h1>
          <p className="mt-1 text-sm text-secondary">
            Visão geral da operação · Camisetas em 12 Horas
          </p>
        </div>
        <Link
          to="/buscar"
          className="hidden rounded-lg border border-line px-4 py-2 text-sm text-secondary hover:text-primary md:block"
        >
          Buscar pedido →
        </Link>
      </div>

      {/* Métricas */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica label="Pedidos ativos" valor={data.total_ativos} sub="em produção" />
        <Metrica
          label="Em alerta"
          valor={data.em_alerta}
          sub="amarelos + vermelhos"
          cor={SLA.amarelo.hex}
        />
        <Metrica
          label="Entregues no mês"
          valor={data.entregues_no_mes}
          sub="concluídos"
          cor={SLA.verde.hex}
        />
        <Metrica
          label="Valor em produção"
          valor={moeda(data.valor_em_producao)}
          sub="em pedidos ativos"
          cor={SLA.verde.hex}
        />
      </div>

      {/* Insights da operação: gargalo, valor em risco e ROI */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-secondary">
          Insights da operação
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <SaudeSLA dist={data.sla_distribuicao} />
          <Gargalo gargalo={data.gargalo} ranking={data.ranking_etapas} />
          <ValorEmRisco valor={data.valor_em_risco} pedidos={data.pedidos_em_risco} />
        </div>
      </div>

      {/* Grid principal — duas colunas equilibradas */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PorEtapa por_etapa={data.por_etapa} />
          <RankingVendedores vendedores={data.ranking_vendedores} />
          <Composicao composicao={data.composicao} />
        </div>
        <div className="space-y-6">
          <Aguardando itens={data.aguardando_resposta} />
          <Funil funil={data.funil} />
          <Criticos criticos={data.criticos} />
        </div>
      </div>

      {/* Atividade recente — largura total fecha a página */}
      <div className="mt-6">
        <AtividadeRecente feed={data.feed} />
      </div>
    </div>
  );
}
