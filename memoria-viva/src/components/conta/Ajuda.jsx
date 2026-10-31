import { useEffect, useRef } from "react";
import Icone from "./Icone.jsx";
import { BotaoOuvir } from "./voz.jsx";

// [ícone, título, explicação] — curtas e do dia a dia
const PASSOS = [
  ["microfone", "Conte uma lembrança", "Na pergunta do dia, toque em “Quero contar”. Pode falar, sem pressa."],
  ["mais", "Guarde o que quiser", "Toque em “Guardar” para juntar uma foto, uma receita, uma música ou um conselho."],
  ["certo", "Confira o que a família mandou", "Quando chegar algo novo, você decide: “Está certo” ou “Corrigir”."],
  ["altofalante", "Ouça em vez de ler", "Onde aparecer “Ouvir”, o aparelho lê o texto em voz alta para você."],
];

/** "Como usar": explicação curta, que também pode ser ouvida. */
export default function Ajuda({ aberto, onFechar, onAbrirAjustes, onAviso }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  const textoFalado = () => ["Como usar o Memória Viva.", ...PASSOS.map(([, t, e]) => `${t}. ${e}`),
    "Para aumentar a letra, toque em Ajustes."].join(" ");

  return (
    <dialog ref={ref} className="aj" aria-labelledby="ajuda-titulo" onClose={onFechar}
      onClick={(e) => e.target === ref.current && onFechar()}>
      <div className="aj-in">
        <div className="aj-cab">
          <h2 id="ajuda-titulo">Como usar</h2>
          <button type="button" className="aj-fechar" onClick={onFechar} aria-label="Fechar ajuda">
            <Icone nome="fechar" tam={28} />
          </button>
        </div>

        <BotaoOuvir texto={textoFalado} rotulo="Ouvir estas instruções" className="btn btn-s" />

        <ol className="ajuda-passos">
          {PASSOS.map(([icone, titulo, texto]) => (
            <li key={titulo}>
              <span className="ajuda-ic blob"><Icone nome={icone} /></span>
              <div><b>{titulo}</b><p>{texto}</p></div>
            </li>
          ))}
        </ol>

        <div className="ajuda-bt">
          <button type="button" className="btn btn-s" onClick={() => { onFechar(); onAbrirAjustes(); }}>
            <Icone nome="ajustes" />Letra maior e outros ajustes
          </button>
          <button type="button" className="btn btn-s" onClick={() => { onFechar(); onAviso(); }}>
            <Icone nome="familia" />Pedir ajuda a alguém da família
          </button>
        </div>
      </div>
    </dialog>
  );
}
