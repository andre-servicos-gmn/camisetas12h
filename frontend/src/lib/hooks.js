import { useCallback, useEffect, useRef, useState } from "react";

// Busca dados de uma função async, com refetch opcional por intervalo (ms).
// Mantém os dados antigos visíveis durante o refresh (sem "piscar" a tela).
export function useFetch(fn, { intervalMs = 0, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!intervalMs) return;
    const id = setInterval(() => carregar(true), intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { data, loading, error, reload: () => carregar(false) };
}

// Relógio que atualiza a cada segundo.
export function useRelogio() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return agora;
}
