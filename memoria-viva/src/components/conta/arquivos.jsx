import { useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { ehCheio, novoItem, prepararFoto, prepararMidia } from "./guardados.js";

const ACEITA = {
  foto: (f) => f.type.startsWith("image/"),
  video: (f) => f.type.startsWith("video/"),
  anexo: (f) => f.type.startsWith("image/") || f.type.startsWith("audio/"),
};
const NOME = { foto: "uma foto", video: "um vídeo", anexo: "uma foto ou um áudio" };

/**
 * Juntar arquivos a uma memória: prepara um por vez (as fotos entram na tela conforme ficam prontas)
 * e guarda no navegador. trocar = o novo substitui o principal (vídeo).
 */
export function useArquivos(mudar) {
  const [proc, setProc] = useState(null);
  const [aviso, setAviso] = useState("");

  const juntar = async (lista, { tipo = "foto", trocar = false } = {}) => {
    const todos = [...lista];
    const bons = todos.filter(ACEITA[tipo]);
    if (!bons.length) { setAviso(`Isso não parece ${NOME[tipo]}. Escolha outro arquivo.`); return []; }
    setAviso("");
    setProc({ feitos: 0, total: bons.length });
    let falhas = todos.length - bons.length, cheio = false;
    const novos = [];
    for (const [k, f] of bons.entries()) {
      try {
        const a = f.type.startsWith("image/") ? await prepararFoto(f) : await prepararMidia(f, f.type.startsWith("video/") ? "video" : "audio");
        const it = { ...novoItem(a), ...(tipo === "anexo" ? { anexo: true } : {}) };
        novos.push(it);
        mudar((x) => ({ ...x, itens: trocar ? [...x.itens.filter((y) => y.anexo), it] : [...x.itens, it] }));
      } catch (e) {
        if (ehCheio(e)) { cheio = true; break; }
        falhas += 1;
      }
      setProc({ feitos: k + 1, total: bons.length });
    }
    setProc(null);
    setAviso(cheio ? "Acabou o espaço deste aparelho para guardar arquivos. O que já entrou está guardado."
      : falhas ? `${falhas === 1 ? "Um arquivo não pôde ser aberto" : `${falhas} arquivos não puderam ser abertos`}. Os outros entraram.` : "");
    return novos;
  };

  return { juntar, proc, aviso };
}

export function Andamento({ proc, aviso }) {
  return (
    <>
      {proc && (
        <div className="ea-proc" role="status">
          <span>Preparando {Math.min(proc.feitos + 1, proc.total)} de {proc.total}…</span>
          <progress max={proc.total} value={proc.feitos} />
        </div>
      )}
      {aviso && <p className="ed-erro" role="alert">{aviso}</p>}
    </>
  );
}

/** Botão que abre o seletor de arquivos do aparelho. */
export function BotaoArquivos({ rotulo, icone = "enviarfoto", accept = "image/*", multiple, capture, onArquivos, disabled, className = "btn btn-s" }) {
  const ref = useRef(null);
  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => ref.current.click()}><Icone nome={icone} />{rotulo}</button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} capture={capture} hidden
        onChange={(e) => { onArquivos(e.target.files); e.target.value = ""; }} />
    </>
  );
}

/** Lugar vazio para começar: escolher do aparelho, tirar foto (celular) ou arrastar (computador). */
export function ZonaArquivos({ titulo, texto, tipo = "foto", varias, arquivos, className = "", children }) {
  const [sobre, setSobre] = useState(false);
  const video = tipo === "video";
  const juntar = (fs) => arquivos.juntar(fs, { tipo, trocar: video });
  return (
    <div className={`zn ${className}${sobre ? " on" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)}
      onDrop={(e) => { e.preventDefault(); setSobre(false); if (!arquivos.proc) juntar(e.dataTransfer.files); }}>
      <p className="zn-titulo">{titulo}</p>
      {texto && <p className="zn-texto">{texto}</p>}
      <div className="zn-bt">
        <BotaoArquivos className="btn btn-p" rotulo={video ? "Escolher o vídeo" : varias ? "Escolher as fotos" : "Escolher a foto"}
          icone={video ? "video" : varias ? "album" : "enviarfoto"} accept={video ? "video/*" : "image/*"} multiple={varias}
          disabled={!!arquivos.proc} onArquivos={juntar} />
        {!video && <BotaoArquivos className="btn btn-s zn-camera" rotulo="Tirar uma foto agora" icone="foto" capture="environment" disabled={!!arquivos.proc} onArquivos={juntar} />}
      </div>
      <p className="zn-arraste">ou arraste {video ? "o vídeo" : varias ? "as fotos" : "a foto"} para cá</p>
      <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
      {children}
    </div>
  );
}

/**
 * Fotos escolhidas na tela "Guardar" (o seletor abre direto ao tocar em Fotografia ou Álbum).
 * Ficam aqui até a tela de criação abrir e prepará-las. Chave = chave do rascunho.
 */
export const pendentes = new Map();
