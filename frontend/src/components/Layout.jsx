import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Search,
  Cable,
  Sparkles,
  MonitorPlay,
  ArrowUpRight,
} from "lucide-react";
import { C12H, CreditoNouvaris } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const ITENS = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard, end: true },
  { to: "/buscar", label: "Buscar pedido", Icon: Search },
  { to: "/assistente", label: "Assistente IA", Icon: Sparkles },
  { to: "/integracoes", label: "Integrações", Icon: Cable },
];

function BuscaRapida() {
  const [valor, setValor] = useState("");
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    const num = valor.trim().toUpperCase();
    if (num) navigate(`/pedido/${encodeURIComponent(num)}`);
  };
  return (
    <form onSubmit={submit} className="px-3 pb-3">
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar C1xxxxx…"
        className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm font-mono placeholder:font-sans placeholder:text-secondary/60 focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </form>
  );
}

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Alternância de tema — fixa no canto superior direito. */}
      <ThemeToggle className="fixed right-4 top-4 z-50 bg-surface/80 backdrop-blur" />

      {/* Sidebar — fixa no topo: continua visível ao rolar o conteúdo. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface/40 backdrop-blur md:flex">
        <div className="px-5 pt-6 pb-5">
          <C12H height={30} />
        </div>

        <BuscaRapida />

        <nav className="flex flex-col gap-1 px-3">
          {ITENS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              <it.Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="text-sm font-medium">{it.label}</span>
            </NavLink>
          ))}

          <a
            href="/tv"
            target="_blank"
            rel="noreferrer"
            className="nav-link mt-2"
            title="Abre o painel em tela cheia (ideal para o telão)"
          >
            <MonitorPlay className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="text-sm font-medium">Painel de TV</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-secondary" />
          </a>
        </nav>

        <div className="mt-auto px-5 py-4 text-[11px] leading-relaxed text-secondary/70">
          <div className="mb-1 font-medium text-secondary">C12H · POC</div>
          Camisetas em 12 Horas
          <div className="mt-2 opacity-70">Dados simulados — não é produção</div>
          <div className="mt-2"><CreditoNouvaris /></div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
