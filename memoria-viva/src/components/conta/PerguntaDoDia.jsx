import { useRef, useState } from "react";
import Icone from "./Icone.jsx";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA } from "../../dados/conta.js";
import { menosMovimento } from "./efeitos.js";
import { BotaoOuvir } from "./voz.jsx";

/**
 * Destaque da página: uma foto do acervo dela e uma pergunta para conversar com a IA.
 * Só usa lembranças já confirmadas por ela (nunca fotos genéricas, nunca o que ainda espera confirmação).
 */
export default function PerguntaDoDia({ memorias, onAviso }) {
  const [n, setN] = useState(0);
  const [hojeNao, setHojeNao] = useState(false);
  const [girando, setGirando] = useState(false);
  const cartaRef = useRef(null);

  // começa pela mais antiga ("Com meus pais") e segue pelas outras
  const fotos = memorias.filter((m) => m.foto && m.status === "confirmada").sort((a, b) => a.ano - b.ano);
  if (fotos.length === 0) {
    return (
      <section className="pd pd-vazia" aria-labelledby="pd-pergunta">
        <span className="mao pd-rotulo">pergunta do dia</span>
        <h2 id="pd-pergunta" className="pd-pergunta">Que foto da sua vida você quer guardar primeiro?</h2>
        <p className="pd-apoio">Quando você guardar suas fotos, elas aparecem aqui com uma pergunta por dia.</p>
        <div className="pd-botoes">
          <button type="button" className="btn btn-p pd-contar" onClick={() => onAviso()}><Icone nome="foto" />Guardar uma foto</button>
        </div>
      </section>
    );
  }
  const foto = fotos[n % fotos.length];
  const pergunta = CONTA.perguntas[n % CONTA.perguntas.length];
  const apoio = `Sobre “${foto.titulo}”, ${foto.quando}.`;

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

      <div className="pd-cab">
        <span className="mao pd-rotulo">pergunta do dia</span>
        <p className="pd-apoio">{apoio}</p>
      </div>

      <h2 id="pd-pergunta" className="pd-pergunta" key={n}>{pergunta}</h2>
      <p className="sr" aria-live="polite">{n > 0 ? `Outra foto: ${foto.titulo}. ${pergunta}` : ""}</p>

      <div className="pd-botoes">
        <button type="button" className="btn btn-p pd-contar" onClick={() => onAviso()}>
          <Icone nome="microfone" />Quero contar
        </button>
        <BotaoOuvir texto={() => `${pergunta} ${apoio}`} rotulo="Ouvir" className="btn btn-s" />
        {fotos.length > 1 && (
          <button type="button" className="btn btn-s" onClick={outra} disabled={girando}>
            <Icone nome="trocar" />Outra foto
          </button>
        )}
        {!hojeNao && (
          <button type="button" className="btn-l" onClick={() => setHojeNao(true)}>
            <Icone nome="lua" />Hoje não
          </button>
        )}
      </div>
      {hojeNao && <p className="pd-tudobem" role="status">Tudo bem. Amanhã tem outra foto esperando você.</p>}
    </section>
  );
}
