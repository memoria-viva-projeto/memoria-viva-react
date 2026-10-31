import Icone from "./Icone.jsx";

// [tipo, nome, subtítulo, ícone]
const TIPOS = [
  ["foto", "Uma foto", "e a história por trás dela", "foto"],
  ["relato", "Um relato", "falando ou escrevendo", "microfone"],
  ["receita", "Uma receita", "com o jeito de fazer", "receita"],
  ["musica", "Uma música", "que marcou uma época", "musica"],
  ["conselho", "Um conselho", "o que a vida te ensinou", "conselho"],
];

/** "O que você quer guardar hoje?": cinco jeitos de acrescentar uma memória. */
export default function Guardar({ onAviso }) {
  return (
    <section className="gd" aria-labelledby="gd-titulo">
      <h2 id="gd-titulo" className="c-h2">O que você quer guardar hoje?</h2>
      <div className="gd-grade">
        {TIPOS.map(([tipo, nome, sub, icone]) => (
          <button key={tipo} type="button" className={`gd-bt gd-${tipo}`} onClick={() => onAviso()}>
            <span className="gd-ic blob"><Icone nome={icone} tam={30} /></span>
            <span className="gd-nome">{nome}</span>
            <span className="gd-sub">{sub}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
