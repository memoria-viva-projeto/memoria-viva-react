import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";

// Músicas e vídeos do YouTube: guardamos só a referência (id, título, canal), nunca o arquivo.
// A pesquisa passa pelo servidor (/api/musica, ver api/musica.js), onde fica a chave.
// Se o servidor não existir (site estático) ou não tiver chave, só o "colar o link" aparece.

/** Id do vídeo a partir de qualquer endereço do YouTube (watch, youtu.be, shorts, embed, music). */
export function idDoYoutube(url) {
  try {
    const u = new URL((url || "").trim());
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/) || [])[1] || "";
    }
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const capaDoYoutube = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Id do YouTube de uma memória (escolhido na pesquisa ou colado; inclui o link antigo de música). */
export const youtubeDe = (m) => m.extra?.youtube?.id || idDoYoutube(m.extra?.link) || null;

/** "Luiz Gonzaga - Topic" → "Luiz Gonzaga"; "LuizGonzagaVEVO" → "LuizGonzaga". */
export const limparCanal = (c = "") => c.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
/** "Luiz Gonzaga - Asa Branca (Áudio Oficial)" → "Asa Branca". */
export function limparTitulo(t = "", canal = "") {
  let s = t.replace(/\s*[([](?:[^)\]]*(?:oficial|official|áudio|audio|clipe|video|vídeo|lyric|letra|ao vivo|live|hd|remaster)[^)\]]*)[)\]]/gi, "").trim();
  const artista = limparCanal(canal);
  if (artista && s.toLowerCase().startsWith(`${artista.toLowerCase()} - `)) s = s.slice(artista.length + 3);
  return s.trim() || t;
}

const pedir = async (q, sinal) => {
  const r = await fetch(`/api/musica?${new URLSearchParams(q)}`, { signal: sinal });
  const d = await r.json(); // num site sem servidor, volta HTML e isto falha
  if (!r.ok) throw Object.assign(new Error(d.erro || "erro"), { codigo: d.erro });
  return d;
};

export const pesquisaDisponivel = () => pedir({ acao: "disponivel" }).then((d) => !!d.busca).catch(() => false);
/** Pesquisa (sinal = AbortController.signal: uma pesquisa nova cancela a anterior). */
export const pesquisar = (q, sinal) => pedir({ acao: "busca", q }, sinal).then((d) => d.resultados);

/** Dados de um link colado. Sem servidor, fica só o id (a pessoa escreve o nome). */
export async function dadosDoLink(url) {
  const id = idDoYoutube(url);
  if (!id) return null;
  try { return await pedir({ acao: "link", url }); }
  catch { return { id, titulo: "", canal: "", capa: capaDoYoutube(id) }; }
}

// YouTube IFrame Player API: carregada uma vez, só quando alguém toca em "Tocar".
let api;
function carregarApi() {
  api ||= new Promise((ok, erro) => {
    if (window.YT?.Player) return ok(window.YT);
    const antes = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { antes?.(); ok(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { api = null; erro(new Error("api")); };
    document.head.appendChild(s);
  });
  return api;
}

/**
 * Player oficial do YouTube (IFrame Player API). Até a pessoa tocar em "Tocar aqui", mostramos só a capa:
 * a página fica leve e o YouTube só carrega quando ela quer ouvir.
 */
export function PlayerYoutube({ id, titulo, className = "" }) {
  const [tocando, setTocando] = useState(false);
  const [erro, setErro] = useState("");
  const lugar = useRef(null);

  useEffect(() => {
    if (!tocando) return;
    let player, vivo = true;
    carregarApi().then((YT) => {
      if (!vivo) return;
      player = new YT.Player(lugar.current, {
        videoId: id, host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: { onError: (e) => setErro([101, 150].includes(e.data) ? "dono" : "erro") },
      });
    }).catch(() => vivo && setErro("rede"));
    return () => { vivo = false; player?.destroy?.(); };
  }, [tocando, id]);

  if (tocando) {
    return (
      <div className={`yt ${className}`}>
        <div ref={lugar} title={`${titulo || "Vídeo"} (YouTube)`} />
        {erro && (
          <p className="yt-erro" role="alert">
            {erro === "dono" ? "Quem publicou não deixa tocar fora do YouTube." : erro === "rede" ? "Não deu para carregar o YouTube agora." : "O vídeo não tocou."}{" "}
            <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">Abrir no YouTube<span className="sr"> (outra aba)</span></a>
          </p>
        )}
      </div>
    );
  }
  return (
    <div className={`yt yt-capa ${className}`}>
      <img src={capaDoYoutube(id)} alt="" />
      <button type="button" className="btn btn-p yt-tocar" onClick={() => setTocando(true)}>
        <Icone nome="ouvir" />Tocar aqui<span className="sr">: {titulo}</span>
      </button>
      <span className="yt-fonte">pelo YouTube</span>
    </div>
  );
}
