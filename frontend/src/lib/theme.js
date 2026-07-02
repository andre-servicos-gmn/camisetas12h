// Tema claro/escuro. A classe `.dark` no <html> troca a paleta inteira (as cores
// vêm de variáveis CSS em index.css). A escolha fica salva no localStorage.
import { useState, useEffect } from "react";

const CHAVE = "c12h-tema";

export function temaInicial() {
  try {
    return localStorage.getItem(CHAVE) === "escuro" ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(tema) {
  const root = document.documentElement;
  if (tema === "escuro") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTema() {
  const [tema, setTema] = useState(temaInicial);
  useEffect(() => {
    aplicarTema(tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      /* sem persistência se o storage estiver indisponível */
    }
  }, [tema]);
  const alternar = () => setTema((t) => (t === "escuro" ? "claro" : "escuro"));
  return [tema, alternar];
}
