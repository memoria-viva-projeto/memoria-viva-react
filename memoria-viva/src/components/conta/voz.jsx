import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";

// Recursos de voz do próprio navegador. Só aparecem onde o navegador oferece:
// - leitura em voz alta (speechSynthesis): Chrome, Edge, Safari, Firefox;
// - ditado (SpeechRecognition): Chrome, Edge e Safari. No Chrome e no Edge o áudio é
//   processado por um serviço do fabricante do navegador, não pelo Memória Viva.

export const podeOuvir = () => typeof window !== "undefined" && "speechSynthesis" in window;
const Reconhecimento = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const podeDitar = () => !!Reconhecimento;

function vozPortugues() {
  const vozes = window.speechSynthesis.getVoices();
  return vozes.find((v) => v.lang === "pt-BR") || vozes.find((v) => v.lang?.startsWith("pt"));
}

/** Botão "Ouvir": lê o texto em voz alta, devagar. Tocar de novo para. */
export function BotaoOuvir({ texto, rotulo = "Ouvir", className = "btn btn-s btn-sm" }) {
  const [lendo, setLendo] = useState(false);
  useEffect(() => () => lendo && window.speechSynthesis.cancel(), [lendo]);
  if (!podeOuvir()) return null;

  const alternar = () => {
    const fala = window.speechSynthesis;
    fala.cancel();
    if (lendo) return setLendo(false);
    const u = new SpeechSynthesisUtterance(typeof texto === "function" ? texto() : texto);
    u.lang = "pt-BR";
    u.rate = 0.9;
    const voz = vozPortugues();
    if (voz) u.voice = voz;
    u.onend = u.onerror = () => setLendo(false);
    setLendo(true);
    fala.speak(u);
  };

  return (
    <button type="button" className={className} onClick={alternar} aria-pressed={lendo}>
      <Icone nome={lendo ? "pausar" : "altofalante"} />{lendo ? "Parar" : rotulo}
    </button>
  );
}

// ---- falar em vez de escrever ----
// Só um microfone ligado por vez na conta inteira.
let ativo = null;

const capitalizar = (t) => t.charAt(0).toLocaleUpperCase("pt-BR") + t.slice(1);
/** Junta o que foi falado ao que já estava escrito (nunca apaga o que a pessoa digitou). */
export const juntarFala = (atual, falado) => (atual && atual.trim() ? `${atual.replace(/\s+$/, "")} ${falado}` : capitalizar(falado));

/**
 * Escuta e entrega o texto quando a pessoa para (tocar de novo no microfone).
 * Enquanto escuta, mostra o que já ouviu. Cancelar (ou Esc) descarta o que foi ouvido.
 */
export function useVoz(onFinal) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState("");
  const rec = useRef(null);
  const cancelado = useRef(false);
  const ouvido = useRef({ final: "", tudo: "" });
  const entregar = useRef(onFinal);
  entregar.current = onFinal;

  useEffect(() => () => rec.current?.abort(), []);

  const cancelar = () => { cancelado.current = true; rec.current?.abort(); };

  // Esc cancela a escuta (e não fecha a janela em volta)
  useEffect(() => {
    if (!ouvindo) return;
    const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelar(); } };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [ouvindo]);

  const iniciar = () => {
    ativo?.abort();
    const r = new Reconhecimento();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = true; // a pessoa pode fazer pausas; para quando ela tocar de novo
    ouvido.current = { final: "", tudo: "" };
    cancelado.current = false;
    r.onresult = (e) => {
      let final = "", agora = "";
      for (const res of e.results) (res.isFinal ? (final += res[0].transcript) : (agora += res[0].transcript));
      ouvido.current = { final: final.trim(), tudo: `${final} ${agora}`.trim() };
      setParcial(ouvido.current.tudo);
    };
    r.onerror = (e) => {
      if (e.error === "aborted") return;
      setErro(e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "O navegador não deixou usar o microfone. Dá para liberar nas permissões do site, ou escrever normalmente."
        : e.error === "no-speech" ? "Não ouvi nada. Toque no microfone e fale perto do aparelho."
        : "Não deu para ouvir agora. Tente de novo, ou escreva normalmente.");
    };
    r.onend = () => {
      if (ativo === r) ativo = null;
      setOuvindo(false);
      setParcial("");
      const t = (ouvido.current.final || ouvido.current.tudo).trim();
      if (!cancelado.current && t) entregar.current(t);
    };
    rec.current = r;
    ativo = r;
    setErro("");
    try { r.start(); setOuvindo(true); }
    catch { setErro("Não deu para começar a ouvir. Tente de novo."); }
  };

  return { ouvindo, parcial, erro, iniciar, parar: () => rec.current?.stop(), cancelar };
}

/**
 * Campo com microfone: um ícone pequeno dentro do campo (mesmo jeito em todos os campos).
 * valor + onMudar: o falado entra depois do que já está escrito. onTexto: quem usa decide o que fazer.
 * Sem reconhecimento de voz no navegador, o microfone não aparece (o campo fica como sempre).
 */
export function ComVoz({ rotulo, valor, onMudar, onTexto, children, className = "" }) {
  const voz = useVoz((t) => (onTexto ? onTexto(t) : onMudar(juntarFala(valor, t))));
  if (!podeDitar()) return <div className={`cv cv-sem ${className}`}><div className="cv-campo">{children}</div></div>;
  return (
    <div className={`cv ${className}${voz.ouvindo ? " cv-on" : ""}`}>
      <div className="cv-campo">
        {children}
        <button type="button" className="cv-mic" onClick={voz.ouvindo ? voz.parar : voz.iniciar} aria-pressed={voz.ouvindo}
          aria-label={voz.ouvindo ? `Parar de ouvir: ${rotulo}` : `Falar em vez de escrever: ${rotulo}`}
          title={voz.ouvindo ? "Parar de ouvir" : "Falar em vez de escrever"}>
          <Icone nome={voz.ouvindo ? "parar" : "microfone"} />
        </button>
      </div>
      {voz.ouvindo && (
        <p className="cv-status" role="status">
          <span className="cv-ponto" aria-hidden="true" />
          <span className="cv-ouvi">{voz.parcial ? `Ouvindo: “${voz.parcial}”` : "Ouvindo… pode falar. Toque no quadrado para terminar."}</span>
          <button type="button" className="btn-l cv-cancelar" onClick={voz.cancelar}>Cancelar</button>
        </p>
      )}
      {voz.erro && <p className="cv-erro" role="alert">{voz.erro}</p>}
    </div>
  );
}

/** Microfone sozinho (quando o falado vira um item novo, como um ingrediente). */
export function Microfone({ rotulo, onTexto, className = "" }) {
  const voz = useVoz(onTexto);
  if (!podeDitar()) return null;
  return (
    <span className={`cv-solo ${className}${voz.ouvindo ? " cv-on" : ""}`}>
      <button type="button" className="cv-mic" onClick={voz.ouvindo ? voz.parar : voz.iniciar} aria-pressed={voz.ouvindo}
        aria-label={voz.ouvindo ? `Parar de ouvir: ${rotulo}` : rotulo} title={voz.ouvindo ? "Parar de ouvir" : rotulo}>
        <Icone nome={voz.ouvindo ? "parar" : "microfone"} />
      </button>
      {voz.ouvindo && (
        <span className="cv-status" role="status">
          <span className="cv-ponto" aria-hidden="true" />
          <span className="cv-ouvi">{voz.parcial ? `Ouvindo: “${voz.parcial}”` : "Ouvindo… pode falar."}</span>
          <button type="button" className="btn-l cv-cancelar" onClick={voz.cancelar}>Cancelar</button>
        </span>
      )}
      {voz.erro && <span className="cv-erro" role="alert">{voz.erro}</span>}
    </span>
  );
}
