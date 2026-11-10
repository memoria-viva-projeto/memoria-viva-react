import { useEffect } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Pelicula from "./components/Pelicula.jsx";
import ComoFunciona from "./components/ComoFunciona.jsx";
import Numero from "./components/Numero.jsx";
import Comecar from "./components/Comecar.jsx";
import Rodape from "./components/Rodape.jsx";
import Conta from "./components/conta/Conta.jsx";
import Entrar from "./components/conta/Entrar.jsx";
import Cadastro from "./components/conta/Cadastro.jsx";

const caminho = window.location.pathname.replace(/\/$/, "");
// dentro do produto: login visual, cadastro só de interface e a conta de teste da Maria
const naConta = caminho === "/conta" || caminho.startsWith("/conta/");
const noLogin = caminho === "/entrar";
const noCadastro = caminho === "/cadastro";

/**
 * Landing no computador: se uma seção ainda passar da altura da tela, o conteúdo dela é reduzido
 * proporcionalmente (zoom) até caber — no máximo até 82%, para continuar legível. No celular, nada muda.
 */
function useEncaixe(ativo) {
  useEffect(() => {
    if (!ativo) return;
    const encaixar = () => {
      const nav = document.querySelector(".top")?.offsetHeight || 0;
      const util = window.innerHeight - nav;
      document.querySelectorAll("main > section.band, main > section.hero").forEach((sec) => {
        const wrap = sec.querySelector(":scope > .wrap");
        if (!wrap) return;
        wrap.style.zoom = "";
        if (window.innerWidth <= 900) return;
        const sobra = sec.offsetHeight - wrap.offsetHeight; // espaço de cima e de baixo (no topo, inclui os azulejos)
        const minimo = sec.classList.contains("hero") ? 0.62 : 0.82;
        const z = Math.min(1, (util - sobra) / wrap.offsetHeight);
        if (z < 1) wrap.style.zoom = String(Math.max(minimo, z).toFixed(3));
      });
    };
    encaixar();
    const t = setTimeout(encaixar, 600); // depois que imagens e fontes chegam
    window.addEventListener("resize", encaixar);
    document.fonts?.ready.then(encaixar);
    return () => { clearTimeout(t); window.removeEventListener("resize", encaixar); };
  }, [ativo]);
}

export default function App() {
  useEncaixe(!noLogin && !noCadastro && !naConta);
  if (noLogin) return <Entrar />;
  if (noCadastro) return <Cadastro />;
  if (naConta) return <Conta />;
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Pelicula />
        <ComoFunciona />
        <Numero />
        <Comecar />
      </main>
      <Rodape />
    </>
  );
}
