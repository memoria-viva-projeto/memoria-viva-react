import Icone from "./Icone.jsx";
import { CONTA } from "../../dados/conta.js";

// [id, texto no computador, texto no celular, ícone]
const ITENS = [
  ["inicio", "Início", "Início", "inicio"],
  ["memorias", "Minhas memórias", "Memórias", "memorias"],
  ["conversar", "Conversar", "Conversar", "conversar"],
  ["familia", "Família", "Família", "familia"],
];

function Item({ item: [id, longo, curto, icone], usarCurto, onAviso, className }) {
  const rotulo = usarCurto ? curto : longo;
  if (id === "inicio") {
    return (
      <a className={className} href="/conta" aria-current="page">
        <Icone nome={icone} /><span>{rotulo}</span>
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={() => onAviso()}>
      <Icone nome={icone} /><span>{rotulo}</span>
    </button>
  );
}

/** Barra do topo (logo, menu no computador, guardar e foto) + barra de baixo no celular. */
export default function Navegacao({ onAviso, onAbrirAjustes }) {
  return (
    <>
      <header className="c-topo-nav">
        <div className="c-wrap c-nav">
          <a className="lg-card" href="/conta" aria-label="Memória Viva, início da sua conta">
            <img src="/img/logo-h.png" alt="Memória Viva" />
          </a>

          <nav className="c-nav-meio" aria-label="Principal">
            {ITENS.map((it) => <Item key={it[0]} item={it} onAviso={onAviso} className="c-nav-it" />)}
          </nav>

          <button type="button" className="btn btn-p c-nav-guardar" onClick={() => onAviso()}>
            <Icone nome="mais" />Guardar memória
          </button>

          <button type="button" className="c-perfil" onClick={onAbrirAjustes} aria-haspopup="dialog">
            <img src={CONTA.pessoa.foto} alt="" />
            <span>Ajustes</span>
          </button>
        </div>
      </header>

      <nav className="c-baixo" aria-label="Principal no celular">
        <Item item={ITENS[0]} usarCurto onAviso={onAviso} className="c-baixo-it" />
        <Item item={ITENS[1]} usarCurto onAviso={onAviso} className="c-baixo-it" />
        <button type="button" className="c-baixo-it c-baixo-guardar" onClick={() => onAviso()}>
          <span className="c-baixo-mais"><Icone nome="mais" tam={30} /></span>
          <span>Guardar</span>
        </button>
        <Item item={ITENS[2]} usarCurto onAviso={onAviso} className="c-baixo-it" />
        <Item item={ITENS[3]} usarCurto onAviso={onAviso} className="c-baixo-it" />
      </nav>
    </>
  );
}
