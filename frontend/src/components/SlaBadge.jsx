import { SLA, slaCor } from "../lib/format";

// Bolinha de SLA (para cards compactos).
export function SlaDot({ cor, className = "" }) {
  const s = SLA[cor] || SLA.verde;
  return (
    <span
      className={`inline-block rounded-full ${className}`}
      style={{
        width: 10,
        height: 10,
        backgroundColor: s.hex,
        boxShadow: `0 0 10px ${slaCor(cor, 0.6)}`,
      }}
      title={s.label}
    />
  );
}

// Badge textual de SLA.
export function SlaBadge({ cor, big = false }) {
  const s = SLA[cor] || SLA.verde;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full font-medium ${
        big ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        color: s.hex,
        backgroundColor: slaCor(cor, 0.1),
        border: `1px solid ${slaCor(cor, 0.25)}`,
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 7, height: 7, backgroundColor: s.hex }}
      />
      {s.label}
    </span>
  );
}

// Borda lateral colorida usada nos cards do painel.
export function slaBorder(cor) {
  return { borderLeft: `3px solid ${slaCor(cor)}` };
}
