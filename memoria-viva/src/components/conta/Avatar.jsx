import { pessoa } from "../../dados/conta.js";
import { useArquivo } from "./midia.jsx";

// Cores de fundo e de letra de cada avatar (contraste de 4,5:1 ou mais).
const CORES = {
  anil: ["var(--anil)", "#FFFDF8"],
  urucum: ["var(--urucum-6)", "#FFFDF8"],
  samambaia: ["var(--samambaia)", "#FFFDF8"],
  azulejo: ["var(--azulejo-6)", "#FFFDF8"],
  turquesa: ["var(--turquesa)", "var(--anil-8)"],
  gema: ["var(--gema)", "var(--anil)"],
  barro: ["var(--barro)", "#FFFDF8"],
  linho: ["var(--linho)", "var(--cafe)"],
};

// Formas orgânicas: cada pessoa ganha um "blob" diferente.
const FORMAS = [
  "58% 42% 55% 45% / 48% 55% 45% 52%",
  "45% 55% 40% 60% / 55% 45% 58% 42%",
  "52% 48% 62% 38% / 42% 58% 46% 54%",
  "40% 60% 52% 48% / 58% 42% 50% 50%",
];
const forma = (id) => FORMAS[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % FORMAS.length];

/** Avatar de uma pessoa (id da família, "maria" ou um nome sem cadastro). forma="quadrada": foto de álbum (árvore). */
export default function Avatar({ id, tam = 48, forma: formato }) {
  const p = pessoa(id);
  const guardada = useArquivo(p.fotoArq, true); // foto de familiar guardada no navegador
  const estilo = { width: tam, height: tam, borderRadius: formato === "quadrada" ? 3 : forma(id), fontSize: Math.round(tam * 0.42) };
  if (guardada) return <img className="av-blob" src={guardada.url} alt="" style={estilo} />;
  if (p.foto) return <img className="av-blob" src={p.foto} alt="" style={estilo} />;
  const [fundo, letra] = CORES[p.cor] || CORES.linho;
  return (
    <span className="av-blob" aria-hidden="true" style={{ ...estilo, background: fundo, color: letra }}>
      {p.nome.charAt(0)}
    </span>
  );
}
