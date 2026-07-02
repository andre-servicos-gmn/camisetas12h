// Utilitários de formatação (BR).

export function moeda(valor) {
  return (valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function moedaCheia(valor) {
  return (valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// "há Xh Ym" a partir de um número de horas (float).
export function horasLegivel(horas) {
  if (horas == null) return "—";
  if (horas < 1) {
    const min = Math.max(Math.round(horas * 60), 1);
    return `${min}min`;
  }
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// "há X" a partir de minutos.
export function minutosLegivel(min) {
  if (min == null) return "—";
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function dataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function horario(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Tokens de cor de SLA. `hex` aponta para a variável CSS do tema (claro/escuro),
// então dots/textos inline também acompanham o tema. Use slaCor(cor, alpha) para
// versões translúcidas (fundos, bordas, glow).
export const SLA = {
  verde: { label: "No prazo", hex: "rgb(var(--sla-verde))", text: "text-sla-verde", v: "--sla-verde" },
  amarelo: { label: "Atenção", hex: "rgb(var(--sla-amarelo))", text: "text-sla-amarelo", v: "--sla-amarelo" },
  vermelho: { label: "Crítico", hex: "rgb(var(--sla-vermelho))", text: "text-sla-vermelho", v: "--sla-vermelho" },
};

export function slaCor(cor, alpha) {
  const s = SLA[cor] || SLA.verde;
  return alpha == null ? `rgb(var(${s.v}))` : `rgb(var(${s.v}) / ${alpha})`;
}
