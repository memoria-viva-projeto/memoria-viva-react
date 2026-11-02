import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { useArquivo } from "./midia.jsx";
import { EscolherPessoas } from "./pessoas.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { capaDoYoutube, youtubeDe } from "./youtube.jsx";
import { Janela } from "./campos.jsx";
import { CarrosselAlbum, VerFoto } from "./Album.jsx";
import { Comentarios, Reacoes, nomeCurto, tempo } from "./interacoes.jsx";
import { pessoa } from "../../dados/conta.js";
import { comentariosDe, contextoDaMemoria } from "./comentarios.js";

const NOME_TIPO = { foto: "Fotografia", album: "Álbum", musica: "Música", receita: "Receita", video: "Vídeo", conselho: "Conselho" };

const minSeg = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
/** "Antônio", "Antônio e Juliana", "Antônio, Juliana e mais 5" */
const resumoNomes = (refs) => {
  const n = refs.map(nomeCurto);
  return n.length <= 2 ? n.join(" e ") : `${n.slice(0, 2).join(", ")} e mais ${n.length - 2}`;
};

/** Relato em áudio. Por enquanto, sem gravação de verdade: o tocador só mostra o andamento. */
export function Audio({ duracao }) {
  const [tocando, setTocando] = useState(false);
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    if (!tocando) return;
    const t = setInterval(() => setSeg((s) => {
      if (s + 1 >= duracao) { setTocando(false); return 0; }
      return s + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [tocando, duracao]);

  return (
    <div className={`audio${tocando ? " on" : ""}`}>
      <button type="button" className="audio-bt" onClick={() => setTocando(!tocando)} aria-pressed={tocando}>
        <Icone nome={tocando ? "pausar" : "ouvir"} tam={26} />{tocando ? "Pausar" : "Ouvir"}
      </button>
      <div className="audio-meio">
        <span className="audio-t">Seu relato · {Math.floor(duracao / 60)} min {duracao % 60} s</span>
        <span className="audio-onda" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <i key={i} style={{ "--h": `${30 + ((i * 37) % 70)}%`, "--dl": `${(i % 7) * -0.12}s`, opacity: seg / duracao > i / 26 ? 1 : 0.45 }} />
          ))}
        </span>
        {tocando && <span className="audio-tempo">{minSeg(seg)} de {minSeg(duracao)}</span>}
      </div>
    </div>
  );
}

/** O conteúdo da memória: a foto em proporção natural, a capa do álbum/vídeo/música, ou a frase do conselho. */
export function Midia({ x, mini }) {
  const guardado = useArquivo(x.arq, !!mini);
  const yt = x.fonte === "guardada" ? youtubeDe(x.m) : null;
  if (x.tipo === "conselho") {
    return (
      <div className="mm-frase">
        <span className="mao">um conselho seu</span>
        <p>“{x.frase}”</p>
        {x.m.guardadoPara && <span className="mao">guardado para {x.m.guardadoPara}</span>}
      </div>
    );
  }
  const src = x.foto || guardado?.url || (yt && capaDoYoutube(yt));
  if (!src) return <div className={`mm-sem mm-sem-${x.tipo}`}><Icone nome={x.tipo} tam={mini ? 34 : 48} /></div>;
  return (
    <>
      <img className="mm-img" src={src} alt={x.alt || ""} loading="lazy" />
      {x.tipo === "album" && x.fotos > 1 && <span className="mm-selo-midia"><Icone nome="album" tam={16} />{x.fotos} fotos</span>}
      {x.tipo === "video" && <span className="mm-selo-midia"><Icone nome="ouvir" tam={16} />Vídeo</span>}
      {x.tipo === "musica" && <span className="mm-selo-midia"><Icone nome="musica" tam={16} />Música</span>}
    </>
  );
}

/** Quem está: a lista, "Está certo" e "Corrigir ou acrescentar", tudo no mesmo lugar. */
function PainelPessoas({ x, sugestoes, onMudarPessoas, comecarEditando }) {
  const [editando, setEditando] = useState(comecarEditando);
  const [refs, setRefs] = useState(x.pessoas);
  const naFoto = x.tipo === "foto" || x.tipo === "album";
  return (
    <div className="mm-painel" role="region" aria-label="Quem está">
      <p className="mm-painel-t"><Icone nome="marcar" tam={20} />Quem está {naFoto ? "na foto" : "nesta memória"}</p>
      {editando ? (
        <>
          <EscolherPessoas id={`mm-p-${x.id}`} rotulo="Quem está" valor={refs} onMudar={setRefs} sugestoes={sugestoes} />
          <p className="ed-dica">Dá para marcar familiares, amigos e outras pessoas importantes. Quem ainda não está cadastrado pode ser escrito pelo nome.</p>
          <div className="mm-painel-bt">
            <button type="button" className="btn btn-p btn-sm" onClick={() => { onMudarPessoas(refs, true); setEditando(false); }}><Icone nome="certo" />Guardar</button>
            <button type="button" className="btn-l" onClick={() => { setRefs(x.pessoas); setEditando(false); }}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          {x.pessoas.length ? (
            <ul className="mm-gente">
              {x.pessoas.map((id) => (
                <li key={id}><Avatar id={id} tam={40} /><span><b>{nomeCurto(id)}</b>{pessoa(id).relacao && <span>{pessoa(id).relacao}</span>}</span></li>
              ))}
            </ul>
          ) : <p className="ed-dica">Ninguém marcado ainda.</p>}
          {x.pessoasConfirmadas && <p className="mm-ok"><Icone nome="certo" tam={18} />Você confirmou quem está.</p>}
          <div className="mm-painel-bt">
            {x.pessoas.length > 0 && !x.pessoasConfirmadas && (
              <button type="button" className="btn btn-p btn-sm" onClick={() => onMudarPessoas(x.pessoas, true)}><Icone nome="certo" />Está certo</button>
            )}
            <button type="button" className="btn btn-s btn-sm" onClick={() => setEditando(true)}><Icone nome="corrigir" />{x.pessoas.length ? "Corrigir ou acrescentar" : "Marcar quem está"}</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Detalhes: o que não precisa ficar sempre à vista (relato inteiro, origem, sugestão da IA, o que a IA vai considerar). */
function PainelDetalhes({ x, guardados, onAviso }) {
  const contexto = contextoDaMemoria(x, guardados);
  const origem = x.enviadaPor
    ? `Enviada por ${pessoa(x.enviadaPor).nome}${x.status === "aguardando" ? ", esperando você conferir" : ", confirmada por você"}`
    : x.fonte === "guardada" ? "Guardada por você" : "Contada por você";
  const linhas = [
    ["calendario", "Quando", x.quando], ["pin", "Onde", x.lugar], ["receita", "Receita", x.receita], ["certo", "Origem", origem],
  ].filter(([, , v]) => v);
  return (
    <div className="mm-painel" role="region" aria-label="Detalhes">
      <dl className="mm-dl">
        {linhas.map(([icone, rot, v]) => <div key={rot}><dt><Icone nome={icone} tam={18} />{rot}</dt><dd>{v}</dd></div>)}
      </dl>
      {(x.relato || x.texto) && <p className="mm-texto-todo">{x.relato || x.texto}</p>}
      {x.sugestaoIA && (
        <p className="mm-ia"><span className="mm-ia-rot">Sugestão da IA · ainda não confirmada</span>{x.sugestaoIA.texto}</p>
      )}
      <div className="mm-painel-bt">
        {x.fonte === "guardada" && <Link className="btn btn-s btn-sm" para={`${ROTAS.memoria}/${x.id}`}><Icone nome="ver" />Abrir a memória completa</Link>}
        <button type="button" className="btn btn-s btn-sm" onClick={() => onAviso()}><Icone nome="conversar" />Conversar sobre esta memória</button>
      </div>
      <details className="mm-ctx">
        <summary>O que a IA vai saber sobre esta memória</summary>
        <p className="ed-dica">É isto que a IA recebe quando você conversar sobre esta memória: só esta memória, com quem contou cada coisa.</p>
        <pre>{contexto.texto}</pre>
      </details>
    </div>
  );
}

/**
 * Uma publicação do feed (qualquer tipo de memória). Sempre à vista: o conteúdo, o título, quando e quem está (resumido).
 * O resto abre quando a pessoa quer: quem está (confirmar/corrigir), detalhes, todos os comentários.
 * Álbum: todas as fotos ali mesmo, para deslizar; cada foto abre grande, com reações e comentários só dela.
 * onComentar(texto, foto?) e onReagir(tipo, foto?): sem foto, valem para a memória (o álbum) inteira.
 */
export function Publicacao({ x, guardados, sugestoes, onComentar, onReagir, onApagar, onConfirmar, onMudarPessoas, onAviso }) {
  const coms = comentariosDe(x, guardados); // os desta memória (os da demonstração + os guardados), sem os das fotos do álbum
  const [painel, setPainel] = useState(null); // "pessoas" | "marcar" | "detalhes"
  const [comentando, setComentando] = useState(false);
  const [foto, setFoto] = useState(null); // foto do álbum aberta grande
  const alternar = (k) => setPainel((p) => (p === k ? null : k));
  const album = x.tipo === "album" && x.fonte === "guardada" && x.fotos > 1;
  const comImagem = x.tipo !== "conselho";
  const meta = [x.quando, x.lugar].filter(Boolean).join(" · ");
  const resumo = x.relato || x.texto;
  const nomes = x.emocionaram.map((id) => pessoa(id).nome);
  const emocao = !nomes.length ? "" : nomes.length === 1 ? `${nomes[0]} se emocionou`
    : nomes.length === 2 ? `${nomes[0]} e ${nomes[1]} se emocionaram` : `${nomes[0]}, ${nomes[1]} e mais ${nomes.length - 2} se emocionaram`;
  const origem = x.enviadaPor ? "enviou" : x.fonte === "guardada" ? "guardou" : "contou";
  const marcas = comImagem && (
    <button type="button" className="mm-marcas" aria-expanded={painel === "pessoas" || painel === "marcar"}
      onClick={() => alternar(x.pessoas.length ? "pessoas" : "marcar")}>
      <Icone nome="marcar" tam={18} />{x.pessoas.length ? resumoNomes(x.pessoas) : "Marcar quem está"}
      {x.pessoasConfirmadas && <Icone nome="certo" tam={16} />}
    </button>
  );

  return (
    <article className={`mm-pub${x.tipo === "conselho" ? " mm-pub-frase" : ""}`} id={`mem-${x.id}`} aria-labelledby={`t-${x.id}`}>
      <header className="mm-cab">
        <Avatar id={x.autor} tam={40} />
        <p className="mm-quem"><b>{nomeCurto(x.autor)}</b><span>{origem} {tempo(x.em)}</span></p>
        <span className="mm-tipo"><Icone nome={NOME_TIPO[x.tipo] ? x.tipo : "memorias"} tam={16} />{NOME_TIPO[x.tipo] || "Lembrança"}</span>
      </header>

      <div className="mm-midia">
        {album ? <CarrosselAlbum x={x} onAbrirFoto={setFoto}>{marcas}</CarrosselAlbum> : <><Midia x={x} />{marcas}</>}
      </div>
      {(painel === "pessoas" || painel === "marcar") && (
        <PainelPessoas key={painel} x={x} sugestoes={sugestoes} onMudarPessoas={onMudarPessoas} comecarEditando={painel === "marcar"} />
      )}

      <div className="mm-corpo">
        <h3 id={`t-${x.id}`} className="mm-titulo" tabIndex={-1}>{x.titulo}</h3>
        {meta && <p className="mm-meta">{meta}</p>}
        {resumo && <p className="mm-trecho">{resumo}</p>}
        {!comImagem && x.pessoas.length > 0 && <p className="mm-meta">Com {resumoNomes(x.pessoas)}</p>}
        {x.audio && <Audio duracao={x.audio.duracao} />}
        {album && <Link className="btn btn-s btn-sm mm-abrir" para={`${ROTAS.memoria}/${x.id}`}><Icone nome="album" />Abrir o álbum</Link>}
      </div>

      {x.status === "aguardando" && (
        <div className="mm-confere">
          <p><b>{pessoa(x.enviadaPor).nome} enviou.</b> Está do jeito que você lembra?</p>
          <div className="mm-painel-bt">
            <button type="button" className="btn btn-p btn-sm" onClick={(e) => onConfirmar(x.id, e.currentTarget)}><Icone nome="certo" />Está certo</button>
            <button type="button" className="btn btn-s btn-sm" onClick={() => onAviso()}><Icone nome="corrigir" />Corrigir</button>
          </div>
        </div>
      )}

      <Reacoes coms={coms} rotulo={`Ações para ${album ? "o álbum " : ""}${x.titulo}`} comentando={comentando}
        onComentar={() => setComentando((c) => !c)} onReagir={(t) => onReagir(t)}>
        <button type="button" className={`mm-acao${painel === "detalhes" ? " on" : ""}`} aria-expanded={painel === "detalhes"} onClick={() => alternar("detalhes")}>
          <Icone nome="ler" tam={22} />Detalhes
        </button>
      </Reacoes>
      {emocao && <p className="mm-emocao"><Icone nome="coracao" tam={18} />{emocao}</p>}
      {painel === "detalhes" && <PainelDetalhes x={x} guardados={guardados} onAviso={onAviso} />}

      <Comentarios x={x} sobre={album ? "este álbum" : "esta memória"} coms={coms} aberto={comentando} onAbrir={() => setComentando(true)}
        onComentar={(t) => onComentar(t)} onApagar={onApagar} />

      {album && (
        <Janela id={`vf-${x.id}`} className="fe" aberta={foto !== null} onFechar={() => setFoto(null)} titulo={x.titulo}>
          {foto !== null && <VerFoto key={foto} x={x} k={foto} onIr={setFoto} guardados={guardados} onReagir={onReagir} onComentar={onComentar} onApagar={onApagar} />}
        </Janela>
      )}
    </article>
  );
}
