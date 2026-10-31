import { useEffect, useRef, useState } from "react";
import { reduzirMovimento } from "../azulejaria.js";

const CONVERSAS = [
  { q: "O que a vó Helena cozinhava no Natal?",
    a: <>Pelas memórias guardadas, ela fazia <b>bolo de fubá com erva-doce</b> e um <b>pernil assado</b>.</>,
    fontes: [["cozinha", "Receita do bolo", "enviada por Marta"], ["cafe", "Natal de 1984", "relato da tia Lúcia"]] },
  { q: "Quem estava na festa de 1990?",
    a: <>Encontrei <b>tia Lúcia</b> e <b>Marta</b> nas fotos da festa. Duas pessoas ainda não foram identificadas.</>,
    fontes: [["amarelinha", "Festa de 1990", "foto · 12 pessoas"]], perguntar: true },
  { q: "Onde a vó morou quando casou?",
    a: <>Numa casa em <b>Caruaru</b>, de janela verde. O relato de Marta fala da mudança em 1979.</>,
    fontes: [["janela", "Na janela da casa nova", "foto · 1979"]] },
];

/** Conversa de exemplo com a IA, que troca de pergunta sozinha quando está na tela. */
function ChatDemo() {
  const [i, setI] = useState(0);
  const [digitando, setDigitando] = useState(!reduzirMovimento());
  const ref = useRef(null);

  useEffect(() => {
    if (reduzirMovimento()) return;
    setDigitando(true);
    const t = setTimeout(() => setDigitando(false), 1300);
    return () => clearTimeout(t);
  }, [i]);

  useEffect(() => {
    if (reduzirMovimento()) return;
    let timer;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting) timer = setInterval(() => setI((x) => (x + 1) % CONVERSAS.length), 6500);
    }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => { io.disconnect(); clearInterval(timer); };
  }, []);

  const c = CONVERSAS[i];
  return (
    <div className="chat" ref={ref} aria-live="polite">
      <div className="bub">{c.q}</div>
      <div className="ans">
        {digitando ? (
          <span className="typing"><i /><i /><i /></span>
        ) : (
          <>
            <p>{c.a}</p>
            {c.fontes.map(([foto, titulo, sub]) => (
              <div className="src" key={titulo}>
                <img src={`/img/${foto}.jpg`} alt="" />
                <div>{titulo}<small>{sub}</small></div>
              </div>
            ))}
            {c.perguntar && <button className="btn btn-s btn-sm" type="button" style={{ justifySelf: "start" }}>Perguntar para a família</button>}
          </>
        )}
      </div>
    </div>
  );
}

export default function ComoFunciona() {
  return (
    <section className="band" id="como" style={{ background: "var(--papel)" }}>
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow" style={{ color: "var(--urucum-6)" }}>simples assim</span>
          <h2 className="h2" style={{ color: "var(--anil)" }}>Como funciona</h2>
        </div>

        <div className="passos">
          <article className="passo">
            <div className="vis vis-1">
              <div className="foto leg cant" style={{ width: "62%", transform: "rotate(-5deg)" }}>
                <span className="tape t-gema" style={{ left: "34%", top: -12 }} />
                <img src="/img/album-verde.jpg" alt="Mão de avó folheando um álbum" />
                <span className="lg">o álbum da vó</span>
              </div>
              <div className="receita" style={{ position: "absolute", right: "4%", bottom: "6%", width: "52%", transform: "rotate(4deg)" }}>
                <span className="t">RECEITA DA VÓ</span><h4>Bolo de fubá</h4><p>forno quente, sem abrir!</p>
              </div>
            </div>
            <span className="num">1</span><h3>Guarde</h3>
            <p>Foto do álbum, receita escrita à mão, música do rádio, áudio com um causo. Tudo no mesmo lugar.</p>
          </article>

          <article className="passo">
            <div className="vis vis-2"><ChatDemo /></div>
            <span className="num">2</span><h3>Pergunte</h3>
            <p>A IA conversa com o acervo e mostra de qual memória veio cada resposta. Quando não sabe, ela diz.</p>
          </article>

          <article className="passo">
            <div className="vis vis-3">
              <div className="foto leg" style={{ width: "70%", transform: "rotate(3deg)" }}>
                <span className="tape t-azul" style={{ left: "38%", top: -12 }} />
                <img src="/img/mesinha.jpg" alt="Mesinha com toalha de crochê e porta-retratos" style={{ aspectRatio: "4/3", objectFit: "cover" }} />
                <span className="lg">Recife, c. 1986</span>
              </div>
              <span className="ok-badge" style={{ position: "absolute", left: "6%", bottom: "8%" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                3 pessoas confirmaram
              </span>
            </div>
            <span className="num">3</span><h3>Confirmem juntos</h3>
            <p>Cada sugestão da IA passa pela família. Quem lembra, confirma ou corrige. A história fica certa e fica de todos.</p>
          </article>
        </div>

        <div className="como-exemplo">
          <a className="btn btn-s" href="/maria">Veja um exemplo: a história de Maria →</a>
        </div>
      </div>
    </section>
  );
}
