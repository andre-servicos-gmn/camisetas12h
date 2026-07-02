import { Boxes, Activity, Package, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { useFetch } from "../lib/hooks";
import { minutosLegivel } from "../lib/format";
import { SistemaChip } from "../components/Sistema";
import { Loading, ErroBackend } from "../components/States";

function Stat({ Icon, valor, label }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-2">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div>
        <div className="mono text-2xl font-bold leading-none">{valor}</div>
        <div className="mt-1 text-xs uppercase tracking-widest text-secondary">{label}</div>
      </div>
    </div>
  );
}

function CardIntegracao({ s }) {
  return (
    <div className="card flex flex-col p-5 transition-transform hover:-translate-y-0.5 hover:shadow-glow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <SistemaChip sistema={s.nome} size={40} />
          <div>
            <div className="font-semibold leading-tight">{s.nome}</div>
            <div className="text-xs text-secondary">{s.categoria}</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-sla-verde/10 px-2.5 py-1 text-[11px] font-medium text-sla-verde">
          <CheckCircle2 className="h-3.5 w-3.5" /> {s.status}
        </span>
      </div>

      <p className="mt-3 flex-1 text-sm leading-snug text-secondary">{s.papel}</p>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-secondary">
        <span>
          <span className="mono font-semibold text-primary">{s.eventos}</span> eventos
        </span>
        {s.minutos_atras != null && <span>sync há {minutosLegivel(s.minutos_atras)}</span>}
      </div>
    </div>
  );
}

export default function Integracoes() {
  const { data, loading, error, reload } = useFetch(api.integracoes);

  if (loading && !data) return <div className="p-8"><Loading label="Carregando integrações…" /></div>;
  if (error && !data) return <div className="p-8"><ErroBackend onRetry={reload} /></div>;

  // Agrupa os sistemas por categoria, preservando a ordem da jornada.
  const grupos = [];
  data.sistemas.forEach((s) => {
    let g = grupos.find((x) => x.categoria === s.categoria);
    if (!g) grupos.push((g = { categoria: s.categoria, itens: [] }));
    g.itens.push(s);
  });

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold">Integrações</h1>
      <p className="mt-1 max-w-2xl text-sm text-secondary">
        A C12H não substitui suas ferramentas — ela conecta o que você já usa.
        Cada sistema continua no seu lugar; a inteligência costura tudo pelo
        número do pedido, entregando uma visão única do lead à entrega.
      </p>

      {/* Faixa de valor */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat Icon={Boxes} valor={data.total_sistemas} label="Sistemas conectados" />
        <Stat Icon={Activity} valor={data.total_eventos} label="Eventos sincronizados" />
        <Stat Icon={Package} valor={data.pedidos_unificados} label="Pedidos unificados" />
      </div>

      {/* Como funciona: tudo converge na chave única */}
      <div className="card mt-6 p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
          Como funciona
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex flex-wrap gap-1.5">
            {data.sistemas.map((s) => (
              <SistemaChip key={s.nome} sistema={s.nome} size={30} />
            ))}
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-secondary" />
          <span className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2">
            <KeyRound className="h-4 w-4 text-accent-2" />
            <span className="pedido-num text-lg font-bold">{data.chave_unica}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-secondary" />
          <span className="font-medium">Visão única do pedido</span>
        </div>
        <p className="mt-4 text-sm text-secondary">
          O número do pedido — gerado no fechamento, na Conta Azul — é a chave que
          amarra lead, negociação, arte, produção, conversa e entrega num só lugar.
        </p>
      </div>

      {/* Sistemas por categoria */}
      <div className="mt-8 space-y-8">
        {grupos.map((g) => (
          <div key={g.categoria}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-secondary">
              {g.categoria}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.itens.map((s) => (
                <CardIntegracao key={s.nome} s={s} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-secondary/70">
        POC com dados simulados. Em produção, cada integração roda sobre um
        conector próprio (código, sem no-code), sincronizando em tempo real no
        banco gerenciado — o mesmo modelo de dados desta tela.
      </p>
    </div>
  );
}
