import { useLayoutEffect, useState } from "react";
import "../../conta.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA } from "../../dados/conta.js";
import Icone from "./Icone.jsx";
import Adesivo from "../Adesivo.jsx";
import { lerAjustes, aplicarAjustes, lerPerfil } from "./efeitos.js";

/**
 * Login só visual: ainda não há cadastro nem senha de verdade.
 * Os dois caminhos levam para a conta de demonstração da Maria.
 */
export default function Entrar() {
  const maria = { ...CONTA.pessoa, ...lerPerfil() };
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    aplicarAjustes({ ...lerAjustes(), tema: "claro" }); // a entrada é sempre clara
    document.title = "Entrar · Memória Viva";
    return () => html.classList.remove("pg-conta");
  }, []);

  const entrar = (e) => {
    e?.preventDefault();
    window.location.href = "/conta";
  };

  return (
    <div className="conta entrar">
      <FaixaAzulejos semente="entrar" tamanho={22} girar={false} pares={PARES_URUCUM_ANIL} />

      <div className="en-grade">
        <aside className="en-arte" aria-hidden="true">
          <FaixaAzulejos semente="entrar arte" tamanho={80} girar={false} pares={PARES_URUCUM_ANIL} className="en-azulejos" />
          <div className="en-fotos">
            <div className="foto leg en-f1">
              <span className="tape t-turq" style={{ left: "50%", top: -13, transform: "translateX(-50%) rotate(-3deg)" }} />
              <img src="/img/maria/1957-casamento.jpg" alt="" />
              <span className="lg">o dia do sim</span>
            </div>
            <div className="foto cant en-f2">
              <span className="tape t-uru" style={{ left: "50%", top: -13, transform: "translateX(-50%) rotate(4deg)" }} />
              <img src="/img/maria/2010-cozinha.jpg" alt="" />
            </div>
          </div>
          <p className="en-frase">Sua história, contada por você.</p>
          <Adesivo nome="costela_de_adao_1" className="ad-entrar" />
          <Adesivo nome="cristo_redentor" className="ad-cristo" />
          <Adesivo nome="bandeirinhas" className="ad-entrar-fest" />
        </aside>

        <main className="en-painel">
          <a className="lg-card en-logo" href="/" aria-label="Memória Viva, voltar para o site">
            <img src="/img/logo-h.png" alt="Memória Viva" />
          </a>

          <div className="en-cab">
            <span className="mao en-oi">que bom ter você aqui</span>
            <h1 className="en-titulo">Entrar no Memória Viva</h1>
          </div>

          <section className="en-maria" aria-labelledby="en-maria-t">
            <img src={maria.foto} alt="" />
            <div>
              <h2 id="en-maria-t">{maria.nomeCompleto}</h2>
              <p>Conta de demonstração. Entre sem cadastro e conheça a plataforma.</p>
            </div>
            <button type="button" className="btn btn-p" onClick={entrar}>
              <Icone nome="entrar" />Entrar na conta da Maria
            </button>
          </section>

          <p className="en-ou"><span>ou entre com seu e-mail</span></p>

          <form className="en-form" onSubmit={entrar}>
            <div className="ed-campo">
              <label htmlFor="en-email">E-mail</label>
              <input id="en-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div className="ed-campo">
              <label htmlFor="en-senha">Senha</label>
              <input id="en-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-s"><Icone nome="certo" />Entrar</button>
            <p className="en-nota">Nesta versão de teste o login ainda não está ativo: qualquer e-mail abre a conta da Maria. Ainda não tem conta? <a href="/cadastro">Começar o acervo</a>.</p>
          </form>

          <a className="btn-l en-voltar" href="/"><Icone nome="inicio" />Voltar para o site</a>
        </main>
      </div>
    </div>
  );
}
