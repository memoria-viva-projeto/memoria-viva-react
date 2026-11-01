import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../conta.css";
import "../../guardar.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA } from "../../dados/conta.js";
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
import { TIPOS, listarMemorias } from "./guardados.js";
import Icone from "./Icone.jsx";
import { Navegar, ROTAS } from "./rotas.jsx";
import { PROXIMA_ETAPA, lerAjustes, salvarAjustes, aplicarAjustes, lerPerfil, salvarPerfil, confete } from "./efeitos.js";

// O perfil editado (salvo no navegador) vale para a conta toda, inclusive os avatares de "Você".
Object.assign(CONTA.pessoa, lerPerfil());

const TITULOS = { [ROTAS.inicio]: "Início", [ROTAS.historia]: "Sua história", [ROTAS.perfil]: "Seu perfil", [ROTAS.editar]: "Editar perfil", [ROTAS.guardar]: "Guardar" };
// "/conta/guardar/album" → ["guardar", "album"]; "/conta/memoria/<id>" → ["memoria", id]
const partes = (r) => r.split("/").slice(2);
const titulo = (r) => {
  const [a, b] = partes(r);
  if (a === "guardar" && TIPOS[b]) return `Guardar ${TIPOS[b].um}`;
  if (a === "memoria") return "Memória";
  return TITULOS[r] || TITULOS[ROTAS.inicio];
};
const rotaAtual = () => {
  const r = window.location.pathname.replace(/\/$/, "");
  return r.startsWith(`${ROTAS.inicio}/`) ? r : ROTAS.inicio;
};

/** Conta da Maria (a visão dela): navegação, telas e ajustes. */
export default function Conta() {
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
  const [bancoOk, setBancoOk] = useState(true);
  const [aviso, setAviso] = useState(null);
  const [anuncio, setAnuncio] = useState("");

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    return () => html.classList.remove("pg-conta");
  }, []);

  useLayoutEffect(() => { aplicarAjustes(ajustes); salvarAjustes(ajustes); }, [ajustes]);

  useEffect(() => {
    listarMemorias()
      .then((ms) => setGuardadas(ms.sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))))
      .catch(() => setBancoOk(false))
      .finally(() => setCarregou(true));
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
      alvo.querySelector(".selo")?.focus({ preventScroll: true });
      return;
    }
    if (primeira.current) { primeira.current = false; return; }
    window.scrollTo(0, 0);
    document.querySelector(".c-pagina h1")?.focus({ preventScroll: true });
  }, [rota, visita]);

  const ir = (para) => {
    setAviso(null);
    const caminho = para.split(/[?#]/)[0];
    if (para !== rota) window.history.pushState({ de: rota }, "", para);
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

  // Confirmar vale igual no cartão e em "Esperando você": muda o selo, solta confete e sai da lista.
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

  const [secao, sub] = partes(rota);
  let tela;
  if (rota === ROTAS.guardar) tela = <GuardarInicio bancoOk={bancoOk} />;
  else if (secao === "guardar" && TIPOS[sub]) {
    tela = <Editor tipo={sub} editarId={new URLSearchParams(window.location.search).get("editar")} guardadas={guardadas} carregou={carregou} onGuardada={guardada} onAviso={avisar} />;
  } else if (secao === "memoria" && sub) tela = <Memoria id={sub} guardadas={guardadas} carregou={carregou} onApagada={apagada} />;
  else if (rota === ROTAS.perfil) tela = <Perfil perfil={perfil} memorias={memorias} onAviso={avisar} onAbrirAjustes={() => setAjustesAberto(true)} />;
  else if (rota === ROTAS.editar) tela = <EditarPerfil perfil={perfil} onGuardar={guardarPerfil} onSair={sairDaEdicao} />;
  else if (rota === ROTAS.historia) tela = <Historia memorias={memorias} guardadas={guardadas} onConfirmar={confirmar} onMudarMemoria={mudarMemoria} onAviso={avisar} />;
  else tela = <Inicio memorias={memorias} guardadas={guardadas} perfil={perfil} onConfirmar={confirmar} onVer={ver} onAviso={avisar} />;

  return (
    <Navegar.Provider value={ir}>
      <div className="conta">
        <FaixaAzulejos semente="conta da maria" tamanho={22} girar={false} pares={PARES_URUCUM_ANIL} />
        <a className="c-pular" href="#conteudo">Ir para o conteúdo</a>

        <div className="c-casca">
          <Navegacao rota={rota} perfil={perfil} onAviso={avisar} onAbrirAjuda={() => setAjudaAberta(true)} onAbrirAjustes={() => setAjustesAberto(true)} />

          <div className="c-pagina">
            <main id="conteudo" key={`${rota}-${visita}`}>{tela}</main>
            <footer className="c-rodape">
              <p>Conta de demonstração · as pessoas e histórias são fictícias.</p>
            </footer>
          </div>
        </div>

        <p className="sr" aria-live="polite">{anuncio}</p>

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
