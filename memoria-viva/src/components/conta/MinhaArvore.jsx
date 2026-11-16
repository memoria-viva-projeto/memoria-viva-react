import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import ArvoreMemoria from "./ArvoreMemoria.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { ESTAGIOS, contarMemorias, lerVisto, progresso, salvarVisto } from "./arvoreMemoria.js";

const plural = (n) => (n === 1 ? "lembrança" : "lembranças");

// pétalas e folhinhas que caem devagar pela cena (posição, atraso, duração, tipo)
const CAINDO = [[18, 0, 9, "p"], [34, 3.5, 11, "f"], [62, 1.5, 10, "p"], [76, 6, 12, "f"], [48, 8, 9.5, "p"], [86, 2.5, 13, "f"]];

/**
 * A árvore em destaque, numa cena (céu, sol, colinas) com pétalas caindo. Tocar na árvore faz ela balançar.
 * Pouco texto de cara: o estágio, uma frase e as folhinhas até o próximo estágio.
 */
function Minha({ prog, celebrar, onFecharCelebrar }) {
  const { total, atual, prox, faltam, fracao, i } = prog;
  const [sacode, setSacode] = useState(0);
  const folhas = 10; // o medidor: 10 folhinhas até o próximo estágio
  const cheias = prox ? Math.round(fracao * folhas) : folhas;
  return (
    <div className="ma-cena-wrap">
      <div className={`ma-cena ma-est-${i}`}>
        <span className="ma-sol" aria-hidden="true" />
        <span className="ma-nuvem ma-nuvem-1" aria-hidden="true" />
        <span className="ma-nuvem ma-nuvem-2" aria-hidden="true" />
        <span className="ma-colina ma-colina-1" aria-hidden="true" />
        <span className="ma-colina ma-colina-2" aria-hidden="true" />
        {i > 0 && CAINDO.map(([x, a, d, t], k) => (
          <span key={k} className={`ma-cai ma-cai-${t}`} aria-hidden="true" style={{ left: `${x}%`, animationDelay: `${a}s`, animationDuration: `${d}s` }} />
        ))}

        <span className="ma-selo"><Icone nome="planta" tam={18} />Estágio {i + 1} de {ESTAGIOS.length} · <b>{atual.nome}</b></span>

        <button type="button" className={`ma-arvore-bt${sacode ? " sacode" : ""}`} key={sacode} onClick={() => setSacode((n) => n + 1)}
          aria-label={`${atual.nome}: ${total} ${plural(total)}. Toque para balançar a árvore.`}>
          <ArvoreMemoria total={total} className="ma-arvore" />
        </button>

        {celebrar && (
          <div className="ma-festa" role="status">
            <span className="ma-festa-ic" aria-hidden="true"><Icone nome="planta" tam={22} /></span>
            <p><b>Sua árvore cresceu!</b> Agora ela é: {atual.nome}.</p>
            <button type="button" className="ma-festa-x" onClick={onFecharCelebrar} aria-label="Fechar"><Icone nome="fechar" tam={18} /></button>
          </div>
        )}
      </div>

      <div className="ma-rodape">
        <p className="mao ma-frase">{atual.frase}</p>
        <div className="ma-medidor">
          <span className="ma-medidor-n"><b>{total}</b> {plural(total)}</span>
          {prox ? (
            <>
              <span className="ma-folhinhas" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fracao * 100)}
                aria-label={`${faltam} ${plural(faltam)} para ${prox.nome}`}>
                {Array.from({ length: folhas }, (_, k) => <i key={k} className={k < cheias ? "on" : ""} />)}
              </span>
              <span className="ma-medidor-falta">mais {faltam} para <b>{prox.curto.toLowerCase()}</b></span>
            </>
          ) : <span className="ma-medidor-falta">árvore completa</span>}
        </div>
        <Link className="btn btn-p btn-sm" para={ROTAS.guardar}><Icone nome="mais" />Guardar uma lembrança</Link>
      </div>
    </div>
  );
}

// as mini telas do tutorial: uma por estágio e, no fim, um recado
const TELAS = [
  { est: 0, titulo: "Você ganha uma muda", texto: "Ao criar sua conta, uma pequena muda é plantada. Ela é o começo da sua história aqui." },
  { est: 1, titulo: "Cada lembrança vira folha", texto: "Guardou uma foto, uma receita, uma música? A árvore cresce e ganha folhas." },
  { est: 2, titulo: "Surgem galhos e flores", texto: "Com mais lembranças, a copa se forma e aparecem as primeiras flores." },
  { est: 3, titulo: "Sua história floresce", texto: "A copa se enche de flores. Cada uma é uma memória que agora está guardada." },
  { est: 4, titulo: "Uma árvore cheia de vida", texto: "Madura, com flores e frutos: a forma da sua história. E ela continua crescendo." },
  { fim: true, titulo: "Cada lembrança importa", texto: "Do tamanho que for. A árvore não mede o que você conquistou: mede quantas histórias você decidiu preservar." },
];

/**
 * "Como funciona?" como um cartão de tutorial: uma mini tela por vez, com bolinhas para passar.
 * Setas do teclado, botões e arrastar com o dedo também passam.
 */
function Tutorial({ prog, aberto, onFechar }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  const toque = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (aberto && !d.open) { setN(0); d.showModal(); } else if (!aberto && d.open) d.close();
  }, [aberto]);
  const ir = (k) => setN(Math.max(0, Math.min(TELAS.length - 1, k)));
  const t = TELAS[n];
  const e = t.fim ? null : ESTAGIOS[t.est];
  const estado = e && (t.est < prog.i ? "feito" : t.est === prog.i ? "atual" : "futuro");
  const ultima = n === TELAS.length - 1;

  return (
    <dialog ref={ref} className="tu" aria-labelledby="tu-t" onClose={() => aberto && onFechar()}
      onClick={(ev) => ev.target === ev.currentTarget && onFechar()}
      onKeyDown={(ev) => { if (ev.key === "ArrowRight") ir(n + 1); if (ev.key === "ArrowLeft") ir(n - 1); }}>
      {aberto && (
        <div className="tu-card" onPointerDown={(ev) => { toque.current = ev.clientX; }}
          onPointerUp={(ev) => { const dx = ev.clientX - (toque.current ?? ev.clientX); if (Math.abs(dx) > 50) ir(n + (dx < 0 ? 1 : -1)); toque.current = null; }}>
          <button type="button" className="tu-x" onClick={onFechar} aria-label="Fechar o tutorial"><Icone nome="fechar" tam={20} /></button>
          <p className="mao tu-rot">como funciona</p>

          <div className="tu-tela" key={n} aria-live="polite">
            <div className={`tu-ilus${t.fim ? " tu-ilus-fim" : ""}`}>
              {t.fim ? <ArvoreMemoria total={prog.total} crescer={false} rotulo="A sua árvore hoje" />
                : <ArvoreMemoria total={e.min} crescer={false} rotulo={`Ilustração: ${e.nome}`} />}
            </div>
            <p className="tu-passo">{t.fim ? "Lembre-se" : `Estágio ${t.est + 1} · ${e.min === 0 ? "ao criar a conta" : `a partir de ${e.min} ${plural(e.min)}`}`}</p>
            <h2 id="tu-t" className="tu-t">{t.titulo}</h2>
            <p className="tu-txt">{t.texto}</p>
            {estado === "atual" && <span className="tu-chip"><Icone nome="planta" tam={16} />Você está aqui</span>}
            {estado === "feito" && <span className="tu-chip tu-chip-ok"><Icone nome="certo" tam={16} />Você já passou por aqui</span>}
            {estado === "futuro" && <span className="tu-chip tu-chip-futuro">Faltam {e.min - prog.total} {plural(e.min - prog.total)}</span>}
          </div>

          <div className="tu-nav">
            <button type="button" className="tu-seta" onClick={() => ir(n - 1)} disabled={n === 0} aria-label="Anterior"><Icone nome="voltar" tam={20} /></button>
            <div className="tu-bolinhas" role="group" aria-label="Telas do tutorial">
              {TELAS.map((x, k) => (
                <button key={k} type="button" className="tu-bolinha" aria-current={k === n ? "step" : undefined}
                  aria-label={`Tela ${k + 1} de ${TELAS.length}: ${x.titulo}`} onClick={() => ir(k)} />
              ))}
            </div>
            {ultima
              ? <button type="button" className="btn btn-p btn-sm tu-fim" onClick={onFechar}>Entendi</button>
              : <button type="button" className="tu-seta tu-prox" onClick={() => ir(n + 1)} aria-label="Próxima"><Icone nome="voltar" tam={20} /></button>}
          </div>
        </div>
      )}
    </dialog>
  );
}

/**
 * Minha árvore: a árvore da memória da pessoa (cresce com as memórias) e o tutorial "Como funciona?".
 * O estágio já visto fica salvo para celebrar só uma vez.
 */
export default function MinhaArvore({ memorias, guardadas, carregou }) {
  const [tutorial, setTutorial] = useState(false);
  const [celebrar, setCelebrar] = useState(false);
  const prog = progresso(contarMemorias(memorias, guardadas));

  // chegou a um estágio novo desde a última visita? celebra uma vez (e guarda o estágio, também quando ele recua)
  useEffect(() => {
    if (!carregou) return;
    const visto = lerVisto();
    if (visto !== null && prog.i > visto) setCelebrar(true);
    salvarVisto(prog.i, prog.total);
  }, [carregou, prog.i, prog.total]);

  return (
    <div className="c-wrap ma">
      <header className="ma-cab">
        <div>
          <span className="mao ma-rot">sua história, crescendo</span>
          <h1 className="ma-t" tabIndex={-1}>Minha árvore da memória</h1>
        </div>
        <button type="button" className="ma-como-bt" onClick={() => setTutorial(true)} aria-haspopup="dialog">
          <Icone nome="ajuda" tam={20} />Como funciona?
        </button>
      </header>

      {!carregou ? <p role="status" className="ma-carregando">Abrindo sua árvore…</p>
        : <Minha prog={prog} celebrar={celebrar} onFecharCelebrar={() => setCelebrar(false)} />}

      <Tutorial prog={prog} aberto={tutorial} onFechar={() => setTutorial(false)} />
    </div>
  );
}
