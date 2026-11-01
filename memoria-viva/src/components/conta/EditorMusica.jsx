import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { TextoLivre } from "./campos.jsx";
import { ComVoz } from "./voz.jsx";
import Detalhes from "./Detalhes.jsx";
import { PlayerYoutube, dadosDoLink, idDoYoutube, limparCanal, limparTitulo, pesquisaDisponivel, pesquisar, youtubeDe } from "./youtube.jsx";

const ESPERA = 700; // pesquisa depois de uma pausa na digitação (a cota do YouTube é curta)

/** A música escolhida: player e o nome (dá para corrigir). */
function Escolhida({ m, mudar }) {
  const yt = youtubeDe(m);
  return (
    <div className="mu-disco">
      <div className="mu-capa">
        {yt ? <PlayerYoutube id={yt} titulo={m.titulo} /> : <span className="fl-vinil" aria-hidden="true"><span className="fl-rotulo">{m.titulo || "?"}</span></span>}
      </div>
      <div className="mu-info">
        <label className="ge-rot" htmlFor="ge-titulo">Nome da música</label>
        <ComVoz rotulo="Nome da música" valor={m.titulo} onMudar={(v) => mudar({ titulo: v })}>
          <input id="ge-titulo" className="mu-titulo" type="text" maxLength={120} value={m.titulo} placeholder="Ex.: Asa Branca" onChange={(e) => mudar({ titulo: e.target.value })} />
        </ComVoz>
        <label className="ge-rot" htmlFor="mu-artista">Quem canta <span className="ed-marca">(opcional)</span></label>
        <ComVoz rotulo="Quem canta" valor={m.extra.artista} onMudar={(v) => mudar((x) => ({ ...x, extra: { ...x.extra, artista: v } }))}>
          <input id="mu-artista" className="mu-artista" type="text" maxLength={120} value={m.extra.artista || ""} placeholder="Ex.: Luiz Gonzaga"
            onChange={(e) => mudar((x) => ({ ...x, extra: { ...x.extra, artista: e.target.value } }))} />
        </ComVoz>
        <button type="button" className="btn-l" onClick={() => mudar((x) => ({ ...x, extra: { ...x.extra, youtube: null, link: "", semLink: false } }))}>
          <Icone nome="trocar" />Escolher outra música
        </button>
      </div>
    </div>
  );
}

/** Etapa 1: "Qual música você quer guardar?" — escrever o nome e escolher nos resultados. */
function AcharMusica({ m, mudar }) {
  const [busca, setBusca] = useState(null); // null = verificando se a pesquisa está ligada
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState(""); // "", "procurando", "nada", "erro", "cota"
  const [resultados, setResultados] = useState([]);
  const [outro, setOutro] = useState(""); // "", "link", "nome"
  const [link, setLink] = useState("");
  const [erroLink, setErroLink] = useState("");
  const pedido = useRef(null);
  const campo = useRef(null);

  useEffect(() => { pesquisaDisponivel().then(setBusca); }, []);
  useEffect(() => { if (busca) campo.current?.focus(); }, [busca]);

  const procurar = async (texto) => {
    const t = texto.trim();
    pedido.current?.abort();
    if (t.length < 2) { setResultados([]); setEstado(""); return; }
    const c = new AbortController();
    pedido.current = c;
    setEstado("procurando");
    try {
      const r = await pesquisar(t, c.signal);
      setResultados(r);
      setEstado(r.length ? "" : "nada");
    } catch (e) {
      if (e.name === "AbortError") return;
      setResultados([]);
      setEstado(e.codigo === "cota" ? "cota" : "erro");
    }
  };

  // pesquisa sozinha depois de uma pausa (Enter pesquisa na hora)
  useEffect(() => {
    if (!busca) return;
    const t = setTimeout(() => procurar(q), ESPERA);
    return () => clearTimeout(t);
  }, [q, busca]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pedido.current?.abort(), []);

  const escolher = (r) => mudar((x) => ({
    ...x, titulo: limparTitulo(r.titulo, r.canal) || x.titulo,
    extra: { ...x.extra, youtube: { id: r.id, titulo: r.titulo, canal: r.canal, capa: r.capa }, artista: limparCanal(r.canal) || x.extra.artista, semLink: false },
  }));
  const usarLink = async () => {
    if (!idDoYoutube(link)) { setErroLink("Esse não parece um endereço do YouTube. Ele começa com https://www.youtube.com ou https://youtu.be"); return; }
    setErroLink("");
    escolher(await dadosDoLink(link));
  };

  if (youtubeDe(m) || m.extra.semLink) return <Escolhida m={m} mudar={mudar} />;

  return (
    <div className="mu-achar">
      {busca === null && <p className="mu-estado" role="status">Preparando a pesquisa…</p>}
      {busca && (
        <form className="mu-busca" role="search" onSubmit={(e) => { e.preventDefault(); procurar(q); }}>
          <label className="sr" htmlFor="mu-q">Nome da música ou de quem canta</label>
          <ComVoz className="mu-campo" rotulo="nome da música" onTexto={(t) => { const n = t.replace(/[.!?]$/, ""); setQ(n); procurar(n); }}>
            <Icone nome="buscar" />
            <input id="mu-q" ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escreva o nome da música ou de quem canta" autoComplete="off" enterKeyHint="search" />
          </ComVoz>
        </form>
      )}
      {busca === false && (
        <div className="mu-desligada" role="note">
          <p><b>A pesquisa de músicas ainda não foi ativada neste site.</b></p>
          <p>Enquanto isso, dá para colar o endereço da música no YouTube ou escrever só o nome dela.</p>
        </div>
      )}

      <div aria-live="polite">
        {estado === "procurando" && <p className="mu-estado">Procurando…</p>}
        {estado === "nada" && <p className="mu-estado">Não achamos com esse nome. Tente o nome de quem canta.</p>}
        {estado === "erro" && <p className="mu-estado">A pesquisa não respondeu agora. Tente de novo daqui a pouco.</p>}
        {estado === "cota" && <p className="mu-estado">A pesquisa chegou ao limite de hoje. Amanhã ela volta; enquanto isso, cole o endereço da música.</p>}
      </div>
      {resultados.length > 0 && (
        <ul className="mu-res" aria-label="Músicas encontradas">
          {resultados.map((r) => (
            <li key={r.id}>
              <button type="button" className="mu-r" onClick={() => escolher(r)}>
                <img src={r.capa} alt="" loading="lazy" />
                <span className="mu-r-txt"><b>{r.titulo}</b><span>{limparCanal(r.canal)}</span></span>
                <span className="mu-r-esc">Escolher</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mu-outros">
        {outro !== "link" && <button type="button" className="btn-l" onClick={() => setOutro("link")}><Icone nome="link" />Já tem o endereço do YouTube?</button>}
        {outro === "link" && (
          <div className="mu-link">
            <label className="ge-rot" htmlFor="mu-link">Endereço da música no YouTube</label>
            <div className="mu-busca-linha">
              <input id="mu-link" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…"
                aria-describedby="mu-link-dica" aria-invalid={!!erroLink} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), usarLink())} />
              <button type="button" className="btn btn-s" onClick={usarLink}>Usar</button>
            </div>
            <span id="mu-link-dica" className={erroLink ? "ed-erro" : "ed-dica"}>{erroLink || "No YouTube: “Compartilhar” e depois “Copiar link”."}</span>
          </div>
        )}
        <button type="button" className="btn-l" onClick={() => mudar((x) => ({ ...x, extra: { ...x.extra, semLink: true } }))}>
          <Icone nome="corrigir" />{busca ? "Não achou? Escreva só o nome" : "Escrever só o nome da música"}
        </button>
      </div>
    </div>
  );
}

/** Etapa 2: por que ela é especial (duas perguntas; as outras, só se quiser). */
function PorQue({ m, mudar, sugestoes }) {
  const x = m.extra;
  const [mais, setMais] = useState(!!(x.quemOuvia || x.momento || m.data.ano || m.data.decada || m.etiquetas?.length || m.lugar || m.pessoas.length));
  const ex = (k) => (v) => mudar((y) => ({ ...y, extra: { ...y.extra, [k]: v } }));
  return (
    <>
      <div className="ge-campo">
        <label className="ge-rot" htmlFor="mu-porque">Por que ela é especial para você?</label>
        <ComVoz rotulo="Por que ela é especial" valor={x.porque} onMudar={ex("porque")}>
          <TextoLivre id="mu-porque" className="ge-texto" valor={x.porque} onMudar={ex("porque")} maxLength={2000} placeholder="Ex.: Tocava no rádio da cozinha todo domingo." />
        </ComVoz>
      </div>
      <div className="ge-campo">
        <label className="ge-rot" htmlFor="mu-lembranca">Que lembrança ela traz?</label>
        <ComVoz rotulo="Que lembrança ela traz" valor={x.lembranca} onMudar={ex("lembranca")}>
          <TextoLivre id="mu-lembranca" className="ge-texto" valor={x.lembranca} onMudar={ex("lembranca")} maxLength={2000} placeholder="Ex.: Meu pai dançando com a minha mãe na sala." />
        </ComVoz>
      </div>
      {mais ? (
        <>
          <div className="ge-campo">
            <label className="ge-rot" htmlFor="mu-quemOuvia">Quem costumava ouvir?</label>
            <ComVoz rotulo="Quem costumava ouvir" valor={x.quemOuvia} onMudar={ex("quemOuvia")}>
              <TextoLivre id="mu-quemOuvia" className="ge-texto" valor={x.quemOuvia} onMudar={ex("quemOuvia")} maxLength={1000} placeholder="Ex.: Meu avô, no caminhão, a caminho da feira." />
            </ComVoz>
          </div>
          <div className="ge-campo">
            <label className="ge-rot" htmlFor="mu-momento">Em que momento da vida ela marcou presença?</label>
            <ComVoz rotulo="Em que momento da vida ela marcou" valor={x.momento} onMudar={ex("momento")}>
              <TextoLivre id="mu-momento" className="ge-texto" valor={x.momento} onMudar={ex("momento")} maxLength={1000} placeholder="Ex.: No meu casamento, em 1957." />
            </ComVoz>
          </div>
          <Detalhes m={m} mudar={mudar} sugestoes={sugestoes}
            rotulos={{ data: "Quando ela marcou?", lugar: "Onde?", pessoas: "Pessoas ligadas a ela", legendaData: "Quando ela marcou você", legendaPessoas: "Pessoas ligadas a ela" }} />
        </>
      ) : (
        <button type="button" className="btn-l" onClick={() => setMais(true)}><Icone nome="mais" />Mais perguntas (quem ouvia, quando, onde)</button>
      )}
    </>
  );
}

/** Disco ou player, ao lado das perguntas. */
export function VitrineMusica({ m }) {
  const yt = youtubeDe(m);
  return yt ? <PlayerYoutube id={yt} titulo={m.titulo} />
    : <span className="fl-vinil" aria-hidden="true"><span className="fl-rotulo">{m.titulo || "?"}</span></span>;
}

export const temMusica = (m) => !!(youtubeDe(m) || (m.extra.semLink && m.titulo.trim()));

export const PASSOS_MUSICA = [
  { id: "musica", titulo: "Qual música você quer guardar?", Corpo: AcharMusica, essencial: true, escuro: true, feito: temMusica },
  { id: "historia", titulo: "Por que ela é especial?", dica: "Se não quiser contar agora, toque em “Pular”.", Corpo: PorQue, lado: true,
    feito: (m) => !!(m.extra.porque || m.extra.lembranca || m.extra.quemOuvia || m.extra.momento) },
];
