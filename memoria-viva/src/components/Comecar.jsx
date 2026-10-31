import { useEffect, useRef, useState } from "react";
import { desenharPeca, planejar, reduzirMovimento } from "../azulejaria.js";

const N = 8; // painel de 8 x 8 peças

/** Painel de azulejos que se monta peça por peça a partir do nome da família. */
function PainelFamilia({ nome }) {
  const refs = useRef([]);

  useEffect(() => {
    const plano = planejar(nome, N * N);
    const timers = [];
    refs.current.forEach((cv, i) => {
      const p = plano[i];
      const desenhar = () => desenharPeca(cv.getContext("2d"), p.k, 0, 0, 120, p.fundo, p.cor, p.giro);
      if (reduzirMovimento()) return desenhar();
      const atraso = ((i % N) + Math.floor(i / N)) * 35;
      timers.push(setTimeout(() => {
        cv.style.transform = "rotateY(90deg) scale(.6)";
        timers.push(setTimeout(() => { desenhar(); cv.style.transform = ""; }, 180));
      }, atraso));
    });
    return () => timers.forEach(clearTimeout);
  }, [nome]);

  return (
    <div className="painel" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
      {Array.from({ length: N * N }, (_, i) => (
        <canvas key={i} width="120" height="120" ref={(el) => (refs.current[i] = el)} />
      ))}
    </div>
  );
}

export default function Comecar() {
  const [familia, setFamilia] = useState("Família de Helena");
  const [painel, setPainel] = useState(familia);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | "ok" | "erro"

  // espera a pessoa parar de digitar para remontar o painel
  useEffect(() => {
    const t = setTimeout(() => setPainel(familia.trim() || "Sua família"), 260);
    return () => clearTimeout(t);
  }, [familia]);

  const enviar = (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setStatus(ok ? "ok" : "erro");
    // TODO: cadastro de verdade; por enquanto leva ao login de teste
    if (ok) window.location.href = "/entrar";
  };

  return (
    <section className="band final" id="comecar">
      <div className="wrap final-grid">
        <div>
          <span className="eyebrow" style={{ color: "var(--urucum-7)" }}>bora começar?</span>
          <h2 className="h2">Toda família tem um azulejo. Qual é o da sua?</h2>
          <p className="lede" style={{ marginTop: 18 }}>Digite o nome da família e veja a capa do seu acervo se montar.</p>

          <form className="form" onSubmit={enviar} noValidate>
            <div className="f2">
              <div>
                <label htmlFor="fam">Nome da família</label>
                <input id="fam" type="text" value={familia} onChange={(e) => setFamilia(e.target.value)} autoComplete="off" maxLength={40} />
              </div>
              <div>
                <label htmlFor="email">Seu e-mail</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
              </div>
            </div>
            <button className="btn btn-p" type="submit">Quero começar o acervo</button>
            {status === "erro" && <p className="err">Confira o e-mail: falta o @ ou o domínio.</p>}
            {/* TODO: ligar a um serviço de cadastro de verdade */}
            {status === "ok" && <p className="msg">anotado! isto é uma prévia, o cadastro abre em breve.</p>}
          </form>

          <ul className="trust">
            <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="7.5" cy="12" r="3.6" /><path d="M11.1 12H21M17.5 12v3.2M20.5 12v2.4" /></svg>Você decide quem vê</li>
            <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M8.6 12.2l2.3 2.3 4.5-4.8" /></svg>A IA mostra a fonte</li>
            <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>Apagar é apagar</li>
          </ul>
        </div>

        <div className="painel-wrap">
          <PainelFamilia nome={painel} />
          <span className="tape t-papel" style={{ left: -18, top: 18, transform: "rotate(-40deg)" }} />
          <span className="tape t-papel" style={{ right: -18, bottom: 18, transform: "rotate(-40deg)" }} />
          <span className="painel-nome mao">{familia.trim() || "Sua família"}</span>
        </div>
      </div>
    </section>
  );
}
