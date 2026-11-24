import Icone from "./Icone.jsx";
import { Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { TIPOS, capaDe, resumo, tituloDe } from "./guardados.js";

/** Quadradinho da prévia do Início. */
export function TileGuardada({ m, para = `${ROTAS.memoria}/${m.id}` }) {
  const capa = capaDe(m);
  return (
    <Link className={`hp-it${capa ? "" : " hp-it-txt"}`} para={para}>
      {capa ? <Miniatura arq={capa} /> : <span className="hp-ic"><Icone nome={TIPOS[m.tipo].icone} tam={40} /></span>}
      {Date.now() - new Date(m.criadaEm) < 3 * 864e5 && <span className="hp-novo">Nova</span>}
      <span className="hp-leg"><b>{tituloDe(m)}</b><span>{resumo(m)}</span></span>
    </Link>
  );
}
