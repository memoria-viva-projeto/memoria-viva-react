import { useEffect, useRef } from "react";
import { desenharPeca, planejar, reduzirMovimento } from "../azulejaria.js";

/** Faixa de azulejos que vão girando aos poucos. */
export default function FaixaAzulejos({ semente, tamanho = 56, girar = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    let plano = [], g, cols = 0;

    const desenhar = () => {
      const { width, height } = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
      g = cv.getContext("2d"); g.scale(dpr, dpr);
      cols = Math.ceil(width / tamanho);
      const linhas = Math.ceil(height / tamanho);
      plano = planejar(semente, cols * linhas);
      plano.forEach((p, i) => desenharPeca(g, p.k, (i % cols) * tamanho, Math.floor(i / cols) * tamanho, tamanho, p.fundo, p.cor, p.giro));
    };
    desenhar();

    const ro = new ResizeObserver(desenhar);
    ro.observe(cv);

    let timer;
    if (girar && !reduzirMovimento()) {
      timer = setInterval(() => {
        for (let n = 0; n < 2; n++) {
          const i = Math.floor(Math.random() * plano.length);
          const p = plano[i]; p.giro = (p.giro + 1) % 4;
          desenharPeca(g, p.k, (i % cols) * tamanho, Math.floor(i / cols) * tamanho, tamanho, p.fundo, p.cor, p.giro);
        }
      }, 700);
    }
    return () => { ro.disconnect(); clearInterval(timer); };
  }, [semente, tamanho, girar]);

  return <canvas ref={ref} className="strip" style={{ height: tamanho }} aria-hidden="true" />;
}
