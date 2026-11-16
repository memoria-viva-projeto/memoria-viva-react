import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../conta.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import PainelFamilia from "../PainelFamilia.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import Icone from "./Icone.jsx";
import { lerAjustes, aplicarAjustes } from "./efeitos.js";

/**
 * Cadastro só de interface: valida os campos, mas não cria conta nem envia nada.
 * A senha fica apenas na memória da página (nunca na URL nem no navegador).
 */
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGRAS_SENHA = [
  { id: "tam", texto: "pelo menos 8 caracteres", ok: (s) => s.length >= 8 },
  { id: "letra", texto: "pelo menos uma letra", ok: (s) => /\p{L}/u.test(s) },
  { id: "num", texto: "pelo menos um número", ok: (s) => /\d/.test(s) },
];
const ORDEM = ["nome", "email", "senha", "familia"];

function conferir(v) {
  const e = {};
  if (!v.nome.trim()) e.nome = "Escreva seu nome.";
  if (!v.email.trim()) e.email = "Escreva seu e-mail.";
  else if (!EMAIL_OK.test(v.email.trim())) e.email = "Confira o e-mail: falta o @ ou o domínio (ex.: voce@email.com).";
  const faltam = REGRAS_SENHA.filter((r) => !r.ok(v.senha)).map((r) => r.texto);
  if (!v.senha) e.senha = "Crie uma senha.";
  else if (faltam.length) e.senha = `A senha precisa de ${faltam.join(" e ")}.`;
  if (!v.familia.trim()) e.familia = "Dê um nome para o acervo da família.";
  return e;
}

// família e e-mail podem chegar do formulário da página inicial
function valoresIniciais() {
  const q = new URLSearchParams(window.location.search);
  return { nome: "", email: q.get("email") || "", senha: "", familia: (q.get("familia") || "").slice(0, 40) };
}

export default function Cadastro() {
  const [v, setV] = useState(valoresIniciais);
  const [painel, setPainel] = useState(v.familia.trim() || "Sua família");
  const [enviou, setEnviou] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [pronto, setPronto] = useState(null); // nome de quem passou na conferência
  const campos = useRef({});
  const tituloPronto = useRef(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    aplicarAjustes({ ...lerAjustes(), tema: "claro" }); // como a entrada, sempre claro
    document.title = "Criar acervo · Memória Viva";
    // tira o e-mail da barra de endereço e do histórico
    if (window.location.search) window.history.replaceState(null, "", "/cadastro");
    return () => html.classList.remove("pg-conta");
  }, []);

  // espera a pessoa parar de digitar para remontar o painel
  useEffect(() => {
    const t = setTimeout(() => setPainel(v.familia.trim() || "Sua família"), 260);
    return () => clearTimeout(t);
  }, [v.familia]);

  useEffect(() => { if (pronto) tituloPronto.current?.focus(); }, [pronto]);

  const erros = enviou ? conferir(v) : {};
  const mudar = (campo) => (e) => setV((a) => ({ ...a, [campo]: e.target.value }));

  const enviar = (e) => {
    e.preventDefault();
    setEnviou(true);
    const achados = conferir(v);
    const primeiro = ORDEM.find((c) => achados[c]);
    if (primeiro) return campos.current[primeiro]?.focus();
    // protótipo: nada é enviado; a senha é descartada aqui
    setV((a) => ({ ...a, senha: "" }));
    setVerSenha(false);
    setPronto(v.nome.trim());
  };

  const revisar = () => {
    setPronto(null);
    setEnviou(false);
    requestAnimationFrame(() => campos.current.nome?.focus());
  };

  // liga o input à dica e ao erro dele
  const ligar = (campo, ...extra) => ({
    id: `cd-${campo}`,
    ref: (el) => (campos.current[campo] = el),
    value: v[campo],
    onChange: mudar(campo),
    "aria-invalid": erros[campo] ? "true" : undefined,
    "aria-describedby": [...extra, erros[campo] && `cd-${campo}-erro`].filter(Boolean).join(" ") || undefined,
  });
  const erro = (campo) => erros[campo] && <p className="ed-erro" id={`cd-${campo}-erro`}>{erros[campo]}</p>;

  return (
    <div className="conta entrar cadastro">
      <FaixaAzulejos semente={painel} tamanho={36} girar={false} />

      <div className="en-grade">
        <aside className="en-arte cd-arte" aria-hidden="true">
          <FaixaAzulejos semente="cadastro arte" tamanho={80} girar={false} pares={PARES_URUCUM_ANIL} className="en-azulejos" />
          <div className="painel-wrap cd-capa">
            <PainelFamilia nome={painel} />
            <span className="tape t-papel" style={{ left: -18, top: 18, transform: "rotate(-40deg)" }} />
            <span className="tape t-papel" style={{ right: -18, bottom: 18, transform: "rotate(-40deg)" }} />
            <span className="painel-nome mao">{v.familia.trim() || "Sua família"}</span>
          </div>
          <p className="en-frase">Toda família tem um azulejo.</p>
        </aside>

        <main className="en-painel">
          <a className="lg-card en-logo" href="/" aria-label="Memória Viva, voltar para o site">
            <img src="/img/logo-h.png" alt="Memória Viva" />
          </a>

          {pronto === null ? (
            <>
              <div className="en-cab">
                <span className="mao en-oi">vamos começar?</span>
                <h1 className="en-titulo">Sua história de família começa aqui</h1>
              </div>

              <p className="cd-aviso">
                <Icone nome="ajuda" />
                <span><b>Versão de teste.</b> Nenhuma conta é criada de verdade e a senha não é enviada nem guardada.</span>
              </p>

              <form className="en-form cd-form" onSubmit={enviar} noValidate>
                <div className="ed-campo">
                  <label htmlFor="cd-nome">Seu nome</label>
                  <input type="text" autoComplete="name" required {...ligar("nome")} />
                  {erro("nome")}
                </div>

                <div className="ed-campo">
                  <label htmlFor="cd-email">E-mail</label>
                  <input type="email" autoComplete="email" inputMode="email" spellCheck={false} required placeholder="voce@email.com" {...ligar("email")} />
                  {erro("email")}
                </div>

                <div className="ed-campo">
                  <label htmlFor="cd-senha">Senha</label>
                  <div className="cd-senha">
                    <input type={verSenha ? "text" : "password"} autoComplete="new-password" required {...ligar("senha", "cd-senha-regras")} />
                    <button type="button" className="btn btn-s btn-sm" aria-controls="cd-senha" onClick={() => setVerSenha((x) => !x)}>
                      <Icone nome="ver" tam={20} />{verSenha ? "Ocultar senha" : "Mostrar senha"}
                    </button>
                  </div>
                  <div id="cd-senha-regras" className="cd-regras">
                    <p className="ed-dica">A senha precisa ter:</p>
                    <ul>
                      {REGRAS_SENHA.map((r) => {
                        const ok = r.ok(v.senha);
                        return (
                          <li key={r.id} className={ok ? "ok" : undefined}>
                            {ok ? <Icone nome="certo" tam={18} /> : <span className="cd-ponto" />}
                            {r.texto}{ok && <span className="sr"> (feito)</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {erro("senha")}
                </div>

                <div className="ed-campo">
                  <label htmlFor="cd-familia">Nome da família</label>
                  <input type="text" autoComplete="off" maxLength={40} required placeholder="Ex.: Família de Helena" {...ligar("familia", "cd-familia-dica")} />
                  <p className="ed-dica" id="cd-familia-dica">Esse nome desenha os azulejos da capa do seu acervo.</p>
                  {erro("familia")}
                </div>

                <button type="submit" className="btn btn-p"><Icone nome="certo" />Criar meu acervo</button>
              </form>

              <p className="cd-ja">Já tenho uma conta — <a className="btn-l" href="/entrar">Entrar</a></p>
            </>
          ) : (
            <section className="cd-pronto" aria-labelledby="cd-pronto-t">
              <span className="mao en-oi">tudo certo</span>
              <h1 className="en-titulo" id="cd-pronto-t" tabIndex={-1} ref={tituloPronto}>Seus dados estão prontos, {pronto}!</h1>
              <p>
                Como esta é uma versão de teste, <b>nenhuma conta foi criada</b> e a senha já foi descartada.
                Enquanto o cadastro de verdade não chega, você pode conhecer o Memória Viva pela conta de demonstração da Maria.
              </p>
              <a className="btn btn-p" href="/conta"><Icone nome="entrar" />Conhecer a conta de teste</a>
              <button type="button" className="btn-l" onClick={revisar}><Icone nome="voltar" />Voltar e revisar os dados</button>
            </section>
          )}

          <a className="btn-l en-voltar" href="/"><Icone nome="inicio" />Voltar para o site</a>
        </main>
      </div>
    </div>
  );
}
