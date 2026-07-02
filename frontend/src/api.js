// Camada fina de acesso ao backend FastAPI.
// - Dev: backend local em :8000.
// - Produção (Vercel): mesma origem — as chamadas vão para /api/... e o
//   vercel.json roteia para a função serverless. Dá pra sobrescrever com
//   VITE_API_URL se o backend estiver noutro host.
const BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8000" : "");

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const erro = new Error(`HTTP ${res.status}`);
    erro.status = res.status;
    throw erro;
  }
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  health: () => get("/api/health"),
  painel: () => get("/api/painel"),
  dashboard: () => get("/api/dashboard"),
  pedidos: (params = "") => get(`/api/pedidos${params}`),
  pedido: (numero) => get(`/api/pedidos/${encodeURIComponent(numero)}`),
  integracoes: () => get("/api/integracoes"),
  assistente: (mensagem, historico = []) =>
    post("/api/assistente", { mensagem, historico }),
};
