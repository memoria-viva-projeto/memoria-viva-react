import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { pessoasDe } from "./pessoas.jsx";
import { Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";
import { TIPOS, capaDe, resumo, textoQuando, tituloDe } from "./guardados.js";
import { capaDoYoutube, youtubeDe } from "./youtube.jsx";

/** Capa vinda do YouTube (música ou vídeo por link), quando não há arquivo. */
const CapaYoutube = ({ m }) => <span className="mi"><img src={capaDoYoutube(youtubeDe(m))} alt="" loading="lazy" /></span>;

function quando(iso) {
  const dias = Math.floor((Date.now() - new Date(iso)) / 864e5);
  if (dias < 1) return "hoje";
  if (dias < 2) return "ontem";
  return dias < 7 ? `há ${dias} dias` : `há ${Math.floor(dias / 7)} semana${dias < 14 ? "" : "s"}`;
}

/** Memória que a pessoa guardou (fica no navegador): na história, abre a página dela. */
export default function CartaoGuardada({ m, i }) {
  const capa = capaDe(m);
  const fotos = m.itens.filter((it) => it.tipo === "foto" && !it.anexo);
  const pessoas = pessoasDe(m);
  const meta = [textoQuando(m), m.lugar].filter(Boolean).join(" · ");
  const para = `${ROTAS.memoria}/${m.id}`;

  return (
    <article className="cm cg entra" id={`mem-${m.id}`} style={{ "--i": i }} aria-labelledby={`t-${m.id}`}>
      <header className="cm-cab">
        <Avatar id={CONTA.pessoa.id} tam={52} />
        <div className="cm-quem"><b>Você</b><span>{quando(m.criadaEm)}</span></div>
        <span className="selo selo-voce" tabIndex={-1}><Icone nome="certo" tam={18} />Guardada por você</span>
      </header>

      <Link className="cg-capa" para={para} tabIndex={-1} aria-hidden="true">
        {capa ? (
          <span className={`cg-fotos${m.tipo === "album" && fotos.length > 2 ? " cg-pilha" : ""}`}>
            {m.tipo === "album" && fotos.length > 2 && fotos.filter((it) => it.arq !== capa).slice(0, 2).map((it) => (
              <span key={it.arq} className="foto cg-atras"><Miniatura arq={it.arq} /></span>
            ))}
            <span className="foto cg-frente"><Miniatura arq={capa} tipo={m.tipo === "video" ? "video" : "foto"} /></span>
          </span>
        ) : youtubeDe(m) ? (
          <span className="cg-fotos"><span className={`foto cg-frente${m.tipo === "musica" ? " cg-disco" : ""}`}><CapaYoutube m={m} /></span></span>
        ) : (
          <span className={`cg-sem cg-sem-${m.tipo}`}><Icone nome={TIPOS[m.tipo].icone} tam={44} /><span className="mao">{tituloDe(m)}</span></span>
        )}
      </Link>

      <p className="cg-tipo"><Icone nome={TIPOS[m.tipo].icone} tam={18} />{resumo(m)}</p>
      <h3 id={`t-${m.id}`} className="cm-titulo">{tituloDe(m)}</h3>
      {meta && <p className="cg-meta">{meta}</p>}
      {m.descricao && <p className="cm-trecho cg-trecho">{m.descricao}</p>}
      {pessoas.length > 0 && <p className="cg-meta"><Icone nome="marcar" tam={18} />Com {pessoas.slice(0, 3).map((p) => pessoa(p).nome).join(", ")}{pessoas.length > 3 ? ` e mais ${pessoas.length - 3}` : ""}</p>}

      <Link className="btn btn-s cg-abrir" para={para}><Icone nome="ver" />{m.tipo === "album" ? "Abrir o álbum" : "Abrir a memória"}</Link>
    </article>
  );
}

/** Quadradinho da prévia do Início. */
export function TileGuardada({ m }) {
  const capa = capaDe(m);
  return (
    <Link className={`hp-it${capa || youtubeDe(m) ? "" : " hp-it-txt"}`} para={`${ROTAS.memoria}/${m.id}`}>
      {capa ? <Miniatura arq={capa} tipo={m.tipo === "video" ? "video" : "foto"} /> : youtubeDe(m) ? <CapaYoutube m={m} /> : <span className="hp-ic"><Icone nome={TIPOS[m.tipo].icone} tam={40} /></span>}
      {Date.now() - new Date(m.criadaEm) < 3 * 864e5 && <span className="hp-novo">Nova</span>}
      <span className="hp-leg"><b>{tituloDe(m)}</b><span>{resumo(m)}</span></span>
    </Link>
  );
}
