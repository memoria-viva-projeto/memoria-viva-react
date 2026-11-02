import { useEffect, useRef } from "react";
import { desenharPeca, planejar, reduzirMovimento } from "../azulejaria.js";

const N = 8; // painel de 8 x 8 peças

/** Painel de azulejos que se monta peça por peça a partir do nome da família. */
export default function PainelFamilia({ nome }) {
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
