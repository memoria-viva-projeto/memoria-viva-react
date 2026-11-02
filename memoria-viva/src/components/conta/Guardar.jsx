import Icone from "./Icone.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { menosMovimento } from "./efeitos.js";

// [tipo (ver TIPOS em guardados.js), nome, subtítulo, ícone, foto do moodboard que representa o tipo]
const TIPOS = [
  ["foto", "Uma foto", "Uma história em imagem", "foto", "album-verde"],
  ["album", "Um álbum", "Várias fotos juntas", "album", "retratos"],
  ["receita", "Uma receita", "Do jeito da família", "receita", "cozinha"],
  ["musica", "Uma música", "Para lembrar uma época", "musica", "sala-azul"],
  ["video", "Um vídeo", "Um momento com som", "video", "janela-casal"],
];

/**
 * "O que você quer guardar hoje?": atalhos para cada tipo de memória. As fotos só ilustram cada tipo.
 * No celular é uma fileira com rolagem lateral; em telas maiores, grade.
 */
export default function Guardar() {
  // no Tab, o navegador não rola um card que já aparece pela metade: traz o card inteiro para a fileira
  // ("start" coincide com o ponto de encaixe; "nearest" pararia entre dois e o snap voltaria)
  const mostrar = (e) => {
    const grade = e.currentTarget;
    if (grade.scrollWidth <= grade.clientWidth) return;
    e.target.closest("li")?.scrollIntoView({ block: "nearest", inline: "start", behavior: menosMovimento() ? "auto" : "smooth" });
  };

  return (
    <section className="gd" aria-labelledby="gd-titulo">
      <h2 id="gd-titulo" className="c-h2">O que você quer guardar hoje?</h2>
      <ul className="gd-grade" onFocus={mostrar}>
        {TIPOS.map(([tipo, nome, sub, icone, foto]) => (
          <li key={tipo}>
            <Link className={`gd-bt gd-${tipo}`} para={`${ROTAS.guardar}/${tipo}`}>
              <span className="gd-foto-fundo" style={{ backgroundImage: `url(/img/${foto}.jpg)` }} aria-hidden="true" />
              <span className="gd-ic blob"><Icone nome={icone} tam={28} /></span>
              <span className="gd-txt">
                <span className="gd-nome">{nome}</span>
                <span className="gd-sub">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
