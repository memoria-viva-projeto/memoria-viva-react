import Icone from "./Icone.jsx";

// [tipo, nome, subtítulo, ícone, foto do moodboard que representa o tipo]
const TIPOS = [
  ["foto", "Uma foto", "e a história por trás dela", "foto", "album-verde"],
  ["relato", "Um relato", "falando ou escrevendo", "microfone", "janela-casal"],
  ["receita", "Uma receita", "com o jeito de fazer", "receita", "cozinha"],
  ["musica", "Uma música", "que marcou uma época", "musica", "sala-azul"],
  ["conselho", "Um conselho", "o que a vida te ensinou", "conselho", "cafe"],
];

/** "O que você quer guardar hoje?": cinco jeitos de acrescentar uma memória. As fotos só ilustram cada tipo. */
export default function Guardar({ onAviso }) {
  return (
    <section className="gd" aria-labelledby="gd-titulo">
      <div className="gd-cab">
        <h2 id="gd-titulo" className="c-h2">O que você quer guardar hoje?</h2>
        <span className="gd-nota">fotos ilustrativas</span>
      </div>
      <div className="gd-grade">
        {TIPOS.map(([tipo, nome, sub, icone, foto]) => (
          <button key={tipo} type="button" className={`gd-bt gd-${tipo}`} onClick={() => onAviso()}>
            <span className="gd-foto-fundo" style={{ backgroundImage: `url(/img/${foto}.jpg)` }} aria-hidden="true" />
            <span className="gd-ic blob"><Icone nome={icone} tam={28} /></span>
            <span className="gd-txt">
              <span className="gd-nome">{nome}</span>
              <span className="gd-sub">{sub}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
