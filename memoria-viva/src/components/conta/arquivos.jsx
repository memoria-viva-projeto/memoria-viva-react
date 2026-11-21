import { useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { ehCheio, novoItem, prepararFoto } from "./guardados.js";

const ehFoto = (f) => f.type.startsWith("image/");

/**
 * Juntar arquivos a uma memória: prepara um por vez (as fotos entram na tela conforme ficam prontas)
 * e guarda no navegador. trocar = o novo substitui o principal.
 */
export function useArquivos(mudar) {
  const [proc, setProc] = useState(null);
  const [aviso, setAviso] = useState("");

  const juntar = async (lista, { tipo = "foto", trocar = false } = {}) => {
    const todos = [...lista];
    const bons = todos.filter(ehFoto);
    if (!bons.length) { setAviso("Isso não parece uma foto. Escolha outro arquivo."); return []; }
    setAviso("");
    setProc({ feitos: 0, total: bons.length });
    let falhas = todos.length - bons.length, cheio = false;
    const novos = [];
    for (const [k, f] of bons.entries()) {
      try {
        const a = await prepararFoto(f);
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

/**
 * Tela de seleção (antes da galeria): uma área grande para soltar os arquivos ou tocar e procurar no aparelho.
 * No celular, abre o seletor de fotos do próprio aparelho (e a câmera, se quiser).
 */
export function ZonaArquivos({ titulo, texto, tipo = "foto", varias, arquivos, className = "", children }) {
  const [sobre, setSobre] = useState(false);
  const juntar = (fs) => arquivos.juntar(fs, { tipo });
  // tocar em qualquer lugar da área abre o seletor (como o botão)
  const abrir = (e) => { if (!arquivos.proc && !e.target.closest("button, a, input")) e.currentTarget.querySelector(".zn-escolher")?.click(); };
  return (
    <div className={`zn ${className}${sobre ? " on" : ""}`} onClick={abrir}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)}
      onDrop={(e) => { e.preventDefault(); setSobre(false); if (!arquivos.proc) juntar(e.dataTransfer.files); }}>
      <span className="zn-ic blob" aria-hidden="true"><Icone nome={varias ? "album" : "enviarfoto"} tam={40} /></span>
      {titulo && <p className="zn-titulo">{titulo}</p>}
      <p className="zn-texto">
        <span className="zn-arraste">{texto || `Arraste ${varias ? "suas imagens" : "a imagem"} até aqui ou clique para procurar no dispositivo.`}</span>
        <span className="zn-toque">Toque no botão para escolher {varias ? "as fotos" : "a foto"} no aparelho.</span>
      </p>
      <div className="zn-bt">
        <BotaoArquivos className="btn btn-p zn-escolher" rotulo={varias ? "Escolher as fotos" : "Escolher a foto"}
          icone={varias ? "album" : "enviarfoto"} accept="image/*" multiple={varias}
          disabled={!!arquivos.proc} onArquivos={juntar} />
        <BotaoArquivos className="btn btn-s zn-camera" rotulo="Tirar uma foto agora" icone="foto" capture="environment" disabled={!!arquivos.proc} onArquivos={juntar} />
      </div>
      <p className="zn-formatos">{`Fotos JPG, PNG, WEBP ou GIF${varias ? ", quantas quiser" : ""}. As fotos do iPhone entram normalmente.`}</p>
      <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
      {children}
    </div>
  );
}
