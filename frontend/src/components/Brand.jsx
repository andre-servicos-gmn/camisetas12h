// Marca visível do produto: o cliente (Camisetas em 12 Horas).
// Logo oficial do cliente. A Nouvaris aparece só como crédito discreto.
import logoCliente from "../assets/camisetasem12h.png";

// Logo do cliente. `height` em px controla o tamanho (a largura é automática).
export function C12H({ className = "", height = 32 }) {
  return (
    <img
      src={logoCliente}
      alt="Camisetas em 12 Horas"
      style={{ height }}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}

// Crédito discreto no rodapé — texto pequeno, secundário. Nada além disso.
export function CreditoNouvaris({ className = "" }) {
  return <span className={`text-secondary/70 ${className}`}>por Nouvaris</span>;
}
