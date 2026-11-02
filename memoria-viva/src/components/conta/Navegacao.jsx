import Icone from "./Icone.jsx";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { Link, ROTAS } from "./rotas.jsx";

// [id, texto no computador, texto no celular, ícone, tela]; sem tela = aviso de próxima etapa
const ITENS = [
  ["inicio", "Início", "Início", "inicio", ROTAS.inicio],
  ["memorias", "Minhas memórias", "Memórias", "memorias", ROTAS.historia],
  ["familia", "Família", "Família", "familia", ROTAS.familia],
  ["conversar", "Conversar", "Conversar", "conversar", null],
];

// "Minhas memórias" fica marcada também ao ver uma memória guardada
const ativa = (rota, tela) => rota === tela || (tela === ROTAS.historia && rota.startsWith(`${ROTAS.memoria}/`))
  || (tela === ROTAS.familia && rota.startsWith(`${ROTAS.familia}/`));

function Item({ item: [, longo, curto, icone, tela], usarCurto, rota, onAviso, className }) {
  const rotulo = usarCurto ? curto : longo;
  if (tela) {
    return (
      <Link className={className} para={tela} aria-current={ativa(rota, tela) ? "page" : undefined}>
        <Icone nome={icone} /><span>{rotulo}</span>
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => onAviso()}>
      <Icone nome={icone} /><span>{rotulo}</span>
    </button>
  );
}

/**
 * Celular: topo baixinho (logo e Ajuda) + barra fixa embaixo, com a foto da pessoa abrindo o perfil.
 * Computador: menu lateral fixo à esquerda, com os mesmos destinos.
 */
export default function Navegacao({ rota, perfil, onAviso, onAbrirAjuda, onAbrirAjustes }) {
  const noPerfil = rota.startsWith(ROTAS.perfil);
  const guardando = rota.startsWith(ROTAS.guardar);

  return (
    <>
      {/* ---- celular ---- */}
      <header className="c-topo-nav">
        <div className="c-wrap c-nav">
          <Link className="lg-card" para={ROTAS.inicio} aria-label="Memória Viva, início">
            <img src="/img/logo-h.png" alt="Memória Viva" />
          </Link>
          <button type="button" className="c-ajuda-bt" onClick={onAbrirAjuda} aria-haspopup="dialog">
            <Icone nome="ajuda" />Ajuda
          </button>
        </div>
      </header>

      <nav className="c-baixo" aria-label="Principal">
        <Item item={ITENS[0]} usarCurto rota={rota} onAviso={onAviso} className="c-baixo-it" />
        <Item item={ITENS[1]} usarCurto rota={rota} onAviso={onAviso} className="c-baixo-it" />
        <Link className="c-baixo-it c-baixo-guardar" para={ROTAS.guardar} aria-current={guardando ? "page" : undefined}>
          <span className="c-baixo-mais"><Icone nome="mais" tam={30} /></span>
          <span>Guardar</span>
        </Link>
        {/* no celular cabem 5: Família no lugar de Conversar (que ainda não está pronta; no computador, as duas aparecem) */}
        <Item item={ITENS[2]} usarCurto rota={rota} onAviso={onAviso} className="c-baixo-it" />
        <Link className="c-baixo-it" para={ROTAS.perfil} aria-current={noPerfil ? "page" : undefined}>
          <img className="c-nav-foto" src={perfil.foto} alt="" /><span>Perfil</span>
        </Link>
      </nav>

      {/* ---- computador ---- */}
      <aside className="c-lado">
        <FaixaAzulejos semente="menu" tamanho={56} girar={false} pares={PARES_URUCUM_ANIL} className="c-lado-azulejos" />
        <Link className="lg-card" para={ROTAS.inicio} aria-label="Memória Viva, início">
          <img src="/img/logo-h.png" alt="Memória Viva" />
        </Link>

        <nav className="c-lado-menu" aria-label="Principal">
          {ITENS.map((it) => (
            <Item key={it[0]} item={it} rota={rota} onAviso={onAviso} className="c-lado-it" />
          ))}
          <Link className="c-lado-it" para={ROTAS.perfil} aria-current={noPerfil ? "page" : undefined}>
            <img className="c-nav-foto" src={perfil.foto} alt="" /><span>Seu perfil</span>
          </Link>
        </nav>

        <Link className="btn btn-p c-lado-guardar" para={ROTAS.guardar} aria-current={guardando ? "page" : undefined}>
          <Icone nome="mais" />Guardar memória
        </Link>

        <div className="c-lado-pe">
          <button type="button" className="c-lado-it" onClick={onAbrirAjuda} aria-haspopup="dialog">
            <Icone nome="ajuda" /><span>Ajuda</span>
          </button>
          <button type="button" className="c-lado-it" onClick={onAbrirAjustes} aria-haspopup="dialog">
            <Icone nome="ajustes" /><span>Ajustes</span>
          </button>
        </div>
      </aside>
    </>
  );
}
