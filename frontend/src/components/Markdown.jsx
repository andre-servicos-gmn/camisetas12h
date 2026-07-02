// Renderizador de Markdown leve e sem dependências, estilizado nos tokens da
// C12H. Cobre exatamente o que o assistente produz: títulos, negrito/itálico,
// código, listas, tabelas e links. Sem emojis — o SLA é colorido pela própria UI.
import { Fragment } from "react";

// --- Inline: **negrito**, *itálico*/_itálico_, `código`, [texto](url) -------
// Tokenizador recursivo: a cada passo acha a marcação que começa mais cedo,
// emite o texto antes dela e processa o conteúdo de dentro de novo. Assim
// negrito/itálico aninhados (**negrito com *itálico***) e asteriscos soltos
// dentro do negrito funcionam — o que um split() único não daria conta.
const RE_BOLDITAL = /\*\*\*([\s\S]+?)\*\*\*/;
const RE_BOLD = /\*\*([\s\S]+?)\*\*/;
const RE_CODE = /`([^`]+?)`/;
const RE_LINK = /\[([^\]]+?)\]\(([^)]+?)\)/;
const RE_ITAL_ASTERISCO = /\*([^*\n]+?)\*/;
const RE_ITAL_UNDERLINE = /_([^_\n]+?)_/;

function renderInline(texto, prefixo = "i") {
  if (!texto) return null;
  const nodes = [];
  let resto = texto;
  let k = 0;

  while (resto) {
    const candidatos = [
      { re: RE_BOLDITAL, tipo: "bolditalico" },
      { re: RE_BOLD, tipo: "strong" },
      { re: RE_CODE, tipo: "code" },
      { re: RE_LINK, tipo: "link" },
      { re: RE_ITAL_ASTERISCO, tipo: "em" },
      { re: RE_ITAL_UNDERLINE, tipo: "em" },
    ];
    let melhor = null;
    for (const c of candidatos) {
      const m = c.re.exec(resto);
      if (m && (!melhor || m.index < melhor.m.index)) melhor = { tipo: c.tipo, m };
    }

    if (!melhor) {
      nodes.push(<Fragment key={`${prefixo}-${k++}`}>{resto}</Fragment>);
      break;
    }

    const { m, tipo } = melhor;
    if (m.index > 0) {
      nodes.push(<Fragment key={`${prefixo}-${k++}`}>{resto.slice(0, m.index)}</Fragment>);
    }
    const key = `${prefixo}-${k++}`;
    if (tipo === "bolditalico") {
      nodes.push(
        <strong key={key} className="font-semibold text-primary">
          <em>{renderInline(m[1], key)}</em>
        </strong>
      );
    } else if (tipo === "strong") {
      nodes.push(
        <strong key={key} className="font-semibold text-primary">
          {renderInline(m[1], key)}
        </strong>
      );
    } else if (tipo === "em") {
      nodes.push(<em key={key}>{renderInline(m[1], key)}</em>);
    } else if (tipo === "code") {
      nodes.push(
        <code key={key} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">
          {m[1]}
        </code>
      );
    } else {
      // só permite http(s) — nunca javascript:/data: vindos do texto do modelo.
      const href = /^https?:\/\//i.test(m[2]) ? m[2] : "#";
      nodes.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-accent-2 underline underline-offset-2"
        >
          {m[1]}
        </a>
      );
    }
    resto = resto.slice(m.index + m[0].length);
  }

  return nodes;
}

// --- Blocos -----------------------------------------------------------------
const reUL = /^\s*[-*]\s+/;
const reOL = /^\s*\d+\.\s+/;
const reHeading = /^(#{1,6})\s+(.*)$/;
const reTableRow = /^\s*\|.*\|\s*$/;
const reTableSep = /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/;

function celulas(linha) {
  return linha
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseBlocos(md) {
  const linhas = (md || "").replace(/\r\n/g, "\n").split("\n");
  const blocos = [];
  let i = 0;

  const ehTabela = (k) =>
    reTableRow.test(linhas[k] || "") && reTableSep.test(linhas[k + 1] || "");

  while (i < linhas.length) {
    const l = linhas[i];
    if (!l.trim()) {
      i++;
      continue;
    }

    if (ehTabela(i)) {
      const header = celulas(l);
      i += 2;
      const rows = [];
      while (i < linhas.length && reTableRow.test(linhas[i])) {
        rows.push(celulas(linhas[i]));
        i++;
      }
      blocos.push({ tipo: "tabela", header, rows });
      continue;
    }

    const h = reHeading.exec(l);
    if (h) {
      blocos.push({ tipo: "titulo", nivel: h[1].length, texto: h[2] });
      i++;
      continue;
    }

    if (reUL.test(l)) {
      const itens = [];
      while (i < linhas.length && reUL.test(linhas[i])) {
        itens.push(linhas[i].replace(reUL, ""));
        i++;
      }
      blocos.push({ tipo: "ul", itens });
      continue;
    }

    if (reOL.test(l)) {
      const itens = [];
      while (i < linhas.length && reOL.test(linhas[i])) {
        itens.push(linhas[i].replace(reOL, ""));
        i++;
      }
      blocos.push({ tipo: "ol", itens });
      continue;
    }

    const buff = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !reUL.test(linhas[i]) &&
      !reOL.test(linhas[i]) &&
      !reHeading.test(linhas[i]) &&
      !ehTabela(i)
    ) {
      buff.push(linhas[i]);
      i++;
    }
    blocos.push({ tipo: "p", texto: buff.join(" ") });
  }
  return blocos;
}

export default function Markdown({ children, className = "" }) {
  const blocos = parseBlocos(typeof children === "string" ? children : "");
  return (
    <div className={`space-y-2 ${className}`}>
      {blocos.map((b, i) => {
        if (b.tipo === "titulo") {
          const Tag = b.nivel <= 2 ? "h3" : "h4";
          return (
            <Tag
              key={i}
              className={`font-semibold text-primary ${
                b.nivel <= 2 ? "text-[15px]" : "text-sm"
              }`}
            >
              {renderInline(b.texto)}
            </Tag>
          );
        }
        if (b.tipo === "ul") {
          return (
            <ul key={i} className="space-y-1">
              {b.itens.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2/70" />
                  <span className="flex-1">{renderInline(it)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.tipo === "ol") {
          return (
            <ol key={i} className="space-y-1">
              {b.itens.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mono mt-px shrink-0 text-xs font-semibold text-accent-2">
                    {j + 1}.
                  </span>
                  <span className="flex-1">{renderInline(it)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (b.tipo === "tabela") {
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {b.header.map((c, j) => (
                      <th
                        key={j}
                        className="border-b border-line px-2 py-1.5 text-left font-semibold text-secondary"
                      >
                        {renderInline(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j} className="border-b border-line/60 last:border-0">
                      {r.map((c, k) => (
                        <td key={k} className="px-2 py-1.5 align-top">
                          {renderInline(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {renderInline(b.texto)}
          </p>
        );
      })}
    </div>
  );
}
