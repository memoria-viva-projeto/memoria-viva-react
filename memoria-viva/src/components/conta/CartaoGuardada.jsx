import Icone from "./Icone.jsx";
import { Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { TIPOS, capaDe, resumo, tituloDe } from "./guardados.js";
import { capaDoYoutube, youtubeDe } from "./youtube.jsx";

/** Capa vinda do YouTube (música ou vídeo por link), quando não há arquivo. */
const CapaYoutube = ({ m }) => <span className="mi"><img src={capaDoYoutube(youtubeDe(m))} alt="" loading="lazy" /></span>;

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
