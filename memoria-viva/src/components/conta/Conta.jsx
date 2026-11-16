import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../conta.css";
import "../../guardar.css";
import "../../familia.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA, usarContaReal } from "../../dados/conta.js";
import { api } from "../../api.js";
import Navegacao from "./Navegacao.jsx";
import Inicio from "./Inicio.jsx";
import Historia from "./Historia.jsx";
import Perfil from "./Perfil.jsx";
import EditarPerfil from "./EditarPerfil.jsx";
import Ajustes from "./Ajustes.jsx";
import Ajuda from "./Ajuda.jsx";
import GuardarInicio from "./GuardarInicio.jsx";
import Editor from "./Editor.jsx";
import Memoria from "./Memoria.jsx";
import Conversar from "./Conversar.jsx";
import { TIPOS, listarMemorias } from "./guardados.js";
import { carregarDoServidor } from "./memoriasServidor.js";
import { ArvorePagina, FamiliaInicio, Familiar } from "./Familia.jsx";
import CadastroFamiliar from "./CadastroFamiliar.jsx";
import { aplicarNaConta, carregarFamilia, salvarFamilia } from "./familia.js";
import Icone from "./Icone.jsx";
import { Navegar, ROTAS } from "./rotas.jsx";
import { PROXIMA_ETAPA, lerAjustes, salvarAjustes, aplicarAjustes, lerPerfil, salvarPerfil, confete } from "./efeitos.js";

// O perfil editado (salvo no navegador) vale para a conta toda, inclusive os avatares de "Você".
Object.assign(CONTA.pessoa, lerPerfil());

const TITULOS = { [ROTAS.inicio]: "Início", [ROTAS.historia]: "Sua história", [ROTAS.perfil]: "Seu perfil", [ROTAS.editar]: "Editar perfil", [ROTAS.guardar]: "Guardar", [ROTAS.conversar]: "Conversar" };
// "/conta/guardar/album" → ["guardar", "album"]; "/conta/memoria/<id>" → ["memoria", id]
const partes = (r) => r.split("/").slice(2);
const titulo = (r) => {
  const [a, b] = partes(r);
  if (a === "guardar" && TIPOS[b]) return `Guardar ${TIPOS[b].um}`;
  if (a === "memoria") return "Memória";
  if (a === "familia") return b === "arvore" ? "Árvore da família" : b === "novo" ? "Novo familiar" : "Família";
  return TITULOS[r] || TITULOS[ROTAS.inicio];
};
const rotaAtual = () => {
  const r = window.location.pathname.replace(/\/$/, "");
  return r.startsWith(`${ROTAS.inicio}/`) ? r : ROTAS.inicio;
};

/**
 * Pergunta ao servidor quem está logado antes de abrir a conta.
 * Com login: a conta da pessoa. Sem login (401): a demonstração da Maria, como antes.
 * Servidor fora do ar: uma tela própria (nunca a da Maria, que confundiria quem tem conta).
 */
export default function Conta() {
  const [real, setReal] = useState(null); // null = ainda perguntando
  const [indisponivel, setIndisponivel] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let vale = true;
    setIndisponivel(false);
    api("/auth/sessao")
      .then(({ usuario, familias }) => {
        if (!vale) return;
        usarContaReal(usuario, familias);
        Object.assign(CONTA.pessoa, lerPerfil()); // o perfil que ESTA conta editou neste navegador
        setReal(true);
      })
      .catch((falha) => {
        if (!vale) return;
        if (falha.status === 401) setReal(false); // sem login
        else setIndisponivel(true); // sem conexão ou erro do servidor
      });
    return () => { vale = false; };
  }, [tentativa]);

  if (indisponivel) return <ContaIndisponivel onTentar={() => setTentativa((n) => n + 1)} />;
  if (real === null) return <div className="conta"><p className="c-wrap" role="status">Abrindo sua conta…</p></div>;
  return <ContaAberta real={real} />;
}

/** O servidor não respondeu: diz o que houve e deixa tentar de novo (mesmo visual da entrada). */
function ContaIndisponivel({ onTentar }) {
  const titulo = useRef(null);
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    aplicarAjustes({ ...lerAjustes(), tema: "claro" });
    document.title = "Sem conexão · Memória Viva";
    titulo.current?.focus();
    return () => html.classList.remove("pg-conta");
  }, []);
  return (
    <div className="conta entrar">
      <FaixaAzulejos semente="sem conexao" tamanho={22} girar={false} pares={PARES_URUCUM_ANIL} />
      <div className="en-grade">
        <aside className="en-arte" aria-hidden="true">
          <FaixaAzulejos semente="sem conexao arte" tamanho={80} girar={false} pares={PARES_URUCUM_ANIL} className="en-azulejos" />
          <p className="en-frase">Suas memórias continuam guardadas.</p>
        </aside>
        <main className="en-painel">
          <a className="lg-card en-logo" href="/" aria-label="Memória Viva, voltar para o site">
            <img src="/img/logo-h.png" alt="Memória Viva" />
          </a>
          <section className="cd-pronto" aria-labelledby="ci-titulo">
            <span className="mao en-oi">um instante</span>
            <h1 className="en-titulo" id="ci-titulo" tabIndex={-1} ref={titulo}>Não conseguimos abrir sua conta agora</h1>
            <p>O Memória Viva não respondeu. Nada foi perdido: suas memórias continuam guardadas. Confira sua internet e tente de novo em instantes.</p>
            <button type="button" className="btn btn-p" onClick={onTentar}><Icone nome="trocar" />Tentar de novo</button>
          </section>
          <a className="btn-l en-voltar" href="/"><Icone nome="inicio" />Voltar para o site</a>
        </main>
      </div>
    </div>
  );
}

/** A conta aberta (da pessoa logada ou a demonstração da Maria): navegação, telas e ajustes. */
function ContaAberta({ real }) {
  const [rota, setRota] = useState(rotaAtual);
  const [visita, setVisita] = useState(0);
  const [ajustes, setAjustes] = useState(lerAjustes);
  const [ajustesAberto, setAjustesAberto] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [perfil, setPerfil] = useState(() => ({ ...CONTA.pessoa }));
  const [memorias, setMemorias] = useState(CONTA.memorias);
  // memórias guardadas pela pessoa (no navegador), da mais nova para a mais antiga
  const [guardadas, setGuardadas] = useState([]);
  const [carregou, setCarregou] = useState(false);
  const [falhaServidor, setFalhaServidor] = useState(false); // não deu para trazer as memórias do servidor
  const [bancoOk, setBancoOk] = useState(true);
  // a família da pessoa (área Família); a mesma lista vale para marcar pessoas nas memórias
  const [familia, setFamilia] = useState(null);
  const [bloqueado, setBloqueado] = useState(false); // outra aba antiga segura o banco
  const [demorou, setDemorou] = useState(false);
  useEffect(() => {
    if (familia) return;
    const t = setTimeout(() => setDemorou(true), 5000);
    return () => clearTimeout(t);
  }, [familia]);

  useEffect(() => {
    const preso = () => setBloqueado(true);
    const livre = () => setBloqueado(false);
    window.addEventListener("mv-banco-bloqueado", preso);
    window.addEventListener("mv-banco-livre", livre);
    return () => { window.removeEventListener("mv-banco-bloqueado", preso); window.removeEventListener("mv-banco-livre", livre); };
  }, []);
  const [aviso, setAviso] = useState(null);
  const [anuncio, setAnuncio] = useState("");

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    return () => html.classList.remove("pg-conta");
  }, []);

  useLayoutEffect(() => { aplicarAjustes(ajustes); salvarAjustes(ajustes); }, [ajustes]);

  useEffect(() => {
    // as do navegador (todas, na demonstração; foto, álbum e vídeo, na conta com login) + as do servidor
    const doServidor = real
      ? carregarDoServidor().catch(() => {
        setFalhaServidor(true);
        avisar("Não deu para trazer suas receitas e músicas agora. Confira a internet e abra a página de novo.");
        return [];
      })
      : Promise.resolve([]);
    Promise.all([listarMemorias().catch(() => { setBancoOk(false); return []; }), doServidor])
      .then(([daqui, dela]) => setGuardadas([...daqui, ...dela].sort((a, b) => String(b.criadaEm).localeCompare(String(a.criadaEm)))))
      .finally(() => setCarregou(true));
    carregarFamilia()
      .then((f) => {
        aplicarNaConta(f);
        setFamilia(f);
        if (f.naoSalva) avisar("Este navegador não está deixando guardar a família agora. Dá para ver, mas as mudanças podem não ficar salvas.");
      })
      .catch(() => setFamilia({ pessoas: [], lacos: [] }));
  }, []);

  // voltar/avançar do navegador
  useEffect(() => {
    const voltar = () => setRota(rotaAtual());
    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, []);

  // a cada tela nova: título da aba, topo da página e foco no título (para quem usa leitor de tela)
  const primeira = useRef(true);
  useEffect(() => {
    document.title = `${titulo(rota)} · Memória Viva`;
    const alvo = window.location.hash && document.getElementById(window.location.hash.slice(1));
    if (alvo) {
      alvo.scrollIntoView({ block: "start" });
      // cartão sem selo (ainda esperando confirmação): foco no título
      (alvo.querySelector(".selo") || alvo.querySelector(".cm-titulo"))?.focus({ preventScroll: true });
      return;
    }
    if (primeira.current) { primeira.current = false; return; }
    window.scrollTo(0, 0);
    document.querySelector(".c-pagina h1")?.focus({ preventScroll: true });
  }, [rota, visita]);

  const ir = (para) => {
    setAviso(null);
    const caminho = para.split(/[?#]/)[0];
    // compara com o endereço inteiro: "?sobre=" ou "#mem-" diferentes também entram no histórico
    const aqui = window.location.pathname + window.location.search + window.location.hash;
    if (para !== aqui) window.history.pushState({ de: rota }, "", para);
    setRota(caminho);
    if (caminho === rota) setVisita((v) => v + 1); // mesma tela com outro "?passo=" ou "#mem-": recomeça nela
  };

  // Sair da edição: se veio do perfil, volta no histórico (o "Voltar" do navegador não repete o perfil)
  const sairDaEdicao = () => {
    if (window.history.state?.de === ROTAS.perfil) window.history.back();
    else { window.history.replaceState(null, "", ROTAS.perfil); setRota(ROTAS.perfil); }
  };

  const avisar = (texto = PROXIMA_ETAPA) => setAviso({ texto, n: Date.now() });

  const mudarMemoria = (id) => (fn) => setMemorias((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));

  // Confirmar no cartão da história: muda o selo, solta confete e sai de "Esperando você".
  const confirmar = (id, origem) => {
    confete(origem);
    setMemorias((ms) => ms.map((m) => (m.id === id ? { ...m, status: "confirmada" } : m)));
    const m = memorias.find((x) => x.id === id);
    setAnuncio(`Pronto. “${m.titulo}” agora está confirmada por você.`);
  };

  // "Ver" uma lembrança: abre a história completa já nela
  const ver = (id) => ir(`${ROTAS.historia}#mem-${id}`);

  // a edição guarda a cada etapa: dá para parar no meio e continuar depois
  const guardarPerfil = (novo) => {
    if (!salvarPerfil(novo)) return false;
    Object.assign(CONTA.pessoa, novo);
    setPerfil({ ...CONTA.pessoa });
    return true;
  };

  const guardada = (m) => setGuardadas((gs) => [m, ...gs.filter((g) => g.id !== m.id)]);
  const apagada = (id) => {
    setGuardadas((gs) => gs.filter((g) => g.id !== id));
    window.history.replaceState(null, "", ROTAS.historia);
    setRota(ROTAS.historia);
    setAnuncio("A memória foi apagada.");
  };

  // mudar a família: vale na hora em toda a conta e fica guardada no navegador
  const mudarFamilia = (f, msg) => {
    aplicarNaConta(f);
    setFamilia(f);
    salvarFamilia(f).then(() => msg && avisar(msg)).catch(() => avisar("Não deu para guardar neste aparelho. O espaço pode ter acabado."));
  };

  // encerra a sessão no servidor e volta para a entrada (mesmo sem resposta, sai da conta na tela)
  const sair = () => api("/auth/sair", { metodo: "POST" }).catch(() => {}).finally(() => { window.location.href = "/entrar"; });

  const [secao, sub, acao] = partes(rota);
  let tela;
  if (rota === ROTAS.guardar) tela = <GuardarInicio bancoOk={bancoOk} />;
  else if (secao === "guardar" && TIPOS[sub]) {
    tela = <Editor tipo={sub} editarId={new URLSearchParams(window.location.search).get("editar")} guardadas={guardadas} carregou={carregou} onGuardada={guardada} onAviso={avisar} />;
  } else if (secao === "familia" && !familia) {
    tela = (
      <div className="c-wrap fm">
        <h1 className="fm-titulo" tabIndex={-1}>Família</h1>
        {demorou ? (
          <div className="fm-demora" role="alert">
            <p>A família está demorando para abrir. Pode ser outra aba do Memória Viva aberta com uma versão antiga.</p>
            <p>Feche as outras abas do Memória Viva e toque em “Tentar de novo”.</p>
            <button type="button" className="btn btn-p" onClick={() => window.location.reload()}><Icone nome="trocar" />Tentar de novo</button>
          </div>
        ) : <p role="status">Abrindo…</p>}
      </div>
    );
  }
  else if (secao === "familia" && !sub) tela = <FamiliaInicio f={familia} />;
  else if (secao === "familia" && sub === "arvore") tela = <ArvorePagina f={familia} />;
  else if (secao === "familia" && (sub === "novo" || acao === "editar")) {
    tela = <CadastroFamiliar f={familia} id={sub === "novo" ? null : sub} onSair={() => window.history.back()}
      onSalvar={(f, msg, id) => { mudarFamilia(f); ir(`${ROTAS.familia}/${id}`); avisar(msg); }} />;
  } else if (secao === "familia") tela = <Familiar f={familia} id={sub} guardadas={guardadas} memorias={memorias} onMudar={mudarFamilia} ir={ir} />;
  else if (secao === "memoria" && sub) tela = <Memoria id={sub} guardadas={guardadas} carregou={carregou} falhaServidor={falhaServidor} onApagada={apagada} onAviso={avisar} />;
  else if (rota === ROTAS.conversar) tela = <Conversar memorias={memorias} guardadas={guardadas} carregou={carregou} perfil={perfil} />;
  else if (rota === ROTAS.perfil) tela = <Perfil perfil={perfil} familia={familia} memorias={memorias} onAviso={avisar} onAbrirAjustes={() => setAjustesAberto(true)} onSair={real ? sair : undefined} />;
  else if (rota === ROTAS.editar) tela = <EditarPerfil perfil={perfil} onGuardar={guardarPerfil} onSair={sairDaEdicao} />;
  else if (rota === ROTAS.historia) tela = <Historia memorias={memorias} guardadas={guardadas} onConfirmar={confirmar} onMudarMemoria={mudarMemoria} onAviso={avisar} />;
  else tela = <Inicio memorias={memorias} guardadas={guardadas} perfil={perfil} onVer={ver} onAviso={avisar} />;

  return (
    <Navegar.Provider value={ir}>
      <div className="conta">
        <FaixaAzulejos semente="conta da maria" tamanho={22} girar={false} pares={PARES_URUCUM_ANIL} />
        <a className="c-pular" href="#conteudo">Ir para o conteúdo</a>

        <div className="c-casca">
          <Navegacao rota={rota} perfil={perfil} onAviso={avisar} onAbrirAjuda={() => setAjudaAberta(true)} onAbrirAjustes={() => setAjustesAberto(true)} onSair={real ? sair : undefined} />

          <div className="c-pagina">
            <main id="conteudo" key={`${rota}-${visita}`}>{tela}</main>
            {!real && (
              <footer className="c-rodape">
                <p>Conta de demonstração · as pessoas e histórias são fictícias.</p>
              </footer>
            )}
          </div>
        </div>

        <p className="sr" aria-live="polite">{anuncio}</p>

        {bloqueado && (
          <div className="c-aviso" role="alert">
            <Icone nome="conselho" />
            <p>O Memória Viva está aberto em outra aba, numa versão antiga. Feche as outras abas do Memória Viva; esta continua sozinha.</p>
          </div>
        )}

        {aviso && (
          <div className="c-aviso" role="status" key={aviso.n}>
            <Icone nome="conselho" />
            <p>{aviso.texto}</p>
            <button type="button" className="btn btn-s btn-sm" onClick={() => setAviso(null)}>
              <Icone nome="certo" />Entendi
            </button>
          </div>
        )}

        <Ajuda aberto={ajudaAberta} onFechar={() => setAjudaAberta(false)} onAbrirAjustes={() => setAjustesAberto(true)} onAviso={avisar} />
        <Ajustes aberto={ajustesAberto} onFechar={() => setAjustesAberto(false)} ajustes={ajustes} onMudar={setAjustes} />
      </div>
    </Navegar.Provider>
  );
}
