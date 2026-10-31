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

/** Botão "Falar em vez de escrever": escuta e devolve o texto falado. */
export function BotaoFalar({ onTexto, rotulo = "Falar em vez de escrever" }) {
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState("");
  const recRef = useRef(null);
  useEffect(() => () => recRef.current?.abort(), []);
  if (!podeDitar()) return null;

  const alternar = () => {
    if (ouvindo) return recRef.current?.stop();
    const rec = new Reconhecimento();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => onTexto([...e.results].map((r) => r[0].transcript).join(" ").trim());
    rec.onerror = (e) => setErro(e.error === "not-allowed"
      ? "O navegador não deixou usar o microfone. Dá para liberar nas permissões do site."
      : "Não deu para ouvir agora. Tente de novo, falando perto do aparelho.");
    rec.onend = () => setOuvindo(false);
    recRef.current = rec;
    setErro("");
    setOuvindo(true);
    rec.start();
  };

  return (
    <span className="falar">
      <button type="button" className={`btn btn-s btn-sm${ouvindo ? " on" : ""}`} onClick={alternar} aria-pressed={ouvindo}>
        <Icone nome="microfone" />{ouvindo ? "Ouvindo… toque para parar" : rotulo}
      </button>
      {erro && <span className="ed-erro" role="alert">{erro}</span>}
    </span>
  );
}
