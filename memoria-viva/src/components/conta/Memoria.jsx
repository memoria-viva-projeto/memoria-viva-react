import { useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { BotaoOuvir } from "./voz.jsx";
import { Janela } from "./campos.jsx";
import { FotoMarcada, pessoasDe } from "./pessoas.jsx";
import { Midia, Miniatura } from "./midia.jsx";
import { Link, ROTAS, conversarSobre } from "./rotas.jsx";
import { SOBRE } from "./conversa.js";
import { PlayerYoutube, youtubeDe } from "./youtube.jsx";
import { FolhaLida } from "./EditorReceita.jsx";
import { pessoa } from "../../dados/conta.js";
import { TIPOS, apagarMemoria, capaDe, resumo, textoQuando, textoRegistro, tituloDe } from "./guardados.js";

const nomes = (refs) => refs.map((p) => pessoa(p).nome).join(", ");

/** Uma foto com o botão de mostrar quem está nela, como nas redes sociais. */
function FotoComPessoas({ it, alt }) {
  const [mostrar, setMostrar] = useState(false);
  const comLugar = it.marcas.some((k) => k.x != null);
  return (
    <div className="mv-foto">
      <FotoMarcada arq={it.arq} alt={alt} marcas={it.marcas} mostrar={mostrar} />
      {comLugar && (
        <button type="button" className={`btn btn-s btn-sm mv-mostrar${mostrar ? " on" : ""}`} aria-pressed={mostrar} onClick={() => setMostrar(!mostrar)}>
          <Icone nome="marcar" />{mostrar ? "Esconder os nomes" : "Mostrar quem está na foto"}
        </button>
      )}
    </div>
  );
}

/** Uma foto do álbum em tela cheia: legenda, data, local, pessoas e observações dela. */
function VerFoto({ m, k, onIr }) {
  const it = m.itens[k];
  const fotos = m.itens.filter((x) => x.tipo === "foto");
  const n = fotos.indexOf(it);
  const data = textoQuando(it) || textoQuando(m);
  const lugar = it.lugar || m.lugar;
  return (
    <div className="vf">
      <FotoComPessoas it={it} alt={it.legenda || `Foto ${n + 1} de “${m.titulo}”`} />
      {it.legenda && <p className="vf-leg">{it.legenda}</p>}
      {(data || lugar) && <p className="mv-meta">{[data, lugar].filter(Boolean).join(" · ")}</p>}
      {it.marcas.length > 0 && <p><b>Nesta foto:</b> {nomes(it.marcas.map((x) => x.p))}</p>}
      {it.observacao && <p className="mv-texto">{it.observacao}</p>}
      <div className="fe-nav">
        <button type="button" className="btn btn-s" disabled={n === 0} onClick={() => onIr(m.itens.indexOf(fotos[n - 1]))}><Icone nome="voltar" />Anterior</button>
        <span>{n + 1} de {fotos.length}</span>
        <button type="button" className="btn btn-s" disabled={n === fotos.length - 1} onClick={() => onIr(m.itens.indexOf(fotos[n + 1]))}>Próxima<Icone nome="seguir" /></button>
      </div>
    </div>
  );
}

/** Ver uma memória guardada, do jeito de cada tipo. */
export default function Memoria({ id, guardadas, carregou, onApagada }) {
  const [aberta, setAberta] = useState(null);
  const [apagando, setApagando] = useState(false);
  const [vendo, setVendo] = useState(0);
  const m = guardadas.find((g) => g.id === id);

  if (!m) {
    return (
      <div className="c-wrap mv">
        <Link className="btn-l hs-voltar" para={ROTAS.historia}><Icone nome="voltar" />Sua história</Link>
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
  const leitura = [tituloDe(m), x.artista, data, m.lugar, m.descricao, x.porque, x.lembranca, x.quemOuvia, x.momento, x.contexto].filter(Boolean).join(". ");

  const apagar = async () => {
    await apagarMemoria(m.id);
    onApagada(m.id);
  };

  return (
    <div className={`c-wrap mv mv-t-${m.tipo}`}>
      <Link className="btn-l hs-voltar" para={ROTAS.historia}><Icone nome="voltar" />Sua história</Link>

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
      {m.tipo === "album" && principais.length > 0 && (
        <div className="mv-principal" aria-hidden="true">
          <span className={`cg-fotos${principais.length > 2 ? " cg-pilha" : ""}`}>
            {principais.length > 2 && principais.filter((it) => it.arq !== capaDe(m)).slice(0, 2).map((it) => (
              <span key={it.arq} className="foto cg-atras"><Miniatura arq={it.arq} /></span>
            ))}
            <span className="foto cg-frente"><Miniatura arq={capaDe(m)} /></span>
          </span>
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
        <Link className="btn btn-s btn-sm" para={conversarSobre(m.id)}><Icone nome="conversar" />Conversar sobre {SOBRE[m.tipo]}</Link>
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

      {m.tipo === "album" && (
        <section className="mv-sec" aria-labelledby="mv-fotos">
          <h2 id="mv-fotos" className="mv-h2">As fotos</h2>
          <p className="ed-dica">Toque numa foto para ver maior, com a legenda e quem aparece.</p>
          <ul className="gl-grade mv-grade">
            {principais.map((it, k) => (
              <li key={it.arq}>
                <button type="button" className="gl-it" onClick={() => setAberta(m.itens.indexOf(it))}>
                  <Miniatura arq={it.arq} />
                  {(it.legenda || it.marcas.length > 0) && (
                    <span className="gl-info" aria-hidden="true">
                      {it.legenda && <Icone nome="comentar" tam={16} />}
                      {it.marcas.length > 0 && <><Icone nome="marcar" tam={16} />{it.marcas.length}</>}
                    </span>
                  )}
                  <span className="sr">Foto {k + 1}{it.legenda ? `: ${it.legenda}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
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

      <Janela id="mv-foto" className="fe" aberta={aberta !== null} onFechar={() => setAberta(null)} titulo={tituloDe(m)}>
        {aberta !== null && m.itens[aberta] && <VerFoto m={m} k={aberta} onIr={setAberta} />}
      </Janela>
    </div>
  );
}
