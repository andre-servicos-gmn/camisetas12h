import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/hooks";
import { moeda, horasLegivel, SLA } from "../lib/format";
import { SlaDot, slaBorder } from "../components/SlaBadge";
import { Loading, ErroBackend } from "../components/States";

function CardLista({ p }) {
  return (
    <Link
      to={`/pedido/${encodeURIComponent(p.numero)}`}
      className="card block p-4 transition-transform hover:-translate-y-0.5 hover:shadow-glow"
      style={slaBorder(p.cor)}
    >
      <div className="flex items-center justify-between">
        <span className="pedido-num text-lg font-bold">{p.numero}</span>
        <SlaDot cor={p.cor} />
      </div>
      <div className="mt-1 truncate font-medium">{p.cliente_nome}</div>
      <div className="truncate text-xs text-secondary">{p.produto_descricao}</div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-secondary">{p.etapa_atual}</span>
        <span className="mono" style={{ color: SLA[p.cor].hex }}>
          {horasLegivel(p.horas_na_etapa)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-secondary">
        <span>{p.vendedor}</span>
        <span className="mono">{moeda(p.valor)}</span>
      </div>
      {p.cliente_aguardando_resposta && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-sla-amarelo">
          <Bell className="h-3 w-3" /> cliente aguardando
        </div>
      )}
    </Link>
  );
}

export default function Buscar() {
  const [valor, setValor] = useState("");
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => api.pedidos());

  const submit = (e) => {
    e.preventDefault();
    const num = valor.trim().toUpperCase();
    if (num) navigate(`/pedido/${encodeURIComponent(num)}`);
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Buscar pedido</h1>
      <p className="mt-1 text-sm text-secondary">
        Digite o número (C1xxxxx) ou escolha um pedido da lista para abrir a
        visão única.
      </p>

      <form onSubmit={submit} className="mt-5 flex gap-3">
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex.: C100470"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 font-mono text-lg placeholder:font-sans placeholder:text-base placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-2"
        >
          Abrir
        </button>
      </form>

      <div className="mt-8 mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-secondary">
          Todos os pedidos
        </h2>
        {data && (
          <span className="text-xs text-secondary">{data.length} registros</span>
        )}
      </div>

      {loading && !data && <Loading />}
      {error && !data && <ErroBackend onRetry={reload} />}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <CardLista key={p.numero} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
