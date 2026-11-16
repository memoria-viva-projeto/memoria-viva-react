import { useEffect, useRef, useState } from "react";
import { reduzirMovimento } from "../azulejaria.js";
import Adesivo from "./Adesivo.jsx";

/** Faixa do 47%: o número conta de 0 a 47 quando aparece na tela. */
export default function Numero() {
  const [valor, setValor] = useState(47);
  const ref = useRef(null);

  useEffect(() => {
    if (reduzirMovimento()) return;
    let feito = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || feito) return;
      feito = true;
      const t0 = performance.now();
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / 1100);
        setValor(Math.round(47 * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    }, { threshold: 0.6 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section className="band numero">
      <div className="wrap numero-grid">
        <div>
          <b className="pct" ref={ref}>{valor}%</b>
          <p className="pct-t">das pessoas sabem o nome dos quatro avós.</p>
          <p className="pct-s">E 66% gostariam de conhecer mais a história da família. Fonte: Ancestry/OnePoll, 2019.</p>
        </div>
        <div className="numero-fotos" aria-hidden="true">
          <Adesivo nome="arara_vermelha" className="ad-numero" />
          <div className="foto cant" style={{ width: "56%", transform: "rotate(-4deg)" }}><img src="/img/retratos.jpg" alt="" /></div>
          <div className="foto leg" style={{ width: "50%", position: "absolute", right: 0, bottom: 0, transform: "rotate(5deg)" }}>
            <span className="tape t-gema" style={{ left: "34%", top: -12 }} />
            <img src="/img/amarelinha-pulo.jpg" alt="" />
            <span className="lg">e eu?</span>
          </div>
        </div>
      </div>
    </section>
  );
}
