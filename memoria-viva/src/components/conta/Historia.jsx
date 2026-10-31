import { Fragment } from "react";
import Icone from "./Icone.jsx";
import { CartaoMemoria, CartaoConselho } from "./Feed.jsx";
import { Link, ROTAS } from "./rotas.jsx";

/** "Sua história": todas as lembranças, da mais recente para a mais antiga (o Início mostra só uma prévia). */
export default function Historia({ memorias, onConfirmar, onMudarMemoria, onAviso }) {
  const feed = memorias.filter((m) => m.tipo !== "conselho").sort((a, b) => a.publicadaHaDias - b.publicadaHaDias);
  const conselho = memorias.find((m) => m.tipo === "conselho");

  return (
    <div className="c-wrap hs">
      <Link className="btn-l hs-voltar" para={ROTAS.inicio}><Icone nome="voltar" />Voltar ao início</Link>
      <header className="hs-cab">
        <h1 className="hs-titulo" tabIndex={-1}>Sua história</h1>
        <p>{memorias.length} lembranças, da mais recente para a mais antiga.</p>
      </header>

      {memorias.length === 0 ? (
        <p className="hs-vazio">Ainda não há lembranças guardadas. Toque em “Guardar” para começar.</p>
      ) : (
        <div className="c-feed">
          {feed.map((m, i) => (
            <Fragment key={m.id}>
              <CartaoMemoria m={m} i={i} onConfirmar={onConfirmar} onMudar={onMudarMemoria(m.id)} onAviso={onAviso} />
              {i === 1 && conselho && <CartaoConselho m={conselho} i={i + 1} onAviso={onAviso} />}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
