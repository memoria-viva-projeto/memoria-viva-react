import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Pelicula from "./components/Pelicula.jsx";
import ComoFunciona from "./components/ComoFunciona.jsx";
import Numero from "./components/Numero.jsx";
import Comecar from "./components/Comecar.jsx";
import Rodape from "./components/Rodape.jsx";
import Maria from "./components/Maria.jsx";

const naPaginaDaMaria = window.location.pathname.replace(/\/$/, "") === "/maria";

export default function App() {
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
