import Icone from "./Icone.jsx";
import { Link, ROTAS } from "./rotas.jsx";

// [tipo (ver TIPOS em guardados.js), nome, subtítulo, ícone, foto do moodboard que representa o tipo]
const TIPOS = [
  ["foto", "Uma foto", "e a história por trás dela", "foto", "album-verde"],
  ["album", "Um álbum", "muitas fotos de uma vez", "album", "retratos"],
  ["receita", "Uma receita", "com o jeito de fazer", "receita", "cozinha"],
  ["musica", "Uma música", "que marcou uma época", "musica", "sala-azul"],
  ["video", "Um vídeo", "um momento com som", "video", "janela-casal"],
];

/** "O que você quer guardar hoje?": atalhos para cada tipo de memória. As fotos só ilustram cada tipo. */
export default function Guardar() {
  return (
    <section className="gd" aria-labelledby="gd-titulo">
      <div className="gd-cab">
        <h2 id="gd-titulo" className="c-h2">O que você quer guardar hoje?</h2>
        <span className="gd-nota">fotos ilustrativas</span>
      </div>
      <div className="gd-grade">
        {TIPOS.map(([tipo, nome, sub, icone, foto]) => (
          <Link key={tipo} className={`gd-bt gd-${tipo}`} para={`${ROTAS.guardar}/${tipo}`}>
            <span className="gd-foto-fundo" style={{ backgroundImage: `url(/img/${foto}.jpg)` }} aria-hidden="true" />
            <span className="gd-ic blob"><Icone nome={icone} tam={28} /></span>
            <span className="gd-txt">
              <span className="gd-nome">{nome}</span>
              <span className="gd-sub">{sub}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
