import { useEffect, useRef, useState } from "react";
import { Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
import { api } from "../api";
import { C12H } from "../components/Brand";
import Markdown from "../components/Markdown";
import { dataHora } from "../lib/format";
import {
  carregarConversas,
  salvarConversas,
  novoId,
  tituloDe,
} from "../lib/conversas";

const SUGESTOES = [
  "Como está a operação hoje?",
  "Quais pedidos estão atrasados?",
  "Onde está o pedido C100470?",
  "Quantos pedidos estão em produção?",
];

function Bolha({ msg }) {
  const usuario = msg.role === "user";
  return (
    <div className={`flex ${usuario ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          usuario
            ? "whitespace-pre-wrap bg-accent text-white rounded-br-sm"
            : "card rounded-bl-sm text-primary"
        } ${msg.indisponivel ? "border-sla-amarelo/40" : ""}`}
      >
        {!usuario && (
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-accent-2">
            <Sparkles className="h-3 w-3" /> Assistente
          </div>
        )}
        {usuario ? msg.content : <Markdown>{msg.content}</Markdown>}
      </div>
    </div>
  );
}

export default function Assistente() {
  const [conversas, setConversas] = useState(() => carregarConversas());
  const [ativaId, setAtivaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fimRef = useRef(null);
  const enviandoRef = useRef(false); // trava síncrona contra envio duplo (clique rápido)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  // Cria ou atualiza a conversa ativa e a leva para o topo da lista.
  function persistir(id, msgs) {
    setConversas((prev) => {
      const carimbo = Date.now();
      const idx = prev.findIndex((c) => c.id === id);
      let lista;
      if (idx === -1) {
        lista = [
          { id, titulo: tituloDe(msgs), criadoEm: carimbo, atualizadoEm: carimbo, mensagens: msgs },
          ...prev,
        ];
      } else {
        const atual = prev[idx];
        const atualizada = {
          ...atual,
          titulo: atual.titulo || tituloDe(msgs),
          mensagens: msgs,
          atualizadoEm: carimbo,
        };
        lista = [atualizada, ...prev.filter((_, k) => k !== idx)];
      }
      salvarConversas(lista);
      return lista;
    });
  }

  function novaConversa() {
    setAtivaId(null);
    setMensagens([]);
    setTexto("");
  }

  function abrirConversa(c) {
    setAtivaId(c.id);
    setMensagens(c.mensagens || []);
    setTexto("");
  }

  function excluirConversa(id, e) {
    e.stopPropagation();
    setConversas((prev) => {
      const lista = prev.filter((c) => c.id !== id);
      salvarConversas(lista);
      return lista;
    });
    if (id === ativaId) novaConversa();
  }

  async function enviar(pergunta) {
    const msg = (pergunta ?? texto).trim();
    if (!msg || enviandoRef.current) return;
    enviandoRef.current = true;
    setTexto("");

    const id = ativaId || novoId();
    if (!ativaId) setAtivaId(id);

    const historico = mensagens.map((m) => ({ role: m.role, content: m.content }));
    const novas = [...mensagens, { role: "user", content: msg }];
    setMensagens(novas);
    persistir(id, novas);
    setCarregando(true);

    try {
      const r = await api.assistente(msg, historico);
      const finais = [
        ...novas,
        { role: "assistant", content: r.resposta, indisponivel: !r.disponivel },
      ];
      setMensagens(finais);
      persistir(id, finais);
    } catch {
      const finais = [
        ...novas,
        {
          role: "assistant",
          content:
            "Assistente indisponível no momento. As demais telas continuam funcionando.",
          indisponivel: true,
        },
      ];
      setMensagens(finais);
      persistir(id, finais);
    } finally {
      setCarregando(false);
      enviandoRef.current = false;
    }
  }

  return (
    <div className="flex h-screen">
      {/* Histórico de conversas */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface/30 lg:flex">
        <div className="px-4 pt-6 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Conversas
          </h2>
        </div>
        <div className="px-3">
          <button
            onClick={novaConversa}
            className="mb-2 flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-secondary transition-colors hover:border-accent/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Nova conversa
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {conversas.length === 0 ? (
            <p className="px-1 pt-2 text-xs leading-relaxed text-secondary/70">
              Suas conversas com o assistente ficam salvas aqui — reabra para
              continuar de onde parou.
            </p>
          ) : (
            conversas.map((c) => (
              <div
                key={c.id}
                onClick={() => abrirConversa(c)}
                role="button"
                tabIndex={0}
                title={c.mensagens?.find((m) => m.role === "user")?.content || c.titulo}
                onKeyDown={(e) => e.key === "Enter" && abrirConversa(c)}
                className={`group flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                  c.id === ativaId
                    ? "bg-accent-soft text-accent-2"
                    : "text-secondary hover:bg-surface-2 hover:text-primary"
                }`}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.titulo}</span>
                  <span className="block text-[11px] text-secondary/70">
                    {dataHora(c.atualizadoEm)}
                  </span>
                </span>
                <span
                  onClick={(e) => excluirConversa(c.id, e)}
                  className="shrink-0 opacity-0 transition-opacity hover:text-sla-vermelho group-hover:opacity-100"
                  title="Excluir conversa"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat */}
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col p-8">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold">Assistente de operação</h1>
          <p className="mt-1 text-sm text-secondary">
            Pergunte em linguagem natural sobre pedidos, alertas e métricas. As
            respostas usam só os dados reais do sistema.
          </p>
        </div>

        {/* Conversa */}
        <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
          {mensagens.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <C12H height={44} />
              <p className="mt-3 max-w-sm text-sm text-secondary">
                Comece com uma das perguntas abaixo ou escreva a sua.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-secondary transition-colors hover:border-accent/50 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((m, i) => (
            <Bolha key={i} msg={m} />
          ))}

          {carregando && (
            <div className="flex justify-start">
              <div className="card flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-secondary">
                <span className="h-2 w-2 animate-pulseSoft rounded-full bg-accent-2" />
                consultando o sistema…
              </div>
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {/* Entrada */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
          className="mt-4 flex shrink-0 gap-3"
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua pergunta…"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={carregando || !texto.trim()}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-2 disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
