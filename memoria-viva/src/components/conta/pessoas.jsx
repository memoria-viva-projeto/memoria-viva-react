import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { ComVoz } from "./voz.jsx";
import { FotoInteira } from "./midia.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";

// Uma pessoa é guardada pelo id da família ("juliana", "maria") ou, se não tem cadastro, pelo nome escrito.
// A identificação é sempre feita por quem está guardando: não há reconhecimento de rosto.

const simples = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Quem aparece numa memória (marcadas nas fotos + pessoas gerais), sem repetir. */
export function pessoasDe(m) {
  return [...new Set([...(m.pessoas || []), ...(m.itens || []).flatMap((it) => (it.marcas || []).map((k) => k.p))])];
}

/** Sugestões: primeiro quem já foi marcado nesta memória, depois você, a família e quem apareceu em outras memórias. */
export function sugestoesPessoas(atual, guardadas = []) {
  const refs = [];
  const juntar = (r) => r && !refs.includes(r) && refs.push(r);
  if (atual) pessoasDe(atual).forEach(juntar);
  juntar(CONTA.pessoa.id);
  CONTA.familia.forEach((f) => juntar(f.id));
  guardadas.forEach((m) => pessoasDe(m).forEach(juntar));
  CONTA.memorias.forEach((m) => (m.pessoas || []).forEach(juntar));
  return refs;
}

/** Nome escrito → pessoa já conhecida com o mesmo nome (para não criar a mesma pessoa duas vezes). */
function refDoNome(nome, conhecidas) {
  const n = simples(nome);
  return conhecidas.find((r) => simples(pessoa(r).nome) === n) || nome.trim();
}

/** Escolher uma pessoa: tocar numa sugestão, ou escrever (ou falar) um nome novo. */
export function EscolherPessoa({ id, titulo, sugestoes, jaTem = [], onEscolher, onCancelar }) {
  const [texto, setTexto] = useState("");
  const campoRef = useRef(null);
  useEffect(() => { campoRef.current?.focus({ preventScroll: true }); campoRef.current?.closest(".ep")?.scrollIntoView({ block: "nearest" }); }, []);

  const busca = simples(texto);
  const lista = sugestoes.filter((r) => !jaTem.includes(r) && (!busca || simples(pessoa(r).nome).includes(busca)));
  const exata = busca && sugestoes.some((r) => simples(pessoa(r).nome) === busca);
  const escolher = (r) => { onEscolher(r); setTexto(""); };
  const escrever = (nome) => { if (nome.trim()) escolher(refDoNome(nome, sugestoes)); };

  return (
    <div className="ep" role="group" aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="ep-t">{titulo}</p>
      <div className="ed-campo">
        <label htmlFor={`${id}-nome`}>Procurar ou escrever um nome</label>
        <ComVoz rotulo="nome da pessoa" onTexto={(t) => setTexto(t.replace(/[.!?]$/, ""))}>
          <input id={`${id}-nome`} ref={campoRef} type="text" value={texto} autoComplete="off" maxLength={60}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lista.length && busca ? escolher(lista[0]) : escrever(texto); } if (e.key === "Escape") onCancelar(); }} />
        </ComVoz>
      </div>
      {texto.trim() && !exata && (
        <button type="button" className="btn btn-s ep-novo" onClick={() => escrever(texto)}>
          <Icone nome="mais" />Marcar “{texto.trim()}”
        </button>
      )}
      {lista.length > 0 && (
        <ul className="ep-lista" aria-label={busca ? "Pessoas encontradas" : "Sugestões"}>
          {lista.slice(0, busca ? 12 : 10).map((r) => (
            <li key={r}>
              <button type="button" className="ep-pessoa" onClick={() => escolher(r)}>
                <Avatar id={r} tam={36} /><span>{pessoa(r).nome}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {busca && lista.length === 0 && exata && <p className="ed-dica">Essa pessoa já está marcada aqui.</p>}
      <button type="button" className="btn-l" onClick={onCancelar}><Icone nome="fechar" />Cancelar</button>
    </div>
  );
}

/** Lista de pessoas (sem lugar na foto): para álbuns, vídeos, músicas e receitas. */
export function EscolherPessoas({ id, rotulo, valor, onMudar, sugestoes }) {
  const [abrindo, setAbrindo] = useState(false);
  return (
    <div className="ed-campo ps">
      <span className="ps-rot" id={`${id}-rot`}>{rotulo} <span className="ed-marca">(opcional)</span></span>
      {valor.length > 0 && (
        <ul className="chips ps-chips" aria-labelledby={`${id}-rot`}>
          {valor.map((r) => (
            <li key={r}><Avatar id={r} tam={32} />{pessoa(r).nome}
              <button type="button" className="ed-tirar" aria-label={`Tirar ${pessoa(r).nome}`} onClick={() => onMudar(valor.filter((x) => x !== r))}>
                <Icone nome="fechar" tam={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {abrindo ? (
        <EscolherPessoa id={id} titulo="Quem você quer juntar?" sugestoes={sugestoes} jaTem={valor}
          onEscolher={(r) => onMudar([...valor, r])} onCancelar={() => setAbrindo(false)} />
      ) : (
        <button type="button" className="btn btn-s ps-mais" onClick={() => setAbrindo(true)}><Icone nome="marcar" />Juntar uma pessoa</button>
      )}
    </div>
  );
}

/** Etiqueta sobre a foto, no ponto marcado (como nas redes sociais). */
function Etiqueta({ k, onClick, ativa }) {
  const estilo = { left: `${k.x * 100}%`, top: `${k.y * 100}%`, "--x": k.x };
  const conteudo = <span className="mk-nome">{pessoa(k.p).nome}</span>;
  return onClick
    ? <button type="button" className={`mk${ativa ? " on" : ""}`} style={estilo} onClick={onClick} aria-label={`${pessoa(k.p).nome}: mudar ou tirar a marcação`}>{conteudo}</button>
    : <span className="mk" style={estilo}>{conteudo}</span>;
}

/** Foto com as pessoas marcadas por cima (para ver). */
export function FotoMarcada({ arq, alt, marcas = [], mostrar }) {
  const comLugar = marcas.filter((k) => k.x != null);
  return (
    <span className="mp-foto">
      <FotoInteira arq={arq} alt={alt} />
      {mostrar && comLugar.map((k) => <Etiqueta key={k.p} k={k} />)}
    </span>
  );
}

/**
 * Marcar pessoas numa foto: "Marcar pessoas" → tocar no rosto → escolher o nome.
 * Também dá para dizer quem aparece sem apontar (para quem não consegue tocar com precisão).
 */
export function MarcarPessoas({ id, arq, alt, marcas = [], onMudar, sugestoes }) {
  // modo: null | "tocar" | { nova: {x,y} } | { editar: i } | { trocar: i } | { mover: i } | "semlugar"
  const [modo, setModo] = useState(null);
  const fotoRef = useRef(null);
  const tocando = modo === "tocar" || modo?.mover !== undefined;

  const tocar = (e) => {
    if (!tocando && !modo?.nova) return;
    const r = fotoRef.current.querySelector("img")?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (modo?.mover !== undefined) {
      onMudar(marcas.map((k, i) => (i === modo.mover ? { ...k, x, y } : k)));
      setModo(null);
    } else setModo({ nova: { x, y } });
  };

  const juntar = (p) => {
    const lugar = modo?.nova || { x: null, y: null };
    onMudar([...marcas, { p, ...lugar }]);
    setModo(modo === "semlugar" ? null : "tocar");
  };
  const trocar = (p) => { onMudar(marcas.map((k, i) => (i === modo.trocar ? { ...k, p } : k))); setModo(null); };
  const tirar = (i) => { onMudar(marcas.filter((_, j) => j !== i)); setModo(null); };

  const editando = modo?.editar ?? modo?.trocar ?? modo?.mover;
  const dica = modo === "tocar" ? "Toque no rosto de quem você quer marcar."
    : modo?.nova ? "Agora escolha quem é."
    : modo?.mover !== undefined ? `Toque no lugar onde está ${pessoa(marcas[modo.mover].p).nome}.` : "";

  return (
    <div className="mp">
      <div className="mp-palco">
        <span ref={fotoRef} className={`mp-foto${tocando ? " mp-tocando" : ""}`} onClick={tocar}>
          <FotoInteira arq={arq} alt={alt} />
          {marcas.map((k, i) => k.x != null && (
            <Etiqueta key={`${k.p}-${i}`} k={k} ativa={editando === i}
              onClick={(e) => { e.stopPropagation(); setModo({ editar: i }); }} />
          ))}
          {modo?.nova && <span className="mk-ponto" style={{ left: `${modo.nova.x * 100}%`, top: `${modo.nova.y * 100}%` }} aria-hidden="true" />}
        </span>
      </div>

      <p className="mp-dica" aria-live="polite">{dica}</p>

      {!modo && (
        <div className="mp-bt">
          <button type="button" className="btn btn-p" onClick={() => setModo("tocar")}><Icone nome="marcar" />Marcar pessoas na foto</button>
          <button type="button" className="btn-l" onClick={() => setModo("semlugar")}>Dizer quem aparece, sem apontar</button>
        </div>
      )}
      {modo === "tocar" && (
        <div className="mp-bt">
          <button type="button" className="btn btn-s" onClick={() => setModo(null)}><Icone nome="certo" />Pronto, terminei de marcar</button>
        </div>
      )}
      {modo?.mover !== undefined && <button type="button" className="btn-l" onClick={() => setModo(null)}><Icone nome="fechar" />Cancelar</button>}

      {(modo?.nova || modo === "semlugar") && (
        <EscolherPessoa id={`${id}-ep`} titulo={modo === "semlugar" ? "Quem aparece nesta foto?" : "Quem está aqui?"}
          sugestoes={sugestoes} jaTem={marcas.map((k) => k.p)} onEscolher={juntar} onCancelar={() => setModo(modo === "semlugar" ? null : "tocar")} />
      )}
      {modo?.trocar !== undefined && (
        <EscolherPessoa id={`${id}-tr`} titulo={`No lugar de ${pessoa(marcas[modo.trocar].p).nome}, quem é?`}
          sugestoes={sugestoes} jaTem={marcas.map((k) => k.p)} onEscolher={trocar} onCancelar={() => setModo(null)} />
      )}
      {modo?.editar !== undefined && (
        <div className="mp-menu" role="group" aria-label={`Marcação de ${pessoa(marcas[modo.editar].p).nome}`}>
          <p className="ep-t"><Avatar id={marcas[modo.editar].p} tam={36} />{pessoa(marcas[modo.editar].p).nome}</p>
          <button type="button" className="btn btn-s btn-sm" onClick={() => setModo({ trocar: modo.editar })}><Icone nome="trocar" />Trocar a pessoa</button>
          <button type="button" className="btn btn-s btn-sm" onClick={() => setModo({ mover: modo.editar })}><Icone nome="pin" />Mudar de lugar</button>
          <button type="button" className="btn btn-s btn-sm" onClick={() => tirar(modo.editar)}><Icone nome="lixo" />Tirar a marcação</button>
          <button type="button" className="btn-l" onClick={() => setModo(null)}><Icone nome="fechar" />Fechar</button>
        </div>
      )}

      {marcas.length > 0 && (
        <div className="mp-lista">
          <p className="ps-rot">Quem aparece nesta foto ({marcas.length})</p>
          <ul className="chips">
            {marcas.map((k, i) => (
              <li key={`${k.p}-${i}`}>
                <Avatar id={k.p} tam={32} />
                <span>{pessoa(k.p).nome}{k.x == null && <span className="mp-sem"> · sem lugar na foto</span>}</span>
                {k.x == null && (
                  <button type="button" className="ed-tirar" aria-label={`Apontar ${pessoa(k.p).nome} na foto`} onClick={() => setModo({ mover: i })}>
                    <Icone nome="pin" tam={18} />
                  </button>
                )}
                <button type="button" className="ed-tirar" aria-label={`Tirar ${pessoa(k.p).nome}`} onClick={() => tirar(i)}>
                  <Icone nome="fechar" tam={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
