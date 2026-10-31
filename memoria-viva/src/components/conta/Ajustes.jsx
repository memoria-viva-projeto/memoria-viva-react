import { useEffect, useRef } from "react";
import Icone from "./Icone.jsx";

const TAMANHOS = [["normal", "Normal", "1rem"], ["grande", "Grande", "1.2rem"], ["maior", "Maior", "1.4rem"]];
const TEMAS = [["auto", "Automática", "automatico"], ["claro", "Clara", "sol"], ["escuro", "Escura", "lua"]];

function Opcoes({ nome, legenda, opcoes, valor, onMudar, renderIcone }) {
  return (
    <fieldset className="aj-grupo">
      <legend>{legenda}</legend>
      <div className="aj-opcoes">
        {opcoes.map((op) => (
          <label key={op[0]} className={`aj-op${valor === op[0] ? " on" : ""}`}>
            <input type="radio" name={nome} value={op[0]} checked={valor === op[0]} onChange={() => onMudar(op[0])} />
            {renderIcone(op)}
            <span>{op[1]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Interruptor({ ligado, onMudar, icone, children }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} className="aj-switch" onClick={() => onMudar(!ligado)}>
      <Icone nome={icone} />
      <span className="aj-switch-t">{children}</span>
      <span className="aj-trilho" aria-hidden="true"><span /></span>
      <span className="aj-estado" aria-hidden="true">{ligado ? "Ligado" : "Desligado"}</span>
    </button>
  );
}

/** Painel de ajustes: sobe de baixo no celular, janela central no computador. */
export default function Ajustes({ aberto, onFechar, ajustes, onMudar }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  const mudar = (campo) => (valor) => onMudar({ ...ajustes, [campo]: valor });

  return (
    <dialog ref={ref} className="aj" aria-labelledby="aj-titulo" onClose={onFechar}
      onClick={(e) => e.target === ref.current && onFechar()}>
      <div className="aj-in">
        <div className="aj-cab">
          <h2 id="aj-titulo">Ajustes</h2>
          <button type="button" className="aj-fechar" onClick={onFechar} aria-label="Fechar ajustes">
            <Icone nome="fechar" tam={28} />
          </button>
        </div>

        <Opcoes nome="texto" legenda="Tamanho do texto" opcoes={TAMANHOS} valor={ajustes.texto} onMudar={mudar("texto")}
          renderIcone={(op) => <span className="aj-a" aria-hidden="true" style={{ fontSize: op[2] }}>A</span>} />

        <Opcoes nome="tema" legenda="Aparência" opcoes={TEMAS} valor={ajustes.tema} onMudar={mudar("tema")}
          renderIcone={(op) => <Icone nome={op[2]} />} />

        <div className="aj-switches">
          <Interruptor ligado={ajustes.contraste} onMudar={mudar("contraste")} icone="contraste">Alto contraste</Interruptor>
          <Interruptor ligado={ajustes.menosMovimento} onMudar={mudar("menosMovimento")} icone="movimento">Menos movimento</Interruptor>
        </div>

        <p className="aj-nota">Suas escolhas ficam guardadas neste aparelho.</p>

        <a className="btn btn-s aj-sair" href="/"><Icone nome="sair" />Sair da conta de teste</a>
      </div>
    </dialog>
  );
}
