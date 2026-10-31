import Icone from "./Icone.jsx";
import PerguntaDoDia from "./PerguntaDoDia.jsx";
import Guardar from "./Guardar.jsx";
import Lateral from "./Lateral.jsx";
import { Link, ROTAS } from "./rotas.jsx";

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "bom dia" : h < 18 ? "boa tarde" : "boa noite";
}

/** Prévia da história: fotos e títulos; a história completa fica em outra tela. */
function Previa({ memorias, onAviso }) {
  const recentes = [...memorias].sort((a, b) => a.publicadaHaDias - b.publicadaHaDias).slice(0, 6);

  if (memorias.length === 0) {
    return (
      <section className="hp hp-vazia" aria-labelledby="hp-t">
        <h2 id="hp-t" className="c-h2">Sua história</h2>
        <p>Ainda não há lembranças guardadas. Que tal começar por uma foto?</p>
        <button type="button" className="btn btn-p" onClick={() => onAviso()}><Icone nome="mais" />Guardar a primeira lembrança</button>
      </section>
    );
  }

  return (
    <section className="hp" aria-labelledby="hp-t">
      <div className="hp-cab">
        <h2 id="hp-t" className="c-h2">Sua história</h2>
        <span className="hp-n">{memorias.length} lembranças</span>
      </div>
      <ul className="hp-grade">
        {recentes.map((m) => (
          <li key={m.id}>
            <Link className={`hp-it${m.foto ? "" : " hp-it-txt"}`} para={`${ROTAS.historia}#mem-${m.id}`}>
              {m.foto ? <img src={m.foto} alt="" loading="lazy" /> : <span className="hp-frase">“{m.frase}”</span>}
              {m.status === "aguardando" && <span className="hp-selo">Esperando você</span>}
              {m.foto
                ? <span className="hp-leg"><b>{m.titulo}</b><span>{m.quando}{m.audio ? " · com áudio" : ""}</span></span>
                : <span className="hp-leg"><span className="sr">{m.titulo}. </span><span>Um conselho seu · {m.quando}</span></span>}
            </Link>
          </li>
        ))}
      </ul>
      <Link className="btn btn-s hp-tudo" para={ROTAS.historia}><Icone nome="ler" />Ver sua história completa</Link>
    </section>
  );
}

/**
 * Início: só o essencial, nesta ordem —
 * saudação → pergunta do dia → o que espera por você → guardar → prévia da história.
 */
export default function Inicio({ memorias, perfil, onConfirmar, onVer, onAviso }) {
  return (
    <div className="c-wrap c-grid inicio">
      <div className="c-centro">
        <div className="sd">
          <p className="mao sd-oi">{saudacao()}, {perfil.nome}!</p>
          <h1 className="sd-titulo" tabIndex={-1}>Qual lembrança vem hoje?</h1>
        </div>
        <PerguntaDoDia memorias={memorias} onAviso={onAviso} />
        <Guardar onAviso={onAviso} />
        <Previa memorias={memorias} onAviso={onAviso} />
      </div>

      <Lateral memorias={memorias} onConfirmar={onConfirmar} onVer={onVer} />
    </div>
  );
}
