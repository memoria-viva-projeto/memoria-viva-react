import { useRef, useState } from "react";
import Icone from "./Icone.jsx";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA } from "../../dados/conta.js";
import { menosMovimento } from "./efeitos.js";

// Começa por "Com meus pais" e depois passa pelas outras fotos do acervo.
const FOTOS = CONTA.memorias.filter((m) => m.foto).sort((a, b) => a.ano - b.ano);

/** Destaque da página: uma foto do acervo e uma pergunta para conversar com a IA. */
export default function PerguntaDoDia({ onAviso }) {
  const [n, setN] = useState(0);
  const [hojeNao, setHojeNao] = useState(false);
  const [girando, setGirando] = useState(false);
  const cartaRef = useRef(null);

  const foto = FOTOS[n % FOTOS.length];
  const pergunta = CONTA.perguntas[n % CONTA.perguntas.length];

  // "Outra foto": a foto gira como uma carta e volta mostrando outra
  const outra = async () => {
    if (girando) return;
    const el = cartaRef.current;
    if (menosMovimento() || !el.animate) return setN((x) => x + 1);
    setGirando(true);
    await el.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }], { duration: 260, easing: "ease-in" }).finished;
    setN((x) => x + 1);
    await el.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0)" }], { duration: 340, easing: "cubic-bezier(.2,1.3,.4,1)" }).finished;
    setGirando(false);
  };

  return (
    <section className="pd" aria-labelledby="pd-pergunta">
      <FaixaAzulejos semente="pergunta do dia" tamanho={72} girar={false} pares={PARES_URUCUM_ANIL} className="pd-azulejos" />

      <div className="pd-foto">
        <div className="pd-carta" ref={cartaRef}>
          <div className="pd-pendurada">
            <div className="foto cant">
              <span className="tape t-turq" style={{ left: "50%", top: -14, transform: "translateX(-50%) rotate(-4deg)" }} />
              <img src={foto.foto} alt={foto.alt} />
            </div>
          </div>
        </div>
      </div>

      <div className="pd-txt">
        <span className="mao pd-rotulo">pergunta do dia</span>
        <h2 id="pd-pergunta" className="pd-pergunta" key={n}>{pergunta}</h2>
        <p className="sr" aria-live="polite">{n > 0 ? `Outra foto: ${foto.titulo}. ${pergunta}` : ""}</p>
        <p className="pd-apoio">Sobre “{foto.titulo}”, {foto.quando}. Responda quando quiser, sem pressa.</p>

        <div className="pd-botoes">
          <button type="button" className="btn btn-p" onClick={() => onAviso()}>
            <Icone nome="microfone" />Quero contar
          </button>
          <button type="button" className="btn btn-s" onClick={outra} disabled={girando}>
            <Icone nome="trocar" />Outra foto
          </button>
          {!hojeNao && (
            <button type="button" className="btn-l" onClick={() => setHojeNao(true)}>
              <Icone nome="lua" />Hoje não
            </button>
          )}
        </div>
        {hojeNao && <p className="pd-tudobem" role="status">Tudo bem. Amanhã tem outra foto esperando você.</p>}
      </div>
    </section>
  );
}
