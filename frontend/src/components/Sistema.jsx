// Identidade visual dos sistemas de origem (Agendor, Conta Azul, Trello, etc.).
// Sistemas com logo oficial mostram a logo; os demais caem para um "chip" com
// monograma de 2 letras na cor da marca — leitura rápida, sóbria, com cara de
// produto. Nunca emoji.
import agendorLogo from "../assets/sistemas/agendor.png";
import rdstationLogo from "../assets/sistemas/rdstation.png";
import contaazulLogo from "../assets/sistemas/contaazul.jpg";
import trelloLogo from "../assets/sistemas/trello.png";
import gmailLogo from "../assets/sistemas/gmail.jpg";
import whatsappLogo from "../assets/sistemas/whatsapp.avif";
import lalamoveLogo from "../assets/sistemas/lalamove.png";
import correiosLogo from "../assets/sistemas/correios.png";

export const SISTEMAS = {
  Agendor: { mono: "Ag", cor: "#2563EB", logo: agendorLogo },
  "RD Station": { mono: "RD", cor: "#059669", logo: rdstationLogo },
  "Conta Azul": { mono: "CA", cor: "#0284C7", logo: contaazulLogo },
  Trello: { mono: "Tr", cor: "#4F46E5", logo: trelloLogo },
  WhatsApp: { mono: "Wa", cor: "#16A34A", logo: whatsappLogo },
  Gmail: { mono: "Gm", cor: "#DC2626", logo: gmailLogo },
  Lalamove: { mono: "La", cor: "#D97706", logo: lalamoveLogo },
  Correios: { mono: "Co", cor: "#CA8A04", logo: correiosLogo },
};

const FALLBACK = { mono: "··", cor: "#9CA3AF" };

// Quadradinho com a logo do sistema (ou o monograma, na cor da marca, se não
// houver logo).
export function SistemaChip({ sistema, size = 22 }) {
  const s = SISTEMAS[sistema] || FALLBACK;
  if (s.logo) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white"
        style={{ width: size, height: size }}
        title={sistema}
      >
        <img
          src={s.logo}
          alt={sistema}
          loading="lazy"
          className="h-full w-full object-contain"
        />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-mono font-semibold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        color: s.cor,
        backgroundColor: `${s.cor}1A`,
        border: `1px solid ${s.cor}33`,
      }}
      aria-hidden
    >
      {s.mono}
    </span>
  );
}

// Etiqueta completa: chip + nome do sistema.
export function SistemaTag({ sistema }) {
  const s = SISTEMAS[sistema] || FALLBACK;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-2 text-xs font-medium"
      style={{ color: s.cor, backgroundColor: `${s.cor}12` }}
    >
      <SistemaChip sistema={sistema} size={18} />
      {sistema}
    </span>
  );
}
