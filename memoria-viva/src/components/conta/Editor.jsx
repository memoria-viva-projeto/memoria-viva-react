import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { erroData } from "./campos.jsx";
import { pessoasDe, sugestoesPessoas } from "./pessoas.jsx";
import { pendentes, useArquivos } from "./arquivos.jsx";
import { PASSOS_ALBUM, PASSOS_FOTO, VitrineFotos } from "./EditorFotos.jsx";
import { FolhaLida, PASSOS_RECEITA, listaDeIngredientes, receitaTemAlgo } from "./EditorReceita.jsx";
import { PASSOS_MUSICA, VitrineMusica, temMusica } from "./EditorMusica.jsx";
import { PASSOS_VIDEO, VitrineVideo, temVideo } from "./EditorVideo.jsx";
import { Navegar, ROTAS } from "./rotas.jsx";
import { confete } from "./efeitos.js";
import { pessoa } from "../../dados/conta.js";
import {
  TIPOS, apagarRascunho, lerRascunho, limparArquivos, novaChave, novaMemoria, pedirPermanencia, resumo,
  salvarMemoria, salvarRascunho, textoQuando, tituloDe,
} from "./guardados.js";

const PASSOS = { foto: PASSOS_FOTO, album: PASSOS_ALBUM, musica: PASSOS_MUSICA, receita: PASSOS_RECEITA, video: PASSOS_VIDEO };
const VITRINES = { foto: VitrineFotos, album: VitrineFotos, musica: VitrineMusica, video: VitrineVideo };
const FINAL = { id: "pronto", titulo: "Pronto para guardar?" };

/** O mínimo para guardar: o conteúdo em si. Título e história podem vir depois. */
function falta(m) {
  if (m.tipo === "foto" && !m.itens.some((it) => it.tipo === "foto")) return ["foto", "Escolha a foto primeiro."];
  if (m.tipo === "album" && !m.itens.length) return ["fotos", "Escolha as fotos primeiro."];
  if (m.tipo === "video" && !temVideo(m)) return ["video", "Escolha o vídeo primeiro."];
  if (m.tipo === "musica" && !temMusica(m)) return ["musica", m.extra.semLink ? "Escreva o nome da música." : "Escolha a música primeiro."];
  if (m.tipo === "receita" && !receitaTemAlgo(m)) return ["nome", "Escreva pelo menos o nome da receita."];
  if (erroData(m.data)) return ["historia", erroData(m.data)];
  return null;
}

/** O que ainda dá para contar depois (sem cobrar: é só um lembrete). */
function paraDepois(m) {
  const f = [];
  if (!m.titulo.trim() && m.tipo !== "musica") f.push("um nome");
  if (!m.descricao && !m.extra.porque && !m.extra.lembranca) f.push("a história");
  if (!textoQuando(m)) f.push("quando foi");
  if (!pessoasDe(m).length && m.tipo !== "receita") f.push("quem aparece");
  return f;
}

/** Última etapa: como a memória vai aparecer na história, e o botão de guardar. */
function Pronto({ m, onGuardar, guardando, onEditar }) {
  const Vitrine = VITRINES[m.tipo];
  const pessoas = pessoasDe(m);
  const meta = [textoQuando(m), m.lugar].filter(Boolean).join(" · ");
  const depois = paraDepois(m);
  const fotos = m.itens.filter((it) => it.tipo === "foto" && !it.anexo);
  return (
    <div className={`pv${m.tipo === "receita" ? " pv-receita" : ""}`}>
      <div className="pv-midia">{m.tipo === "receita" ? <FolhaLida m={m} /> : <Vitrine m={m} />}</div>
      <div className="pv-txt">
        <span className="mv-tipo"><Icone nome={TIPOS[m.tipo].icone} tam={20} />{resumo(m)}</span>
        <p className="pv-titulo">{tituloDe(m)}</p>
        {meta && <p className="mv-meta">{meta}</p>}
        {m.descricao && m.tipo !== "receita" && <p className="pv-desc">{m.descricao}</p>}
        {pessoas.length > 0 && <p className="pv-pessoas"><Icone nome="marcar" tam={18} />Com {pessoas.map((p) => pessoa(p).nome).join(", ")}</p>}
        {m.tipo === "album" && <p className="ed-dica">{fotos.filter((it) => it.legenda).length} com legenda · {fotos.filter((it) => it.marcas.length).length} com pessoas marcadas</p>}
        {depois.length > 0 && <p className="pv-depois">Se quiser, dá para contar {depois.join(", ").replace(/, ([^,]*)$/, " e $1")} outro dia.</p>}
        <button type="button" className="btn btn-p pv-guardar" onClick={onGuardar} disabled={guardando}>
          <Icone nome="certo" />{guardando ? "Guardando…" : "Guardar memória"}
        </button>
        <button type="button" className="btn-l" onClick={onEditar}><Icone nome="voltar" />Voltar para editar</button>
      </div>
    </div>
  );
}

/**
 * Criar (ou completar) uma memória numa janela de etapas curtas, como a criação de uma publicação:
 * Voltar à esquerda, Avançar (ou Pular) à direita. Tudo fica salvo a cada mudança; nada além do
 * conteúdo é obrigatório.
 */
export default function Editor({ tipo, editarId, guardadas, carregou, onGuardada, onAviso }) {
  const ir = useContext(Navegar);
  const [chave] = useState(() => (editarId ? `editar-${editarId}` : new URLSearchParams(window.location.search).get("rascunho") || novaChave()));
  const passos = [...PASSOS[tipo], FINAL];
  const passoDaURL = () => Math.max(0, passos.findIndex((p) => p.id === new URLSearchParams(window.location.search).get("passo")));

  const [m, setM] = useState(null);
  const [i, setI] = useState(passoDaURL);
  const [salvo, setSalvo] = useState("");
  const [erro, setErro] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [falhaBanco, setFalhaBanco] = useState("");
  const mudou = useRef(false);
  const janela = useRef(null);
  const corpo = useRef(null);
  const titulo = useRef(null);

  const mudar = (fn) => {
    mudou.current = true;
    setErro("");
    setM((x) => (typeof fn === "function" ? fn(x) : { ...x, ...fn }));
  };
  const arquivos = useArquivos(mudar);

  // o endereço sempre aponta para este rascunho (recarregar a página volta para ele)
  const endereco = (n) => {
    const q = new URLSearchParams(editarId ? { editar: editarId } : { rascunho: chave });
    if (n > 0) q.set("passo", passos[n].id);
    return `${window.location.pathname}?${q}`;
  };
  useEffect(() => { window.history.replaceState(window.history.state, "", endereco(i)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // abrir: o rascunho, a memória já guardada, ou uma nova
  useEffect(() => {
    if (!carregou) return;
    lerRascunho(chave).then((r) => {
      const salva = editarId && guardadas.find((g) => g.id === editarId);
      if (r) setM(r.m);
      else if (salva) setM(structuredClone(salva));
      else if (editarId) setFalhaBanco("Não encontramos esta memória neste aparelho.");
      else setM({ ...novaMemoria(tipo), id: chave.replace(/^novo-/, "mem-") });
    }).catch(() => setFalhaBanco("Este navegador não deixou guardar arquivos. Tente fora da janela anônima, ou em outro navegador."));
  }, [carregou]); // eslint-disable-line react-hooks/exhaustive-deps

  // fotos escolhidas na tela anterior (o seletor abriu direto ao tocar em Fotografia ou Álbum)
  useEffect(() => {
    if (!m || !pendentes.has(chave)) return;
    const fs = pendentes.get(chave);
    pendentes.delete(chave);
    arquivos.juntar(fs);
  }, [!!m]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!m || !mudou.current) return;
    setSalvo("salvando");
    salvarRascunho(chave, m, passos[i].id).then(() => setSalvo("salvo")).catch(() => setSalvo("erro"));
  }, [m, i]); // eslint-disable-line react-hooks/exhaustive-deps

  // a janela: modal de verdade (o resto da página fica inacessível enquanto ela está aberta)
  useLayoutEffect(() => {
    const d = janela.current;
    if (d && !d.open) d.showModal();
    document.documentElement.classList.add("cr-aberta");
    return () => document.documentElement.classList.remove("cr-aberta");
  }, []);

  useEffect(() => {
    const voltou = () => setI(passoDaURL());
    window.addEventListener("popstate", voltou);
    return () => window.removeEventListener("popstate", voltou);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    corpo.current?.scrollTo(0, 0);
    titulo.current?.focus({ preventScroll: true });
  }, [i]);

  const irPara = (n) => {
    setErro("");
    window.history.pushState(window.history.state, "", endereco(n));
    setI(n);
  };

  const sair = () => {
    const tinha = !editarId && m && (m.itens.length || m.titulo || m.descricao || Object.values(m.extra).some(Boolean));
    ir(editarId ? `${ROTAS.memoria}/${editarId}` : ROTAS.guardar);
    if (tinha) onAviso("Ficou salvo como rascunho. Continue quando quiser.");
  };

  const guardar = async (e) => {
    const f = falta(m);
    if (f) {
      const n = passos.findIndex((p) => p.id === f[0]);
      if (n >= 0 && n !== i) irPara(n);
      setErro(f[1]);
      return;
    }
    const botao = e?.currentTarget;
    setGuardando(true);
    const agora = new Date().toISOString();
    const extra = m.tipo === "receita" ? { ...m.extra, ingredientes: listaDeIngredientes(m.extra.ingredientes).map((l) => l.trim()).filter(Boolean) } : m.extra;
    const final = { ...m, titulo: m.titulo.trim(), extra, criadaEm: m.criadaEm || agora, atualizadaEm: agora, origem: { tipo: "maria" }, status: "confirmada" };
    try {
      await salvarMemoria(final);
      await apagarRascunho(chave);
      limparArquivos();
      pedirPermanencia();
      confete(botao);
      onGuardada(final);
      ir(`${ROTAS.memoria}/${final.id}`);
      onAviso(editarId ? "Pronto, as mudanças foram guardadas." : `“${tituloDe(final)}” foi guardada na sua história.`);
    } catch {
      setErro("Não deu para guardar neste aparelho. O espaço pode ter acabado.");
      setGuardando(false);
    }
  };

  const passo = passos[i];
  const ultimo = i === passos.length - 1;
  const avancar = () => {
    if (arquivos.proc) return;
    if (passo.essencial && !passo.feito(m)) { setErro(falta(m)?.[1] || "Escolha primeiro o que vai guardar."); return; }
    irPara(i + 1);
  };
  const rotuloAvancar = passo.feito && m && !passo.feito(m) && !passo.essencial ? "Pular" : "Avançar";
  const Vitrine = VITRINES[tipo];

  return (
    <dialog ref={janela} className={`cr cr-${tipo}${passo.caderno ? " cr-caderno" : ""}`} aria-labelledby="cr-titulo"
      onCancel={(e) => { e.preventDefault(); sair(); }}>
      <header className="cr-cab">
        {i === 0
          ? <button type="button" className="cr-nav" onClick={sair}><Icone nome="fechar" /><span>Sair</span></button>
          : <button type="button" className="cr-nav" onClick={() => irPara(i - 1)}><Icone nome="voltar" /><span>Voltar</span></button>}
        <p className="cr-parte">
          <span className="sr">{TIPOS[tipo].nome}: </span>{i + 1} de {passos.length}
        </p>
        {ultimo
          ? <button type="button" className="cr-avancar" onClick={guardar} disabled={guardando || !m}><span>Guardar</span><Icone nome="certo" /></button>
          : <button type="button" className={`cr-avancar${rotuloAvancar === "Pular" ? " cr-pular" : ""}`} onClick={avancar} disabled={!m || !!arquivos.proc}>
              <span>{rotuloAvancar === "Pular" ? "Pular por enquanto" : "Avançar"}</span><Icone nome="seguir" />
            </button>}
      </header>
      <ol className="cr-progresso" aria-hidden="true">
        {passos.map((p, k) => <li key={p.id} className={k <= i ? "feito" : undefined} />)}
      </ol>

      <div ref={corpo} className={`cr-corpo${passo.lado && Vitrine && m ? " cr-lado" : ""}${passo.escuro ? " cr-escuro" : ""}`}>
        {!m ? (
          <div className="cr-painel"><h1 id="cr-titulo" ref={titulo} tabIndex={-1} className="cr-h1">{falhaBanco ? "Não deu para abrir" : passo.titulo}</h1><p role="status">{falhaBanco || "Abrindo…"}</p></div>
        ) : (
          <>
            {passo.lado && Vitrine && <div className="cr-midia"><Vitrine m={m} /></div>}
            <div className="cr-painel">
              <h1 id="cr-titulo" ref={titulo} tabIndex={-1} className="cr-h1">{editarId && i === 0 ? `Completar: ${tituloDe(m)}` : passo.titulo}</h1>
              {passo.dica && <p className="cr-dica">{passo.dica}</p>}
              {erro && <p className="ed-erro cr-erro" role="alert">{erro}</p>}
              {ultimo
                ? <Pronto m={m} onGuardar={guardar} guardando={guardando} onEditar={() => irPara(0)} />
                : <passo.Corpo m={m} mudar={mudar} sugestoes={sugestoesPessoas(m, guardadas)} arquivos={arquivos} />}
            </div>
          </>
        )}
      </div>

      <footer className="cr-pe">
        <span className="cr-salvo" aria-live="polite">
          {salvo === "salvando" && "Salvando…"}
          {salvo === "salvo" && <><Icone nome="certo" tam={18} />Salvo<span className="cr-longo"> neste aparelho</span></>}
          {salvo === "erro" && <span className="ed-erro">Não deu para salvar (falta espaço?)</span>}
        </span>
        {m && !ultimo && !falta(m) && <button type="button" className="btn-l cr-ja" onClick={guardar}><span className="cr-longo">Já está bom? </span>Guardar agora</button>}
      </footer>
    </dialog>
  );
}
