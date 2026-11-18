import { useEffect, useState } from "react";

export default function Header() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`top${rolou ? " sc" : ""}`}>
      <div className="wrap">
        <a className="top-marca" href="/#inicio" aria-label="Memória Viva, início">
          <img src="/marca/logo.svg" width="600" height="307" alt="Memória Viva" />
        </a>
        <nav aria-label="Principal">
          <a className="l" href="/#como">Como funciona</a>
          <a className="l" href="/#comecar">Sua família</a>
          <a className="l" href="/entrar">Entrar</a>
          <a className="btn btn-p btn-sm" href="/cadastro">Começar o acervo</a>
        </nav>
      </div>
    </header>
  );
}
