import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Pelicula from "./components/Pelicula.jsx";
import ComoFunciona from "./components/ComoFunciona.jsx";
import Numero from "./components/Numero.jsx";
import Comecar from "./components/Comecar.jsx";
import Rodape from "./components/Rodape.jsx";
import Maria from "./components/Maria.jsx";
import Conta from "./components/conta/Conta.jsx";

const caminho = window.location.pathname.replace(/\/$/, "");
const naPaginaDaMaria = caminho === "/maria";
const naConta = caminho === "/conta"; // dentro do produto: conta de teste da Maria, sem login por enquanto

export default function App() {
  if (naConta) return <Conta />;
  return (
    <>
      <Header />
      <main>
        {naPaginaDaMaria ? <Maria /> : (
          <>
            <Hero />
            <Pelicula />
            <ComoFunciona />
            <Numero />
            <Comecar />
          </>
        )}
      </main>
      <Rodape />
    </>
  );
}
