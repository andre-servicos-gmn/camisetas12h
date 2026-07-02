import { Bell } from "lucide-react";
import { api } from "../api";
import { useFetch, useRelogio } from "../lib/hooks";
import { horasLegivel, minutosLegivel, horario, SLA } from "../lib/format";
import { SlaDot, slaBorder } from "../components/SlaBadge";
import { C12H, CreditoNouvaris } from "../components/Brand";
import { ThemeToggle } from "../components/ThemeToggle";
import { Loading, ErroBackend } from "../components/States";

function Contador({ cor, valor, label }) {
  const s = SLA[cor];
  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-block rounded-full"
        style={{ width: 14, height: 14, backgroundColor: s.hex, boxShadow: `0 0 16px ${s.hex}` }}
      />
      <div className="leading-none">
        <div className="font-mono text-4xl font-bold" style={{ color: s.hex }}>
          {valor}
        </div>
        <div className="text-xs uppercase tracking-widest text-secondary mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

function CardPedido({ p }) {
  // Cliente aguardando resposta = destaque máximo, independente da cor do SLA.
  const aguardando = p.cliente_aguardando_resposta;
  return (
    <div
      className={`card p-3 animate-fadeIn${
        aguardando ? " ring-2 ring-sla-amarelo/70 animate-pulseSoft" : ""
      }`}
      style={slaBorder(p.cor)}
    >
      <div className="flex items-center justify-between">
        <span className="pedido-num text-lg font-bold">{p.numero}</span>
        <SlaDot cor={p.cor} />
      </div>
      <div className="mt-1 truncate text-sm text-primary" title={p.cliente_nome}>
        {p.cliente_nome}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-secondary">
        <span className="truncate">{p.produto_descricao}</span>
        <span className="mono shrink-0 ml-2" style={{ color: SLA[p.cor].hex }}>
          {horasLegivel(p.horas_na_etapa)}
        </span>
      </div>
      {aguardando && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-sla-amarelo">
          <Bell className="h-3 w-3" /> cliente aguardando
        </div>
      )}
    </div>
  );
}

function Coluna({ col }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-secondary">
          {col.titulo}
        </h2>
        <span className="mono rounded-full bg-surface-2 px-2 py-0.5 text-xs text-secondary">
          {col.pedidos.length}
        </span>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto pr-1">
        {col.pedidos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-secondary/60">
            fila vazia
          </div>
        ) : (
          col.pedidos.map((p) => <CardPedido key={p.numero} p={p} />)
        )}
      </div>
    </div>
  );
}

export default function PainelTV() {
  const relogio = useRelogio();
  const { data, loading, error, reload } = useFetch(api.painel, {
    intervalMs: 10000,
  });

  if (loading && !data) return <Loading label="Carregando painel…" />;
  if (error && !data) return <ErroBackend onRetry={reload} />;

  const { contadores, destaques, colunas, feed } = data;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base px-8 py-6">
      {/* Cabeçalho */}
      <header className="flex shrink-0 items-center justify-between border-b border-line pb-5">
        <div className="flex items-center gap-5">
          <C12H height={44} />
          <div className="h-8 w-px bg-line" />
          <div>
            <div className="text-xl font-semibold">Painel de Operação</div>
            <div className="text-xs uppercase tracking-widest text-secondary">
              Central de Inteligência Operacional · C12H
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <Contador cor="verde" valor={contadores.verde} label="No prazo" />
          <Contador cor="amarelo" valor={contadores.amarelo} label="Atenção" />
          <Contador cor="vermelho" valor={contadores.vermelho} label="Crítico" />
          <div className="ml-2 text-right">
            <div className="mono text-3xl font-bold tabular-nums">
              {horario(relogio.toISOString())}
            </div>
            <div className="text-xs text-secondary">
              {relogio.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Faixa de destaque: clientes aguardando resposta */}
      {destaques.length > 0 && (
        <div className="mt-4 shrink-0 space-y-2">
          {destaques.map((d) => (
            <div
              key={d.numero}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 animate-pulseSoft"
              style={{
                borderColor: "#F59E0B66",
                background:
                  "linear-gradient(90deg, rgba(245,158,11,0.14), rgba(245,158,11,0.04))",
              }}
            >
              <Bell className="h-6 w-6 shrink-0 text-sla-amarelo" />
              <div className="flex-1">
                <span className="text-lg font-semibold text-sla-amarelo">
                  Cliente perguntando sobre{" "}
                  <span className="pedido-num">{d.numero}</span>
                </span>
                <span className="ml-2 text-primary">
                  — {d.etapa_atual}, há {horasLegivel(d.horas_na_etapa)} na etapa
                </span>
                {d.mensagem && (
                  <div className="text-sm text-secondary mt-0.5">“{d.mensagem}”</div>
                )}
              </div>
              <span className="text-xs uppercase tracking-widest text-sla-amarelo">
                responder
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Corpo: filas por setor + feed */}
      <div className="mt-5 flex flex-1 gap-6 overflow-hidden">
        <div className="flex flex-1 gap-5 overflow-hidden">
          {colunas.map((col) => (
            <Coluna key={col.titulo} col={col} />
          ))}
        </div>

        {/* Feed de movimentações */}
        <aside className="flex w-80 shrink-0 flex-col">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-secondary">
            Movimentações
          </h2>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1">
            {feed.map((f, i) => (
              <div
                key={i}
                className="rounded-lg border border-line bg-surface/60 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="pedido-num font-semibold">{f.numero}</span>
                  <span className="mono text-xs text-secondary">
                    há {minutosLegivel(f.minutos_atras)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-secondary leading-snug">
                  {f.descricao}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Rodapé sutil */}
      <footer className="mt-3 shrink-0 flex items-center justify-between border-t border-line pt-3 text-[11px] text-secondary/60">
        <span>Atualização automática a cada 10s</span>
        <span>Visão única do pedido, do lead à entrega · <CreditoNouvaris /></span>
      </footer>
    </div>
  );
}
