import { Sun, Moon } from "lucide-react";
import { useTema } from "../lib/theme";

// Botão de alternância de tema (claro/escuro).
export function ThemeToggle({ className = "" }) {
  const [tema, alternar] = useTema();
  const escuro = tema === "escuro";
  return (
    <button
      type="button"
      onClick={alternar}
      title={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label={escuro ? "Tema claro" : "Tema escuro"}
      className={`inline-flex items-center justify-center rounded-lg border border-line p-2 text-secondary transition-colors hover:bg-surface-2 hover:text-primary ${className}`}
    >
      {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
