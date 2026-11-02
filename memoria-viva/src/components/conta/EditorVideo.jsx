import { useState } from "react";
import Icone from "./Icone.jsx";
import { TextoLivre } from "./campos.jsx";
import { Midia } from "./midia.jsx";
import { ComVoz } from "./voz.jsx";
import { Andamento, ZonaArquivos } from "./arquivos.jsx";
import { TituloEHistoria } from "./EditorFotos.jsx";
import Detalhes from "./Detalhes.jsx";
import { PlayerYoutube, dadosDoLink, idDoYoutube, limparTitulo, youtubeDe } from "./youtube.jsx";

const videoDe = (m) => m.itens.find((it) => it.tipo === "video");

/** O vídeo (arquivo ou YouTube), numa moldura de filme. */
export function VitrineVideo({ m }) {
  const arq = videoDe(m);
  const yt = youtubeDe(m);
  if (!arq && !yt) return null;
  return <div className="vi-filme">{arq ? <Midia arq={arq.arq} tipo="video" rotulo={m.titulo || "Vídeo"} /> : <PlayerYoutube id={yt} titulo={m.titulo} />}</div>;
}

/** Etapa 1: um vídeo do aparelho ou um endereço do YouTube. */
function EscolherVideo({ m, mudar, arquivos }) {
  const [link, setLink] = useState("");
  const [erroLink, setErroLink] = useState("");
  const [comLink, setComLink] = useState(false);

  const usarLink = async () => {
    if (!idDoYoutube(link)) { setErroLink("Esse não parece um endereço do YouTube. Ele começa com https://www.youtube.com ou https://youtu.be"); return; }
    setErroLink("");
    const d = await dadosDoLink(link);
    mudar((x) => ({ ...x, titulo: x.titulo || limparTitulo(d.titulo, d.canal), itens: x.itens.filter((it) => it.tipo !== "video"), extra: { ...x.extra, youtube: { id: d.id, titulo: d.titulo, canal: d.canal } } }));
  };

  if (videoDe(m) || youtubeDe(m)) {
    return (
      <div className="vi">
        <VitrineVideo m={m} />
        <button type="button" className="btn-l" onClick={() => mudar((x) => ({ ...x, itens: x.itens.filter((it) => it.tipo !== "video"), extra: { ...x.extra, youtube: null } }))}>
          <Icone nome="trocar" />Escolher outro vídeo
        </button>
        <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
      </div>
    );
  }
  return (
    <div className="vi-escolher">
      <ZonaArquivos tipo="video" className="zn-video" arquivos={arquivos} />
      {comLink ? (
        <div className="mu-link vi-link">
          <label className="ge-rot" htmlFor="vi-link">Endereço do vídeo no YouTube</label>
          <div className="mu-busca-linha">
            <input id="vi-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…"
              aria-describedby="vi-link-dica" aria-invalid={!!erroLink} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), usarLink())} autoFocus />
            <button type="button" className="btn btn-s" onClick={usarLink}>Usar</button>
          </div>
          <span id="vi-link-dica" className={erroLink ? "ed-erro" : "ed-dica"}>{erroLink || "No YouTube: “Compartilhar” e depois “Copiar link”."}</span>
        </div>
      ) : (
        <button type="button" className="btn-l" onClick={() => setComLink(true)}><Icone nome="link" />O vídeo está no YouTube? Use o endereço</button>
      )}
    </div>
  );
}

function HistoriaVideo({ m, mudar, sugestoes }) {
  return (
    <>
      <TituloEHistoria m={m} mudar={mudar} exemplo="Ex.: O parabéns dos 70 anos" exemploHistoria="O que aparece no vídeo, o que estava acontecendo…" />
      <div className="ge-campo">
        <label className="ge-rot" htmlFor="vi-contexto">O que estava acontecendo naquele momento? <span className="ed-marca">(opcional)</span></label>
        <ComVoz rotulo="O que estava acontecendo" valor={m.extra.contexto} onMudar={(v) => mudar((x) => ({ ...x, extra: { ...x.extra, contexto: v } }))}>
          <TextoLivre id="vi-contexto" className="ge-texto" valor={m.extra.contexto} maxLength={2000}
            onMudar={(v) => mudar((x) => ({ ...x, extra: { ...x.extra, contexto: v } }))}
            placeholder="Ex.: Era a primeira vez que a família toda se reunia depois de anos." />
        </ComVoz>
      </div>
      <Detalhes m={m} mudar={mudar} sugestoes={sugestoes} rotulos={{ pessoas: "Quem aparece?", legendaPessoas: "Quem aparece no vídeo" }} />
    </>
  );
}

export const temVideo = (m) => !!(videoDe(m) || youtubeDe(m));

export const PASSOS_VIDEO = [
  { id: "video", titulo: "Qual vídeo você quer guardar?", Corpo: EscolherVideo, essencial: true, feito: temVideo },
  { id: "historia", titulo: "Conte sobre o vídeo", dica: "Se não quiser escrever agora, toque em “Pular”.", Corpo: HistoriaVideo, lado: true,
    feito: (m) => !!(m.titulo || m.descricao || m.extra.contexto || m.pessoas.length) },
];
