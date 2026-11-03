import { useMemo, useState } from "react";
import Icone from "./Icone.jsx";
import Adesivo from "../Adesivo.jsx";
import { Midia, Publicacao } from "./Feed.jsx";
import { Filtros, VistaCategoria } from "./Biblioteca.jsx";
import { Janela } from "./campos.jsx";
import { sugestoesPessoas } from "./pessoas.jsx";
import { Miniatura } from "./midia.jsx";
import { chaveDaFoto, fotosDe, salvarMemoria } from "./guardados.js";
import { CATEGORIAS, FILTRO_VAZIO, contarPorCategoria, filtrar, filtroAtivo, juntarMemorias, naCategoria } from "./memorias.js";
import { Link, ROTAS } from "./rotas.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";

const plural = (n) => `${n} ${n === 1 ? "memória" : "memórias"}`;
const PASTAS = new Set(CATEGORIAS.map(([k]) => k));

/** A capinha de uma pasta: a primeira memória com imagem daquela categoria (ou o ícone). "Todas": um mosaico de quatro. */
function CapaPasta({ itens, icone, mosaico }) {
  const comImagem = itens.filter((x) => x.foto || x.arq);
  if (mosaico && comImagem.length >= 4) {
    return <span className="mm-pasta-capa mm-mosaico" aria-hidden="true">{comImagem.slice(0, 4).map((x) => <Midia key={x.id} x={x} mini />)}</span>;
  }
  return (
    <span className="mm-pasta-capa" aria-hidden="true">
      {comImagem[0] ? <Midia x={comImagem[0]} mini /> : <span className="mm-pasta-ic"><Icone nome={icone} tam={30} /></span>}
    </span>
  );
}

const nomeDe = (id) => (id === CONTA.pessoa.id ? CONTA.pessoa.nome : pessoa(id).nome);

/**
 * A lateral do feed no computador (a partir de 1200 px; no celular ela não aparece): poucas coisas, todas de verdade e
 * nenhuma repetida das publicações. Uma lembrança antiga para rever (muda a cada dia), os álbuns para folhear e
 * o último comentário escrito numa foto de álbum (esses não aparecem no feed).
 */
function LadoDoFeed({ itens, comentarios }) {
  const dia = Math.floor(Date.now() / 864e5);
  const comImagem = itens.filter((x) => (x.foto || x.arq) && x.tipo !== "conselho");
  // as mais antigas primeiro (sem data por último); entre as cinco mais antigas, uma por dia
  const antigas = [...comImagem].sort((a, b) => (a.tempo.anos[0] ?? a.tempo.decadas[0] ?? 9999) - (b.tempo.anos[0] ?? b.tempo.decadas[0] ?? 9999));
  const rever = antigas.length ? antigas[dia % Math.min(5, antigas.length)] : null;
  const albuns = itens.filter((x) => x.tipo === "album" && x.fonte === "guardada").slice(0, 3);
  // o último comentário de uma pessoa numa foto de álbum, com a foto e o álbum de onde veio
  const naFoto = comentarios.filter((c) => c.foto && c.tipo === "comentario" && c.origem === "pessoa" && c.texto)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .map((c) => {
      const x = itens.find((y) => y.id === c.memoria && y.fonte === c.fonte);
      const fotos = x ? fotosDe(x.m) : [];
      const k = fotos.findIndex((it) => chaveDaFoto(it) === c.foto);
      return x && k >= 0 ? { c, x, it: fotos[k], k } : null;
    }).find(Boolean);
  if (!rever && !albuns.length && !naFoto) return null;
  return (
    <aside className="mm-lado" aria-label="Para rever">
      {rever && (
        <section className="mm-lado-bloco">
          <h2 className="mao mm-lado-t">para rever</h2>
          <Adesivo nome="ramo_de_folhas" className="ad-rever" />
          <a className="mm-lado-rever" href={`#mem-${rever.id}`}>
            <span className="foto mm-lado-foto"><span className="tape t-gema" aria-hidden="true" /><Midia x={rever} mini /></span>
            <b>{rever.titulo}</b>
            {rever.quando && <span>{rever.quando}</span>}
          </a>
        </section>
      )}
      {albuns.length > 0 && (
        <section className="mm-lado-bloco">
          <h2 className="mao mm-lado-t">seus álbuns</h2>
          <ul className="mm-lado-albuns">
            {albuns.map((x) => (
              <li key={x.id}>
                <Link className="mm-lado-album" para={`${ROTAS.memoria}/${x.id}`}>
                  <span className="mm-lado-capa" aria-hidden="true"><Midia x={x} mini /></span>
                  <span><b>{x.titulo}</b>{x.quando && <span>{x.quando}</span>}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {naFoto && (
        <section className="mm-lado-bloco">
          <h2 className="mao mm-lado-t">escrito numa foto</h2>
          <Link className="mm-lado-bilhete" para={`${ROTAS.memoria}/${naFoto.x.id}`}>
            <span className="mm-lado-mini" aria-hidden="true"><Miniatura arq={naFoto.it.arq} /></span>
            <span className="mm-lado-txt">“{naFoto.c.texto}”</span>
            <span className="mm-lado-de">{nomeDe(naFoto.c.autor)}, na foto {naFoto.k + 1} de {naFoto.x.titulo}</span>
          </Link>
        </section>
      )}
    </aside>
  );
}

/**
 * Minhas memórias, em duas formas que se completam:
 * - Feed: todas em sequência, como numa rede social (publicação com pessoas, comentários, detalhes).
 * - Biblioteca: pastas por tipo → o conteúdo da pasta do jeito dele (estante de álbuns, fichas de receita...) → a memória.
 * Os filtros (ano, década, intervalo, fase da vida, ocasião, pessoa) valem para as duas.
 * Aba e pasta ficam no endereço (?aba=biblioteca&pasta=albuns): voltar de um álbum cai no mesmo lugar.
 */
export default function Historia({ memorias, guardadas, comentarios, onComentar, onReagir, onApagarComentario, onConfirmar, onMudarMemoria, onGuardada, onAviso, onExcluir, onEditarDemo }) {
  const q = new URLSearchParams(window.location.search);
  const [aba, setAbaEstado] = useState(q.get("aba") === "biblioteca" ? "biblioteca" : "feed");
  const [pasta, setPastaEstado] = useState(PASTAS.has(q.get("pasta")) ? q.get("pasta") : null);
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [aberta, setAberta] = useState(null); // memória aberta por cima (as da demonstração não têm página própria)
  const itens = useMemo(() => juntarMemorias(memorias, guardadas), [memorias, guardadas]);
  const filtrados = filtrar(itens, filtro);
  const n = contarPorCategoria(filtrados);
  const pastas = CATEGORIAS.filter(([k]) => n[k] > 0);

  const lembrar = (endereco) => window.history.replaceState(window.history.state, "", endereco);
  const setAba = (a) => { setAbaEstado(a); setPastaEstado(null); lembrar(a === "biblioteca" ? `${ROTAS.historia}?aba=biblioteca` : ROTAS.historia); };
  const setPasta = (p) => { setPastaEstado(p); lembrar(`${ROTAS.historia}?aba=biblioteca${p ? `&pasta=${p}` : ""}`); window.scrollTo(0, 0); };

  // quem está: na demonstração muda na tela; numa memória guardada, fica guardado no aparelho
  const mudarPessoas = (x) => (refs, confirmadas) => {
    if (x.fonte === "demo") { onMudarMemoria(x.id)((m) => ({ ...m, pessoas: refs, pessoasConfirmadas: confirmadas })); return; }
    const m = {
      ...x.m, pessoas: refs, pessoasConfirmadas: confirmadas,
      itens: x.m.itens.map((it) => ({ ...it, marcas: (it.marcas || []).filter((k) => refs.includes(k.p)) })),
    };
    salvarMemoria(m).then(() => onGuardada(m)).catch(() => onAviso("Não deu para guardar neste aparelho. O espaço pode ter acabado."));
  };
  const publicacao = (x) => (
    <Publicacao key={`${x.fonte}-${x.id}`} x={x} guardados={comentarios} sugestoes={sugestoesPessoas(x.m, guardadas)}
      onComentar={(texto, foto) => onComentar(x, texto, "comentario", foto)} onReagir={(tipo, foto) => onReagir(x, tipo, foto)} onApagar={onApagarComentario}
      onConfirmar={onConfirmar} onMudarPessoas={mudarPessoas(x)} onAviso={onAviso}
      onExcluir={() => onExcluir(x)} onEditar={(campos) => onEditarDemo(x.id, campos)} />
  );
  // a memória aberta por cima acompanha as mudanças (comentários, pessoas)
  const abertaAgora = aberta && itens.find((x) => x.id === aberta.id && x.fonte === aberta.fonte);
  const vazio = filtroAtivo(filtro)
    ? <p className="hs-vazio">Nenhuma memória com esses filtros. <button type="button" className="btn-l" onClick={() => setFiltro(FILTRO_VAZIO)}>Limpar os filtros</button></p>
    : <p className="hs-vazio">Ainda não há memórias aqui. Toque em “Guardar” para começar.</p>;

  return (
    <div className="c-wrap mm">
      <header className="mm-topo">
        <h1 className="mm-titulo-pg" tabIndex={-1}>Minhas memórias<Adesivo nome="casinha_colorida" className="junto ad-memorias" /></h1>
        <p>{plural(itens.length)} guardadas.</p>
      </header>

      {itens.length === 0 ? (
        <p className="hs-vazio">Ainda não há lembranças guardadas. Toque em “Guardar” para começar.</p>
      ) : (
        <>
          <div className="mm-abas" role="group" aria-label="Como ver">
            <button type="button" className={`mm-aba${aba === "feed" ? " on" : ""}`} aria-pressed={aba === "feed"} onClick={() => setAba("feed")}>
              <Icone nome="memorias" tam={22} /><span><b>Feed</b><span>todas em sequência</span></span>
            </button>
            <button type="button" className={`mm-aba${aba === "biblioteca" ? " on" : ""}`} aria-pressed={aba === "biblioteca"} onClick={() => setAba("biblioteca")}>
              <Icone nome="album" tam={22} /><span><b>Biblioteca</b><span>por pastas e álbuns</span></span>
            </button>
          </div>

          <Filtros itens={itens} f={filtro} onMudar={setFiltro} />

          {aba === "feed" && (
            filtrados.length ? (
              <div className="mm-feed-lado">
                <div className="mm-feed">{filtrados.map(publicacao)}</div>
                <LadoDoFeed itens={itens} comentarios={comentarios} />
              </div>
            ) : vazio
          )}

          {aba === "biblioteca" && !pasta && (
            pastas.length ? (
              <nav aria-label="Pastas de memórias">
                <ul className="mm-estante">
                  {pastas.map(([k, nome, icone]) => (
                    <li key={k}>
                      <button type="button" className="mm-pasta" onClick={() => setPasta(k)}>
                        <CapaPasta itens={naCategoria(filtrados, k)} icone={icone} mosaico={k === "todas"} />
                        <span className="mm-pasta-txt"><b>{nome}</b><span>{plural(n[k])}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : vazio
          )}

          {aba === "biblioteca" && pasta && (
            <section aria-labelledby="mm-pasta-t" className="mm-dentro">
              <button type="button" className="btn-l mm-voltar" onClick={() => setPasta(null)}><Icone nome="voltar" />Biblioteca</button>
              <h2 id="mm-pasta-t" className="mm-barra-t">{CATEGORIAS.find(([k]) => k === pasta)[1]} <span>· {plural(n[pasta])}</span></h2>
              {n[pasta] ? <VistaCategoria cat={pasta} itens={naCategoria(filtrados, pasta)} onAbrir={setAberta} /> : vazio}
            </section>
          )}
        </>
      )}

      <Janela id="mm-aberta" className="mm-janela" aberta={!!abertaAgora} onFechar={() => setAberta(null)} titulo={abertaAgora?.titulo || ""}>
        {abertaAgora && publicacao(abertaAgora)}
      </Janela>
    </div>
  );
}
