import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import ArvoreMemoria from "./ArvoreMemoria.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { contarMemorias, progresso } from "./arvoreMemoria.js";
import { pessoa } from "../../dados/conta.js";

/** A árvore da memória da pessoa, pequena, com o estágio e o link para a aba. */
function Arvore({ memorias, guardadas, carregou }) {
  const prog = progresso(contarMemorias(memorias, guardadas));
  return (
    <section className="lt-bloco lt-arvore" aria-labelledby="arv-t">
      <h2 id="arv-t" className="c-h2">Sua árvore da memória</h2>
      <Link className="lt-arvore-link" para={ROTAS.arvore} aria-label={`Ver minha árvore: ${prog.atual.nome}`}>
        {carregou ? <ArvoreMemoria total={prog.total} crescer={false} /> : <span className="arv" />}
      </Link>
      <p className="lt-txt"><b>{prog.atual.nome}</b> · {prog.total} {prog.total === 1 ? "lembrança guardada" : "lembranças guardadas"}</p>
      <Link className="btn btn-s btn-sm" para={ROTAS.arvore}><Icone nome="planta" />Ver minha árvore</Link>
    </section>
  );
}

/**
 * "Esperando você" como uma notificação: uma linha curta (sino + quantas esperam) que abre a lista ao tocar.
 * Fechada por padrão, para a coluna não ficar cheia; a árvore fica logo abaixo.
 */
function Esperando({ memorias, onVer }) {
  const lista = memorias.filter((m) => m.status === "aguardando");
  const [aberto, setAberto] = useState(false);
  const n = lista.length;

  if (n === 0) {
    return (
      <section className="lt-aviso lt-esperando lt-aviso-ok" id="esperando" aria-label="Esperando você">
        <span className="lt-aviso-ic" aria-hidden="true"><Icone nome="certo" tam={22} /></span>
        <span className="lt-aviso-txt"><b>Tudo em dia</b><span>Nada esperando você agora</span></span>
      </section>
    );
  }

  return (
    <section className={`lt-aviso lt-esperando${aberto ? " aberto" : ""}`} id="esperando" aria-labelledby="esp-t">
      <button type="button" className="lt-aviso-bt" aria-expanded={aberto} aria-controls="esp-lista" onClick={() => setAberto((a) => !a)}>
        <span className="lt-aviso-ic" aria-hidden="true"><Icone nome="sino" tam={22} /><span className="lt-aviso-n">{n}</span></span>
        <span className="lt-aviso-txt">
          <b id="esp-t">{n === 1 ? "1 lembrança espera você" : `${n} lembranças esperam você`}</b>
          <span>{aberto ? "Confira se está do jeito que você lembra" : "Toque para ver"}</span>
        </span>
        <span className="lt-aviso-seta" aria-hidden="true"><Icone nome="voltar" tam={20} /></span>
      </button>
      <div className="lt-aviso-corpo" id="esp-lista" hidden={!aberto}>
        <ul className="esp">
          {lista.map((m) => (
            <li key={m.id}>
              <div className="esp-cab">
                <img src={m.foto} alt="" />
                <div>
                  {m.sugestaoIA
                    ? <span className="esp-tipo esp-ia"><Icone nome="espiral" tam={16} />Data sugerida pela IA</span>
                    : <span className="esp-tipo">Foto enviada por {pessoa(m.origem.por).nome}</span>}
                  <b>{m.titulo}</b>
                  {m.sugestaoIA && <span className="esp-data">{m.quando}</span>}
                </div>
              </div>
              <button type="button" className="btn btn-s btn-sm" onClick={() => onVer(m.id)}>
                <Icone nome="ver" />Ver
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Coluna lateral do Início: fixa à direita no computador, embaixo da história no celular. */
export default function Lateral({ memorias, guardadas = [], carregou = true, onVer, children }) {
  const ref = useRef(null);

  // Coluna mais alta que a tela: rola junto e "gruda" quando chega ao fim dela.
  useEffect(() => {
    const el = ref.current;
    const ajustar = () => {
      // a barra do topo só existe no celular; no computador (escondida) a coluna gruda perto do topo
      const nav = document.querySelector(".c-topo-nav");
      const topo = (nav && nav.offsetParent !== null ? nav.offsetHeight : 0) + 16;
      el.style.top = `${Math.min(topo, window.innerHeight - el.offsetHeight - 24)}px`;
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    window.addEventListener("resize", ajustar);
    return () => { ro.disconnect(); window.removeEventListener("resize", ajustar); };
  }, []);

  return (
    <aside className="c-lateral" ref={ref} aria-label="Esperando você e sua árvore da memória">
      {children}
      <Esperando memorias={memorias} onVer={onVer} />
      <Arvore memorias={memorias} guardadas={guardadas} carregou={carregou} />
    </aside>
  );
}
