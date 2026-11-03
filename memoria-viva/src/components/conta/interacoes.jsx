import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";
import { reacoes } from "./comentarios.js";
import { Link, ROTAS } from "./rotas.jsx";

// "Eu me lembro" e comentar: as mesmas peças no feed, na página da memória, no álbum e em cada foto dele.

export function tempo(ms) {
  const dias = Math.floor((Date.now() - ms) / 864e5);
  if (dias < 1) return "hoje";
  if (dias < 2) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
}
const dataDoComentario = (iso) => (iso ? tempo(new Date(iso).getTime()) : "");
export const nomeCurto = (id) => (id === CONTA.pessoa.id ? "Você" : pessoa(id).nome);

/** Para onde leva tocar numa pessoa: o seu perfil, o perfil dela na Família, ou nada (nome só escrito, sem cadastro). */
export const perfilDe = (id) => (id === CONTA.pessoa.id ? ROTAS.perfil : CONTA.familia.some((p) => p.id === id) ? `${ROTAS.familia}/${id}` : null);

/** A foto da pessoa que abre o perfil dela, como nas redes sociais (o nome ao lado também abre; a foto não repete o nome para leitores de tela). */
export function AvatarPerfil({ id, tam }) {
  const para = perfilDe(id);
  if (!para) return <Avatar id={id} tam={tam} />;
  return <Link className="pf-link-av" para={para} tabIndex={-1} aria-hidden="true"><Avatar id={id} tam={tam} /></Link>;
}

/** O nome da pessoa, que abre o perfil dela. */
export function NomePerfil({ id, children }) {
  const para = perfilDe(id);
  if (!para) return children;
  return <Link className="pf-link-nome" para={para} aria-label={`${children} — ver o perfil`}>{children}</Link>;
}

/**
 * Os botões de reagir, sempre com nome: Eu me lembro e Comentar (com quantos já há).
 * children: botões a mais no fim da fileira (ex.: "Detalhes" no feed).
 */
export function Reacoes({ coms, rotulo, comentando, onComentar, onReagir, children }) {
  const lembro = reacoes(coms, "lembro");
  const nComs = coms.filter((c) => c.tipo === "comentario").length;
  return (
    <div className="mm-acoes" role="group" aria-label={rotulo}>
      <button type="button" className={`mm-acao${lembro.eu ? " on" : ""}`} aria-pressed={lembro.eu} onClick={() => onReagir("lembro")}>
        <Icone nome="lembro" tam={22} />{lembro.eu ? "Você se lembra" : "Eu me lembro"}{lembro.n > 0 && <span className="mm-n">{lembro.n}</span>}
      </button>
      <button type="button" className={`mm-acao${comentando ? " on" : ""}`} aria-expanded={comentando} onClick={onComentar}>
        <Icone nome="comentar" tam={22} />Comentar{nComs > 0 && <span className="mm-n">{nComs}</span>}
      </button>
      {children}
    </div>
  );
}

/**
 * Comentários: o último à vista; os outros e o campo para escrever, quando a pessoa quiser.
 * chave: para separar o campo de uma foto do campo do álbum na mesma tela. sobre: "esta memória", "esta foto".
 */
export function Comentarios({ x, chave = "", sobre = "esta memória", coms, aberto, onAbrir, onComentar, onApagar, focar = true }) {
  const [texto, setTexto] = useState("");
  const campo = useRef(null);
  useEffect(() => { if (aberto && focar) campo.current?.focus(); }, [aberto, focar]); // na página da memória já abre aberto: sem pular para o fim
  const lista = coms.filter((c) => c.tipo === "comentario");
  const id = `com-${x.id}${chave ? `-${chave}` : ""}`;
  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    onComentar(texto);
    setTexto("");
  };
  const Linha = ({ c }) => (
    <li>
      <AvatarPerfil id={c.autor} tam={36} />
      <p>
        <b><NomePerfil id={c.autor}>{nomeCurto(c.autor)}</NomePerfil></b> {c.texto}
        {(c.criadoEm || (!c.semente && c.autor === CONTA.pessoa.id)) && (
          <span className="mm-com-pe">
            {dataDoComentario(c.criadoEm)}
            {!c.semente && c.autor === CONTA.pessoa.id && aberto && <button type="button" className="mm-com-apagar" onClick={() => onApagar(c.id)}>Apagar</button>}
          </span>
        )}
      </p>
    </li>
  );

  if (!aberto) {
    if (!lista.length) return null;
    const ultimo = lista[lista.length - 1];
    return (
      <div className="mm-coms">
        <ul className="mm-com-lista"><Linha c={ultimo} /></ul>
        {lista.length > 1 && <button type="button" className="btn-l mm-ver-coms" onClick={onAbrir}>Ver os {lista.length} comentários</button>}
      </div>
    );
  }
  return (
    <div className="mm-coms">
      {lista.length > 0 && <ul className="mm-com-lista" aria-label="Comentários">{lista.map((c) => <Linha key={c.id} c={c} />)}</ul>}
      <form className="cm-form" onSubmit={enviar}>
        <label htmlFor={id}>Seu comentário</label>
        <textarea id={id} ref={campo} rows={2} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="O que você lembra desse momento?" />
        <p className="mm-com-nota"><Icone nome="conselho" tam={16} />Fica guardado com {sobre}, com o seu nome. A IA usa o que você escreveu quando vocês conversarem sobre ela.</p>
        <div className="cm-form-bt">
          <button type="submit" className="btn btn-p btn-sm" disabled={!texto.trim()}><Icone nome="enviar" />Enviar</button>
        </div>
      </form>
    </div>
  );
}
