import { useLayoutEffect, useRef, useState } from "react";
import "../../conta.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA } from "../../dados/conta.js";
import { api } from "../../api.js";
import Icone from "./Icone.jsx";
import Adesivo from "../Adesivo.jsx";
import { lerAjustes, aplicarAjustes, lerPerfil } from "./efeitos.js";

/**
 * Dois caminhos: a conta de demonstração da Maria (sem login) ou e-mail e senha de verdade,
 * conferidos pelo servidor. A senha fica só na memória da página.
 */
// veio de uma sessão que acabou? (api.js manda para cá com ?sessao=encerrada&voltar=/conta/...)
function lerRetorno() {
  const q = new URLSearchParams(window.location.search);
  const voltar = q.get("voltar") || "";
  // só volta para dentro da conta (nunca para outro site)
  const destino = /^\/conta(\/|$|\?)/.test(voltar) ? voltar : "/conta";
  return { encerrada: q.get("sessao") === "encerrada", destino };
}

export default function Entrar() {
  const [retorno] = useState(lerRetorno);
  const maria = { ...CONTA.pessoa, ...lerPerfil() };
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const caixaErro = useRef(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    aplicarAjustes({ ...lerAjustes(), tema: "claro" }); // a entrada é sempre clara
    document.title = "Entrar · Memória Viva";
    return () => html.classList.remove("pg-conta");
  }, []);

  // a demonstração é sem login: se alguém estava logado neste navegador, sai antes, para as contas não se misturarem
  const abrirMaria = () => {
    api("/auth/sair", { metodo: "POST" }).catch(() => {}).finally(() => { window.location.href = "/conta"; });
  };

  const entrar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!email.trim() || !senha) return mostrarErro("Escreva seu e-mail e sua senha.");
    setEnviando(true);
    setErro("");
    try {
      await api("/auth/entrar", { corpo: { email, senha } });
      setSenha("");
      window.location.href = retorno.destino;
    } catch (falha) {
      setEnviando(false);
      mostrarErro(Object.values(falha.campos || {})[0] || falha.message);
    }
  };

  const mostrarErro = (texto) => {
    setErro(texto);
    requestAnimationFrame(() => caixaErro.current?.focus());
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

          {retorno.encerrada && (
            <p className="cd-aviso" role="status">
              <Icone nome="ajuda" />
              <span>Sua sessão terminou. Entre de novo com seu e-mail e sua senha para continuar de onde parou.</span>
            </p>
          )}

          <section className="en-maria" aria-labelledby="en-maria-t">
            <img src={maria.foto} alt="" />
            <div>
              <h2 id="en-maria-t">{maria.nomeCompleto}</h2>
              <p>Conta de demonstração. Entre sem cadastro e conheça a plataforma.</p>
            </div>
            <button type="button" className="btn btn-p" onClick={abrirMaria}>
              <Icone nome="entrar" />Entrar na conta da Maria
            </button>
          </section>

          <p className="en-ou"><span>ou entre com seu e-mail</span></p>

          <form className="en-form" onSubmit={entrar} noValidate aria-busy={enviando || undefined}>
            <div className="ed-campo">
              <label htmlFor="en-email">E-mail</label>
              <input id="en-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div className="ed-campo">
              <label htmlFor="en-senha">Senha</label>
              <input id="en-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            {erro && <p className="ed-erro" role="alert" tabIndex={-1} ref={caixaErro}>{erro}</p>}
            <button type="submit" className="btn btn-s" disabled={enviando}><Icone nome="certo" />{enviando ? "Entrando…" : "Entrar"}</button>
            <p className="en-nota">Ainda não tem conta? <a href="/cadastro">Começar o acervo</a>.</p>
          </form>

          <a className="btn-l en-voltar" href="/"><Icone nome="inicio" />Voltar para o site</a>
        </main>
      </div>
    </div>
  );
}
