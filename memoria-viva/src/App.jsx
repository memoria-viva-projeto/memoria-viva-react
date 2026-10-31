import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Pelicula from "./components/Pelicula.jsx";
import ComoFunciona from "./components/ComoFunciona.jsx";
import Numero from "./components/Numero.jsx";
import Comecar from "./components/Comecar.jsx";
import Rodape from "./components/Rodape.jsx";
import Conta from "./components/conta/Conta.jsx";
import Entrar from "./components/conta/Entrar.jsx";

const caminho = window.location.pathname.replace(/\/$/, "");
// dentro do produto: login visual e a conta de teste da Maria (sem cadastro por enquanto)
const naConta = caminho === "/conta" || caminho.startsWith("/conta/");
const noLogin = caminho === "/entrar";

export default function App() {
  if (noLogin) return <Entrar />;
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
