import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import { urlDoArquivo } from "./guardados.js";

/** Endereço de um arquivo guardado no navegador (mini = miniatura). Some sozinho quando a tela sai. */
export function useArquivo(id, mini) {
  const [r, setR] = useState(null);
  useEffect(() => {
    if (!id) return setR(null);
    let vivo = true, achado;
    urlDoArquivo(id, mini).then((x) => { achado = x; if (vivo) setR(x); }).catch(() => vivo && setR(null));
    return () => {
      vivo = false;
      if (achado && !achado.fica) URL.revokeObjectURL(achado.url);
    };
  }, [id, mini]);
  return r;
}

const ICONES = { foto: "foto", video: "video", audio: "ouvir" };

/** Se o endereço não abrir (arquivo apagado, sem acesso, sem internet), a tela mostra um aviso no lugar. */
function useFalhou(url) {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [url]);
  return [falhou, () => setFalhou(true)];
}

/** Miniatura quadrada (foto, ou o primeiro quadro do vídeo). */
export function Miniatura({ arq, tipo = "foto", alt = "", className = "" }) {
  const r = useArquivo(arq, true);
  const [falhou, falhar] = useFalhou(r?.url);
  return (
    <span className={`mi ${className}`}>
      {r && !falhou ? <img src={r.url} alt={alt} loading="lazy" onError={falhar} /> : <Icone nome={ICONES[tipo]} tam={30} />}
      {falhou && <span className="sr">Arquivo indisponível</span>}
      {tipo === "video" && <span className="mi-tipo"><Icone nome="ouvir" tam={18} /><span className="sr">vídeo</span></span>}
    </span>
  );
}

/** Foto inteira, sem cortar (para ver e para marcar pessoas). */
export function FotoInteira({ arq, alt = "", onCarregar, ...props }) {
  const r = useArquivo(arq, false);
  const [falhou, falhar] = useFalhou(r?.url);
  if (falhou) return <span className="fi-carregando" role="status">Esta foto não está disponível agora.</span>;
  if (!r) return <span className="fi-carregando">Abrindo a foto…</span>;
  return <img src={r.url} alt={alt} onLoad={onCarregar} onError={falhar} draggable={false} {...props} />;
}

/** Vídeo ou áudio guardado, com os controles do próprio navegador. */
export function Midia({ arq, tipo, rotulo }) {
  const r = useArquivo(arq, false);
  const [falhou, falhar] = useFalhou(r?.url);
  if (falhou) return <span className="fi-carregando" role="status">{tipo === "audio" ? "Este áudio" : "Este vídeo"} não está disponível agora.</span>;
  if (!r) return <span className="fi-carregando">Abrindo…</span>;
  if (tipo === "audio") return <audio className="md-audio" src={r.url} controls preload="metadata" aria-label={rotulo} onError={falhar} />;
  return <video className="md-video" src={r.url} controls playsInline preload="metadata" aria-label={rotulo} onError={falhar} />;
}
