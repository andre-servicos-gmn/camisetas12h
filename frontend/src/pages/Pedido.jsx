import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, PackageSearch, AlertTriangle } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/hooks";
import { moedaCheia, horasLegivel, dataHora, SLA, slaCor } from "../lib/format";
import { SlaBadge } from "../components/SlaBadge";
import { SistemaTag, SistemaChip } from "../components/Sistema";
import { Loading } from "../components/States";

function Cartao({ titulo, children }) {
  return (
    <div className="card p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-secondary">
        {titulo}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Linha({ k, children }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-secondary">{k}</span>
      <span className="text-primary font-medium text-right">{children}</span>
    </div>
  );
}

function StatusPagamento({ status }) {
  const cor = { pago: "#22C55E", parcial: "#F59E0B", pendente: "#EF4444" }[status];
  return (
    <span style={{ color: cor }} className="font-medium capitalize">
      {status}
    </span>
  );
}

function Timeline({ jornada }) {
  return (
    <div className="card p-5">
      <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-secondary">
        Jornada do pedido
      </div>
      <ol className="relative">
        {jornada.map((j, i) => {
          const cor =
            j.status === "concluida"
              ? "rgb(var(--color-accent-2))"
              : j.status === "atual"
              ? "rgb(var(--color-accent))"
              : "rgb(var(--color-secondary) / 0.45)";
          const ultimo = i === jornada.length - 1;
          return (
            <li key={j.etapa} className="relative flex gap-4 pb-5 last:pb-0">
              {/* linha conectora */}
              {!ultimo && (
                <span
                  className="absolute left-[7px] top-4 h-full w-px"
                  style={{
                    background:
                      j.status === "concluida"
                        ? "rgb(var(--color-accent-2))"
                        : "rgb(var(--color-line))",
                  }}
                />
              )}
              {/* nó */}
              <span
                className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2"
                style={{
                  borderColor: cor,
                  backgroundColor: j.status === "futura" ? "transparent" : cor,
                  boxShadow:
                    j.status === "atual"
                      ? "0 0 0 4px rgb(var(--color-accent) / 0.2)"
                      : "none",
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      j.status === "futura" ? "text-secondary/60" : "text-primary"
                    }`}
                  >
                    {j.etapa}
                  </span>
                  {j.status === "atual" && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-2">
                      etapa atual
                    </span>
                  )}
                </div>
                {(j.entrou_em || j.saiu_em) && (
                  <div className="mono mt-0.5 text-xs text-secondary">
                    {j.entrou_em ? dataHora(j.entrou_em) : ""}
                    {j.saiu_em ? ` → ${dataHora(j.saiu_em)}` : ""}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Pedido() {
  const { numero } = useParams();
  const navigate = useNavigate();
  const { data: p, loading, error } = useFetch(() => api.pedido(numero), {
    deps: [numero],
  });

  if (loading) return <div className="p-8"><Loading /></div>;

  if (error) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-md py-20 text-center">
          <PackageSearch className="mx-auto mb-3 h-9 w-9 text-secondary" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold">
            Pedido <span className="pedido-num">{numero}</span> não encontrado
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Confira o número (formato C1xxxxx) e tente de novo.
          </p>
          <Link
            to="/buscar"
            className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-2"
          >
            Voltar à busca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-1 text-sm text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> voltar
      </button>

      {/* Cabeçalho */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="pedido-num text-4xl font-bold">{p.numero}</span>
              <SlaBadge cor={p.cor} big />
            </div>
            <div className="mt-2 text-xl font-semibold">{p.cliente_nome}</div>
            <div className="text-sm text-secondary">
              {p.produto_descricao} · {p.quantidade} un. · vendedor {p.vendedor}
            </div>
          </div>
          <div className="text-right">
            <div className="mono text-3xl font-bold">{moedaCheia(p.valor)}</div>
            <div className="mt-1 text-sm text-secondary">
              {p.etapa_atual} ·{" "}
              <span style={{ color: SLA[p.cor].hex }}>
                há {horasLegivel(p.horas_na_etapa)}
              </span>
            </div>
          </div>
        </div>

        {/* Motivo do alerta — por que está amarelo/vermelho */}
        {p.motivo_alerta && (
          <div
            className="mt-5 flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: slaCor(p.cor, 0.35),
              background: slaCor(p.cor, 0.08),
            }}
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: slaCor(p.cor) }}
            />
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: slaCor(p.cor) }}
              >
                Motivo do alerta
              </div>
              <div className="mt-0.5 text-primary">{p.motivo_alerta}</div>
            </div>
          </div>
        )}

        {/* Destaque WhatsApp */}
        {p.cliente_aguardando_resposta && p.mensagem_destaque && (
          <div
            className="mt-5 flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{
              borderColor: "#22C55E55",
              background: "rgba(34,197,94,0.08)",
            }}
          >
            <SistemaChip sistema="WhatsApp" size={26} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-sla-verde">
                Mensagem recebida no WhatsApp
              </div>
              <div className="mt-0.5 text-primary">“{p.mensagem_destaque}”</div>
            </div>
            <span className="ml-auto self-center rounded-full bg-sla-verde/15 px-3 py-1 text-xs font-medium text-sla-verde">
              aguardando resposta
            </span>
          </div>
        )}
      </div>

      {/* Cartões + Timeline */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Cartao titulo="Comercial">
            <Linha k="Origem do lead">{p.origem_lead}</Linha>
            <Linha k="Vendedor">{p.vendedor}</Linha>
            <Linha k="Telefone">
              <span className="mono">{p.cliente_telefone}</span>
            </Linha>
            <Linha k="Criado em">{dataHora(p.data_criacao)}</Linha>
          </Cartao>

          <Cartao titulo="Financeiro">
            <Linha k="Pagamento">
              <StatusPagamento status={p.status_pagamento} />
            </Linha>
            <Linha k="Nota fiscal">
              {p.nf_emitida ? (
                <span className="text-sla-verde">emitida</span>
              ) : (
                <span className="text-sla-amarelo">pendente</span>
              )}
            </Linha>
            <Linha k="Valor">{moedaCheia(p.valor)}</Linha>
          </Cartao>

          <Cartao titulo="Entrega">
            <Linha k="Método">{p.metodo_entrega}</Linha>
            <Linha k="Etapa atual">{p.etapa_atual}</Linha>
            <Linha k="SLA">
              <SlaBadge cor={p.cor} />
            </Linha>
          </Cartao>
        </div>

        <div className="lg:col-span-1">
          <Timeline jornada={p.jornada} />
        </div>

        {/* Histórico de eventos */}
        <div className="lg:col-span-1">
          <div className="card p-5">
            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-secondary">
              Histórico de eventos
            </div>
            <div className="space-y-3">
              {p.eventos.map((e) => (
                <div key={e.id} className="border-l border-line pl-3">
                  <div className="flex items-center justify-between gap-2">
                    <SistemaTag sistema={e.sistema_origem} />
                    <span className="mono text-xs text-secondary shrink-0">
                      {dataHora(e.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-primary">{e.descricao}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
