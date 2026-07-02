// Histórico de conversas do assistente — persistido no localStorage do navegador.
// O backend continua sem estado: cada pergunta envia o histórico junto. Aqui só
// guardamos as conversas para o usuário reabrir e continuar depois.
const KEY = "c12h:conversas:v1";

export function carregarConversas() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function salvarConversas(lista) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch (e) {
    // localStorage indisponível (modo privado/cota) — segue sem persistir,
    // mas avisa no console para não virar perda de dados silenciosa.
    console.warn("C12H: não foi possível salvar o histórico de conversas.", e);
  }
}

export function novoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `c-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function tituloDe(mensagens) {
  const primeira = mensagens.find((m) => m.role === "user");
  const t = (primeira?.content || "Nova conversa").trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}
