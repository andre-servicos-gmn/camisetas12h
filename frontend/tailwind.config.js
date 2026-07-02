/** @type {import('tailwindcss').Config} */
// Identidade: acento ROXO da marca (logo roxa). Suporta tema CLARO (padrão) e
// ESCURO via classe `.dark` no <html> — os tokens abaixo apontam para variáveis
// CSS definidas em src/index.css (canais RGB p/ permitir opacidade do Tailwind).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "rgb(var(--color-base) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-2": "rgb(var(--color-accent-2) / <alpha-value>)",
        "accent-soft": "rgb(var(--color-accent-soft) / <alpha-value>)",
        sla: {
          verde: "rgb(var(--sla-verde) / <alpha-value>)",
          amarelo: "rgb(var(--sla-amarelo) / <alpha-value>)",
          vermelho: "rgb(var(--sla-vermelho) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
        glow: "0 0 0 1px rgba(124,58,237,0.35), 0 8px 24px rgba(124,58,237,0.12)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
        fadeIn: "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
