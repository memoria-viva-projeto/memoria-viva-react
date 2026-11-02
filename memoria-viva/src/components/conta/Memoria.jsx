import { useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { BotaoOuvir } from "./voz.jsx";
import { Janela } from "./campos.jsx";
import { pessoasDe } from "./pessoas.jsx";
import { Midia, Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { PlayerYoutube, youtubeDe } from "./youtube.jsx";
import { FolhaLida } from "./EditorReceita.jsx";
import { pessoa } from "../../dados/conta.js";
import { TIPOS, apagarMemoria, resumo, textoQuando, textoRegistro, tituloDe } from "./guardados.js";
import { Comentarios, Reacoes } from "./interacoes.jsx";
import { FotoComPessoas, Folhear, VerFoto } from "./Album.jsx";
import { comentariosDe, contextoDaMemoria } from "./comentarios.js";
import { CATEGORIAS, daGuardada } from "./memorias.js";

/** Para onde volta: a pasta da Biblioteca de onde veio (?de=albuns) ou Minhas memórias. */
function voltar() {
  const de = new URLSearchParams(window.location.search).get("de");
  const pasta = CATEGORIAS.find(([k]) => k === de);
  return pasta ? [`${ROTAS.historia}?aba=biblioteca&pasta=${de}`, pasta[1]] : [ROTAS.historia, "Minhas memórias"];
}

/**
 * A página de um álbum: o álbum em primeiro lugar, grande. Embaixo, só uma fileira: Curtir, Eu me lembro, Comentar e
 * Detalhes. O resto (ouvir, completar, quem aparece, a história inteira, o que a IA sabe, apagar) fica em Detalhes.
 */
function PaginaAlbum({ m, xi, coms, comentarios, voltarPara, onComentar, onReagir, onApagarComentario, onApagar }) {
  const [aberta, setAberta] = useState(null);
  const [comentando, setComentando] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [apagando, setApagando] = useState(false);
  // nomes, setas e balões nas páginas: dá para esconder (fica guardado neste aparelho)
  const [anotacoes, setAnotacoesEstado] = useState(() => { try { return localStorage.getItem("mv-anotacoes") !== "nao"; } catch { return true; } });
  const setAnotacoes = (v) => { setAnotacoesEstado(v); try { localStorage.setItem("mv-anotacoes", v ? "sim" : "nao"); } catch { /* sem guardar */ } };
  const pessoas = pessoasDe(m);
  const anexos = m.itens.filter((it) => it.anexo);
  const editar = `${ROTAS.guardar}/${m.tipo}?editar=${m.id}`;
  const leitura = [tituloDe(m), textoQuando(m), m.lugar, m.descricao].filter(Boolean).join(". ");
  return (
    <div className="c-wrap mv mv-t-album">
      <header className="mv-cab ab-cab">
        <Link className="btn-l hs-voltar" para={voltarPara[0]}><Icone nome="voltar" />{voltarPara[1]}</Link>
        <h1 className="hs-titulo" tabIndex={-1}>{tituloDe(m)}</h1>
      </header>

      <Folhear x={xi} guardados={comentarios} onAbrirFoto={setAberta} anotacoes={anotacoes} />

      <section className="ab-sobre" aria-label="O álbum inteiro">
        <Reacoes coms={coms} rotulo={`Ações para o álbum ${tituloDe(m)}`} comentando={comentando} onComentar={() => setComentando((c) => !c)}
          onReagir={(t) => onReagir(xi, t)}>
          <button type="button" className={`mm-acao${detalhes ? " on" : ""}`} aria-expanded={detalhes} onClick={() => setDetalhes((d) => !d)}>
            <Icone nome="ler" tam={22} />Detalhes
          </button>
        </Reacoes>
        {detalhes && (
          <div className="mm-painel ab-detalhes" role="region" aria-label="Detalhes do álbum">
            {m.descricao && <p className="mv-texto">{m.descricao}</p>}
            <dl className="mm-dl">
              {textoQuando(m) && <div><dt><Icone nome="calendario" tam={18} />Quando</dt><dd>{textoQuando(m)}</dd></div>}
              {m.lugar && <div><dt><Icone nome="pin" tam={18} />Onde</dt><dd>{m.lugar}</dd></div>}
              <div><dt><Icone nome="album" tam={18} />Fotos</dt><dd>{resumo(m).replace("Álbum · ", "")}</dd></div>
              <div><dt><Icone nome="certo" tam={18} />Guardado</dt><dd>por você em {textoRegistro(m.criadaEm)}</dd></div>
            </dl>
            {pessoas.length > 0 && <ul className="chips" aria-label="Quem aparece">{pessoas.map((p) => <li key={p}><Avatar id={p} tam={32} />{pessoa(p).nome}</li>)}</ul>}
            {anexos.length > 0 && (
              <ul className="an-lista" aria-label="Junto com ele">
                {anexos.map((it) => <li key={it.arq}>{it.tipo === "audio" ? <Midia arq={it.arq} tipo="audio" rotulo="Áudio" /> : <Miniatura arq={it.arq} />}</li>)}
              </ul>
            )}
            <div className="mm-painel-bt">
              <BotaoOuvir texto={leitura} rotulo="Ouvir" className="btn btn-s btn-sm" />
              <Link className="btn btn-s btn-sm" para={editar}><Icone nome="corrigir" />{m.descricao ? "Completar" : "Contar a história"}</Link>
            </div>
            <label className="ab-opcao">
              <input type="checkbox" checked={anotacoes} onChange={(e) => setAnotacoes(e.target.checked)} />
              <span>Mostrar nas páginas os nomes de quem está nas fotos e os comentários</span>
            </label>
            <details className="mm-ctx">
              <summary>O que a IA vai saber sobre este álbum</summary>
              <pre>{contextoDaMemoria(xi, comentarios).texto}</pre>
            </details>
            {apagando ? (
              <div className="fe-confirma" role="alert">
                <p>Apagar “{tituloDe(m)}” com todas as fotos? Não dá para desfazer.</p>
                <button type="button" className="btn btn-p btn-sm" onClick={onApagar}><Icone nome="lixo" />Sim, apagar</button>
                <button type="button" className="btn-l" onClick={() => setApagando(false)}>Não, manter</button>
              </div>
            ) : (
              <button type="button" className="btn-l mv-apagar" onClick={() => setApagando(true)}><Icone nome="lixo" />Apagar este álbum</button>
            )}
          </div>
        )}
        <Comentarios x={xi} sobre="este álbum" coms={coms} aberto={comentando} onAbrir={() => setComentando(true)}
          onComentar={(texto) => onComentar(xi, texto, "comentario")} onApagar={onApagarComentario} />
      </section>

      <Janela id="mv-foto" className="fe" aberta={aberta !== null} onFechar={() => setAberta(null)} titulo={tituloDe(m)}>
        {aberta !== null && (
          <VerFoto key={aberta} x={xi} k={aberta} onIr={setAberta} guardados={comentarios} onApagar={onApagarComentario}
            onReagir={(t, foto) => onReagir(xi, t, foto)} onComentar={(texto, foto) => onComentar(xi, texto, "comentario", foto)} />
        )}
      </Janela>
    </div>
  );
}

/** Ver uma memória guardada, do jeito de cada tipo. */
export default function Memoria({ id, guardadas, carregou, onApagada, comentarios = [], onComentar, onReagir, onApagarComentario }) {
  const [apagando, setApagando] = useState(false);
  const [vendo, setVendo] = useState(0);
  const m = guardadas.find((g) => g.id === id);
  const [paraVoltar, nomeVoltar] = voltar();

  if (!m) {
    return (
      <div className="c-wrap mv">
        <Link className="btn-l hs-voltar" para={paraVoltar}><Icone nome="voltar" />{nomeVoltar}</Link>
        <h1 className="hs-titulo" tabIndex={-1}>{carregou ? "Esta memória não está neste aparelho" : "Abrindo…"}</h1>
        {carregou && <p>Ela pode ter sido apagada, ou guardada em outro aparelho.</p>}
      </div>
    );
  }

  const x = m.extra || {};
  const principais = m.itens.filter((it) => !it.anexo);
  const anexos = m.itens.filter((it) => it.anexo);
  const pessoas = pessoasDe(m);
  const data = textoQuando(m);
  const editar = `${ROTAS.guardar}/${m.tipo}?editar=${m.id}`;
  const yt = youtubeDe(m);
  const xi = daGuardada(m); // a mesma memória no formato do feed: comentários e reações são os mesmos
  const coms = comentariosDe(xi, comentarios);
  const comentarAgora = () => document.getElementById(`com-${m.id}`)?.focus();
  const leitura = [tituloDe(m), x.artista, data, m.lugar, m.descricao, x.porque, x.lembranca, x.quemOuvia, x.momento, x.contexto].filter(Boolean).join(". ");

  const apagar = async () => {
    await apagarMemoria(m.id);
    onApagada(m.id);
  };

  if (m.tipo === "album") {
    return <PaginaAlbum m={m} xi={xi} coms={coms} comentarios={comentarios} voltarPara={[paraVoltar, nomeVoltar]} onComentar={onComentar}
      onReagir={onReagir} onApagarComentario={onApagarComentario} onApagar={apagar} />;
  }

  return (
    <div className={`c-wrap mv mv-t-${m.tipo}`}>
      <Link className="btn-l hs-voltar" para={paraVoltar}><Icone nome="voltar" />{nomeVoltar}</Link>

      <header className="mv-cab">
        <span className="mv-tipo"><Icone nome={TIPOS[m.tipo].icone} tam={20} />{resumo(m)}</span>
        <h1 className="hs-titulo" tabIndex={-1}>{tituloDe(m)}</h1>
        {(data || m.lugar) && <p className="mv-meta">{[data, m.lugar].filter(Boolean).join(" · ")}</p>}
        <p className="mv-registro"><Icone nome="certo" tam={18} />Guardada por você em {textoRegistro(m.criadaEm)}</p>
      </header>

      {/* ---- o conteúdo principal de cada tipo ---- */}
      {m.tipo === "foto" && principais.length > 0 && (
        <div className="mv-principal">
          <FotoComPessoas key={principais[vendo]?.arq} it={principais[Math.min(vendo, principais.length - 1)]} alt={m.titulo} />
          {principais.length > 1 && (
            <ul className="ea-tira" aria-label="Fotos desta lembrança">
              {principais.map((it, k) => (
                <li key={it.arq}>
                  <button type="button" className="ea-tira-it" aria-pressed={k === vendo} onClick={() => setVendo(k)}>
                    <Miniatura arq={it.arq} /><span className="sr">Ver a foto {k + 1}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {principais[vendo]?.legenda && <p className="vf-leg">{principais[vendo].legenda}</p>}
        </div>
      )}
      {m.tipo === "video" && (principais[0] || yt) && (
        <div className="mv-principal vi-filme">
          {principais[0] ? <Midia arq={principais[0].arq} tipo="video" rotulo={m.titulo} /> : <PlayerYoutube id={yt} titulo={m.titulo} />}
        </div>
      )}
      {m.tipo === "musica" && (
        <div className="mv-disco">
          {yt ? <PlayerYoutube id={yt} titulo={m.titulo} className="mv-yt" />
            : <span className="fl-vinil" aria-hidden="true"><span className="fl-rotulo">{m.titulo}</span></span>}
          <div>
            <p className="mv-musica">{m.titulo}</p>
            {x.artista && <p>{x.artista}</p>}
            {!yt && /^https?:\/\//i.test(x.link || "") && (
              <a className="btn btn-s btn-sm" href={x.link} target="_blank" rel="noopener noreferrer"><Icone nome="link" />Ouvir no link<span className="sr"> (abre em outra aba)</span></a>
            )}
          </div>
        </div>
      )}

      <div className="mv-acoes">
        <BotaoOuvir texto={leitura} rotulo="Ouvir esta memória" className="btn btn-s btn-sm" />
        <Link className="btn btn-s btn-sm" para={editar}><Icone nome="corrigir" />Completar ou mudar</Link>
      </div>

      {/* ---- a história ---- */}
      {m.tipo === "musica" ? (
        <dl className="mv-dl">
          {x.porque && <><dt>Por que é importante</dt><dd>{x.porque}</dd></>}
          {x.lembranca && <><dt>A lembrança que ela traz</dt><dd>{x.lembranca}</dd></>}
          {x.quemOuvia && <><dt>Quem costumava ouvir</dt><dd>{x.quemOuvia}</dd></>}
          {x.momento && <><dt>O momento da vida</dt><dd>{x.momento}</dd></>}
          {m.descricao && <><dt>Mais sobre ela</dt><dd>{m.descricao}</dd></>}
        </dl>
      ) : m.descricao && m.tipo !== "receita" ? (
        <p className="mv-texto">{m.descricao}</p>
      ) : null}
      {m.tipo !== "receita" && !m.descricao && !x.porque && !x.lembranca && !x.quemOuvia && !x.momento && (
        <p className="mv-convite">Ainda sem a história. <Link className="btn-l" para={editar}>Contar agora</Link></p>
      )}

      {m.tipo === "video" && x.contexto && <p className="mv-texto"><b>O que acontecia:</b> {x.contexto}</p>}

      {/* receita: a mesma folha de caderno em que foi escrita */}
      {m.tipo === "receita" && <FolhaLida m={m} completar={<Link className="btn-l" para={editar}>Completar</Link>} />}

      {pessoas.length > 0 && (
        <section className="mv-sec" aria-labelledby="mv-pessoas">
          <h2 id="mv-pessoas" className="mv-h2">{m.tipo === "musica" || m.tipo === "receita" ? "Pessoas ligadas a ela" : "Quem aparece"}</h2>
          <ul className="chips">{pessoas.map((p) => <li key={p}><Avatar id={p} tam={32} />{pessoa(p).nome}</li>)}</ul>
        </section>
      )}

      {/* comentários: os mesmos do feed, guardados e usados pela IA como contexto desta memória */}
      {onComentar && (
        <section className="mv-sec" aria-labelledby="mv-coms">
          <h2 id="mv-coms" className="mv-h2">Comentários</h2>
          <Reacoes coms={coms} rotulo={`Ações para ${tituloDe(m)}`} onComentar={comentarAgora} onReagir={(t) => onReagir(xi, t)} />
          <Comentarios x={xi} sobre="esta memória" coms={coms} aberto focar={false}
            onComentar={(texto) => onComentar(xi, texto, "comentario")} onApagar={onApagarComentario} />
        </section>
      )}

      {anexos.length > 0 && (
        <section className="mv-sec" aria-labelledby="mv-anexos">
          <h2 id="mv-anexos" className="mv-h2">Junto com ela</h2>
          <ul className="an-lista">
            {anexos.map((it) => <li key={it.arq}>{it.tipo === "audio" ? <Midia arq={it.arq} tipo="audio" rotulo="Áudio" /> : <Miniatura arq={it.arq} />}</li>)}
          </ul>
        </section>
      )}

      <div className="mv-fim">
        {apagando ? (
          <div className="fe-confirma" role="alert">
            <p>Apagar “{tituloDe(m)}” com {principais.length > 1 ? "todas as fotos" : "os arquivos"}? Não dá para desfazer.</p>
            <button type="button" className="btn btn-p btn-sm" onClick={apagar}><Icone nome="lixo" />Sim, apagar</button>
            <button type="button" className="btn-l" onClick={() => setApagando(false)}>Não, manter</button>
          </div>
        ) : (
          <button type="button" className="btn-l mv-apagar" onClick={() => setApagando(true)}><Icone nome="lixo" />Apagar esta memória</button>
        )}
      </div>

    </div>
  );
}
