// Estados de carregamento / erro / vazio, com a estética sóbria da marca.
import { ServerOff } from "lucide-react";

export function Loading({ label = "Carregando…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-secondary">
      <span className="h-4 w-4 rounded-full border-2 border-line border-t-accent animate-spin" />
      {label}
    </div>
  );
}

export function ErroBackend({ onRetry }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <ServerOff className="mx-auto mb-3 h-9 w-9 text-secondary" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold mb-1">Sem conexão com o servidor</h2>
      <p className="text-secondary text-sm mb-5">
        Verifique se o backend está rodando em <code>localhost:8000</code>.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-2 transition-colors"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Vazio({ children }) {
  return (
    <div className="py-12 text-center text-secondary text-sm">{children}</div>
  );
}
