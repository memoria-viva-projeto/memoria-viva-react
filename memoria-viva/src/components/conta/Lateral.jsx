import { useEffect, useRef } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { CONTA, pessoa, legado } from "../../dados/conta.js";

// Lugares dos galhos onde cada memória vira folha (e flor, quando confirmada).
const GALHOS = [[160, 46], [108, 74], [214, 70], [80, 116], [240, 112], [134, 108], [188, 100], [160, 138], [116, 146], [206, 142]];
const FOLHAS = [[-11, -3, -35], [10, -4, 35], [0, 10, 90]];

function Arvore({ memorias }) {
  const flores = memorias.filter((m) => m.status === "confirmada").length;
  return (
    <section className="lt-bloco" aria-labelledby="arv-t">
      <h2 id="arv-t" className="c-h2">Sua árvore da memória</h2>
      <svg className="arv" viewBox="0 0 320 262" role="img"
        aria-label={`Ilustração de uma árvore com ${memorias.length} galhos de folhas; ${flores} já viraram flor.`}>
        <ellipse className="arv-chao" cx="160" cy="250" rx="120" ry="10" />
        <g className="arv-balanca">
          <path className="arv-tronco" d="M146 252c4-30 2-58 8-92-14-18-34-30-58-40l4-6c22 8 40 18 56 34 2-26 2-48-2-72h8c4 26 4 50 2 74 16-16 36-30 62-40l3 7c-26 10-46 26-58 44-4 30-2 62 4 91z" />
          <g className="arv-copa">
            <circle cx="160" cy="92" r="72" /><circle cx="100" cy="118" r="50" /><circle cx="222" cy="112" r="52" />
            <circle cx="128" cy="62" r="44" /><circle cx="196" cy="60" r="44" />
          </g>
          {memorias.slice(0, GALHOS.length).map((m, i) => {
            const [x, y] = GALHOS[i];
            return (
              <g key={m.id} transform={`translate(${x} ${y})`}>
                {FOLHAS.map(([dx, dy, r], k) => (
                  <ellipse key={k} className="arv-folha" cx={dx} cy={dy} rx="10" ry="5" transform={`rotate(${r} ${dx} ${dy})`} />
                ))}
                {m.status === "confirmada" && (
                  <g className={`arv-flor ${i % 2 ? "f-gema" : "f-uru"}`}>
                    {[0, 72, 144, 216, 288].map((a) => <circle key={a} r="5.2" cx={Math.cos((a * Math.PI) / 180) * 5.6} cy={Math.sin((a * Math.PI) / 180) * 5.6} />)}
                    <circle className="arv-miolo" r="3.4" />
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <p className="lt-txt">Sua árvore está florindo. Cada lembrança vira folha.</p>
    </section>
  );
}

function Esperando({ memorias, onConfirmar, onVer }) {
  const tituloRef = useRef(null);
  const lista = memorias.filter((m) => m.status === "aguardando");

  const confirmar = (id, el) => {
    onConfirmar(id, el);
    requestAnimationFrame(() => tituloRef.current?.focus());
  };

  return (
    <section className="lt-bloco" aria-labelledby="esp-t">
      <h2 id="esp-t" className="c-h2" ref={tituloRef} tabIndex={-1}>Esperando você</h2>
      {lista.length === 0 ? (
        <p className="lt-txt">Tudo em dia. Quando a família mandar algo novo, aparece aqui.</p>
      ) : (
        <>
          <p className="lt-txt">Confira se está do jeito que você lembra.</p>
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
                <div className="esp-bt">
                  <button type="button" className="btn btn-p btn-sm" onClick={(e) => confirmar(m.id, e.currentTarget)}>
                    <Icone nome="certo" />Está certo
                  </button>
                  <button type="button" className="btn btn-s btn-sm" onClick={() => onVer(m.id)}>
                    <Icone nome="ver" />Ver
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Familia({ onAviso }) {
  return (
    <section className="lt-bloco" aria-labelledby="fam-t">
      <h2 id="fam-t" className="c-h2">Sua família</h2>
      <ul className="fam">
        {CONTA.familia.map((p) => (
          <li key={p.id}><Avatar id={p.id} tam={60} /><b>{p.nome}</b><span>{p.relacao}</span></li>
        ))}
      </ul>
      <button type="button" className="btn btn-s" onClick={() => onAviso()}><Icone nome="convidar" />Convidar alguém para contar</button>
    </section>
  );
}

function Legado({ memorias, onAviso }) {
  const l = legado(memorias);
  return (
    <section className="lt-bloco lt-legado" aria-labelledby="leg-t">
      <h2 id="leg-t" className="c-h2">Seu legado</h2>
      <p className="leg-num">
        <span><b>{l.lembrancas}</b> lembranças</span><span aria-hidden="true">·</span>
        <span><b>{l.decadas}</b> décadas</span><span aria-hidden="true">·</span>
        <span><b>{l.cidades}</b> cidades</span>
      </p>
      <button type="button" className="btn btn-s" onClick={() => onAviso()}><Icone nome="linha" />Ver minha linha da vida</button>
    </section>
  );
}

/** Coluna lateral: fixa à direita no computador, embaixo do feed no celular. */
export default function Lateral({ memorias, onConfirmar, onVer, onAviso }) {
  const ref = useRef(null);

  // Coluna mais alta que a tela: rola junto e "gruda" quando chega ao fim dela.
  useEffect(() => {
    const el = ref.current;
    const ajustar = () => {
      const topo = (document.querySelector(".c-topo-nav")?.offsetHeight || 76) + 20;
      el.style.top = `${Math.min(topo, window.innerHeight - el.offsetHeight - 24)}px`;
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    window.addEventListener("resize", ajustar);
    return () => { ro.disconnect(); window.removeEventListener("resize", ajustar); };
  }, []);

  return (
    <aside className="c-lateral" ref={ref} aria-label="Sua árvore, sua família e seu legado">
      <Arvore memorias={memorias} />
      <Esperando memorias={memorias} onConfirmar={onConfirmar} onVer={onVer} />
      <Familia onAviso={onAviso} />
      <Legado memorias={memorias} onAviso={onAviso} />
    </aside>
  );
}
