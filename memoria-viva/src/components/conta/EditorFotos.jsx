import { useState } from "react";
import Icone from "./Icone.jsx";
import { TextoLivre } from "./campos.jsx";
import { ComVoz } from "./voz.jsx";
import { MarcarPessoas } from "./pessoas.jsx";
import { FotoInteira, Miniatura } from "./midia.jsx";
import { Andamento, BotaoArquivos, ZonaArquivos } from "./arquivos.jsx";
import Detalhes from "./Detalhes.jsx";
import Galeria from "./Galeria.jsx";
import { capaDe, ehCheio, girarFoto, modoData, prepararFoto } from "./guardados.js";

const fotosDe = (m) => m.itens.filter((it) => !it.anexo && it.tipo === "foto");
const mover = (lista, de, para) => { const l = [...lista]; const [x] = l.splice(de, 1); l.splice(para, 0, x); return l; };

/** Título e história, escritos direto na página. Nada aqui é obrigatório. */
export function TituloEHistoria({ m, mudar, rotulo = "Título", exemplo, rotuloHistoria = "A história", exemploHistoria }) {
  return (
    <>
      <div className="ge-campo">
        <label className="ge-rot" htmlFor="ge-titulo">{rotulo} <span className="ed-marca">(opcional)</span></label>
        <ComVoz rotulo={rotulo} valor={m.titulo} onMudar={(v) => mudar({ titulo: v })}>
          <input id="ge-titulo" className="ge-titulo" type="text" maxLength={120} value={m.titulo} placeholder={exemplo}
            onChange={(e) => mudar({ titulo: e.target.value })} autoComplete="off" />
        </ComVoz>
      </div>
      <div className="ge-campo">
        <label className="ge-rot" htmlFor="ge-desc">{rotuloHistoria} <span className="ed-marca">(opcional)</span></label>
        <ComVoz rotulo={rotuloHistoria} valor={m.descricao} onMudar={(v) => mudar({ descricao: v })}>
          <TextoLivre id="ge-desc" className="ge-texto" valor={m.descricao} onMudar={(v) => mudar({ descricao: v })} maxLength={4000} linhas={3}
            placeholder={exemploHistoria} />
        </ComVoz>
      </div>
    </>
  );
}

// ---- ajustes de uma foto (valem na foto e no álbum) ----

/** Gira 90°: as marcações acompanham a foto, e os comentários também (a chave dela não muda). */
async function girar(mudar, it) {
  const a = await girarFoto(it.arq);
  mudar((x) => ({
    ...x, capa: x.capa === it.arq ? a.id : x.capa,
    itens: x.itens.map((y) => (y.arq === it.arq ? { ...y, id: y.id || y.arq, arq: a.id, marcas: y.marcas.map((k) => (k.x == null ? k : { ...k, x: 1 - k.y, y: k.x })) } : y)),
  }));
  return a.id;
}

/** Troca a foto por outra: as pessoas continuam, mas sem lugar (a foto nova é outra). */
async function trocar(mudar, it, arquivo) {
  const a = await prepararFoto(arquivo);
  mudar((x) => ({
    ...x, capa: x.capa === it.arq ? a.id : x.capa,
    itens: x.itens.map((y) => (y.arq === it.arq ? { ...y, arq: a.id, marcas: y.marcas.map((k) => ({ ...k, x: null, y: null })) } : y)),
  }));
  return a.id;
}

function useAjuste() {
  const [ocupado, setOcupado] = useState("");
  const [feito, setFeito] = useState("");
  const fazer = async (nome, fn, msg) => {
    setOcupado(nome); setFeito("");
    try { const r = await fn(); setFeito(msg); return r; }
    catch (e) { setFeito(ehCheio(e) ? "Não há mais espaço neste aparelho." : "Não deu. Tente de novo."); return null; }
    finally { setOcupado(""); }
  };
  return { ocupado, feito, fazer };
}

// ---- fotografia ----

function PrepararFoto({ m, mudar, arquivos }) {
  const [vendo, setVendo] = useState(0);
  const aj = useAjuste();
  const fotos = fotosDe(m);
  if (!fotos.length) {
    return <ZonaArquivos className="zn-foto" arquivos={arquivos} />;
  }
  const atual = fotos[Math.min(vendo, fotos.length - 1)];
  const k = fotos.indexOf(atual);
  return (
    <div className="pf">
      <div className="pf-palco"><FotoInteira arq={atual.arq} alt={m.titulo || `Foto ${k + 1}`} /></div>
      {fotos.length > 1 && (
        <ul className="ea-tira" aria-label="Fotos desta lembrança">
          {fotos.map((it, j) => (
            <li key={it.arq}>
              <button type="button" className="ea-tira-it" aria-pressed={it === atual} onClick={() => setVendo(j)}>
                <Miniatura arq={it.arq} /><span className="sr">Ver a foto {j + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pf-acoes">
        <button type="button" className="btn btn-s btn-sm" disabled={!!aj.ocupado} onClick={() => aj.fazer("girar", () => girar(mudar, atual), "Foto girada.")}>
          <Icone nome="trocar" />{aj.ocupado === "girar" ? "Girando…" : "Girar"}
        </button>
        <BotaoArquivos className="btn btn-s btn-sm" rotulo="Trocar a foto" icone="enviarfoto" disabled={!!aj.ocupado}
          onArquivos={(fs) => fs[0] && aj.fazer("trocar", () => trocar(mudar, atual, fs[0]), "Foto trocada.")} />
        <BotaoArquivos className="btn btn-s btn-sm" rotulo="Juntar outra foto" icone="mais" multiple disabled={!!arquivos.proc}
          onArquivos={async (fs) => { const n = await arquivos.juntar(fs); if (n.length) setVendo(fotos.length); }} />
        {fotos.length > 1 && (
          <button type="button" className="btn-l" onClick={() => { mudar((x) => ({ ...x, itens: x.itens.filter((it) => it.arq !== atual.arq) })); setVendo(0); }}>
            <Icone nome="lixo" />Tirar esta
          </button>
        )}
      </div>
      <p className="pf-feito" role="status">{aj.feito}</p>
      <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
    </div>
  );
}

function HistoriaFoto({ m, mudar, sugestoes }) {
  return (
    <>
      <TituloEHistoria m={m} mudar={mudar} exemplo="Ex.: Domingo no quintal da vó" exemploHistoria="Quem estava, o que vocês faziam, o que você sentiu…" />
      <Detalhes m={m} mudar={mudar} sugestoes={sugestoes} comPessoas={false} />
    </>
  );
}

function PessoasFoto({ m, mudar, sugestoes }) {
  const [vendo, setVendo] = useState(0);
  const fotos = fotosDe(m);
  const atual = fotos[Math.min(vendo, fotos.length - 1)];
  if (!atual) return <p className="ed-dica">Escolha uma foto primeiro.</p>;
  const mudarAtual = (campos) => mudar((x) => ({ ...x, itens: x.itens.map((it) => (it.arq === atual.arq ? { ...it, ...campos } : it)) }));
  return (
    <div className="pp">
      {fotos.length > 1 && (
        <ul className="ea-tira" aria-label="Escolha a foto">
          {fotos.map((it, j) => (
            <li key={it.arq}>
              <button type="button" className="ea-tira-it" aria-pressed={it === atual} onClick={() => setVendo(j)}>
                <Miniatura arq={it.arq} /><span className="sr">Foto {j + 1}</span>
                {it.marcas.length > 0 && <span className="ea-tira-n">{it.marcas.length}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <MarcarPessoas key={atual.arq} id="pp-marcar" arq={atual.arq} alt={m.titulo || "A foto"} marcas={atual.marcas}
        onMudar={(marcas) => mudarAtual({ marcas })} sugestoes={sugestoes} />
      {fotos.length > 1 && (
        <div className="ge-campo">
          <label className="ge-rot" htmlFor="pp-legenda">Legenda desta foto <span className="ed-marca">(opcional)</span></label>
          <ComVoz rotulo="Legenda desta foto" valor={atual.legenda} onMudar={(legenda) => mudarAtual({ legenda })}>
            <TextoLivre id="pp-legenda" className="ge-texto" valor={atual.legenda} onMudar={(legenda) => mudarAtual({ legenda })} maxLength={300}
              placeholder="Só se esta foto tiver algo próprio para contar." />
          </ComVoz>
        </div>
      )}
    </div>
  );
}

// ---- álbum ----

/** Organizar: a grade com todas as fotos. Tocar numa foto mostra o que dá para fazer com ela. */
function OrganizarAlbum({ m, mudar, arquivos }) {
  const [sel, setSel] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const aj = useAjuste();
  const fotos = m.itens;
  if (!fotos.length) {
    return <ZonaArquivos className="zn-album" varias arquivos={arquivos} />;
  }
  const capa = capaDe(m);
  const k = fotos.findIndex((it) => it.arq === sel);
  const atual = fotos[k];
  const reordenar = (de, para) => mudar((x) => ({ ...x, itens: mover(x.itens, de, para) }));

  return (
    <div className="og">
      <div className="og-topo">
        <p className="gl-conta">{fotos.length} {fotos.length === 1 ? "foto" : "fotos"}</p>
        <BotaoArquivos className="btn btn-s btn-sm" rotulo="Juntar mais fotos" icone="mais" multiple disabled={!!arquivos.proc} onArquivos={(fs) => arquivos.juntar(fs)} />
      </div>
      <p className="ed-dica">Toque numa foto para fazer dela a capa, girar ou mudar de lugar.<span className="gl-arraste"> No computador, dá para arrastar.</span></p>
      <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
      <ul className="gl-grade og-grade">
        {fotos.map((it, j) => (
          <li key={it.arq} draggable className={`${alvo === j && arrastando !== null && arrastando !== j ? "gl-alvo" : ""}${arrastando === j ? " gl-movendo" : ""}`}
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(j)); e.dataTransfer.effectAllowed = "move"; setArrastando(j); }}
            onDragOver={(e) => { if (arrastando !== null) { e.preventDefault(); setAlvo(j); } }}
            onDrop={(e) => { if (arrastando !== null) { e.preventDefault(); reordenar(arrastando, j); } setArrastando(null); setAlvo(null); }}
            onDragEnd={() => { setArrastando(null); setAlvo(null); }}>
            <button type="button" className={`gl-it${sel === it.arq ? " on" : ""}`} aria-pressed={sel === it.arq} onClick={() => setSel(sel === it.arq ? null : it.arq)}>
              <Miniatura arq={it.arq} />
              <span className="og-n" aria-hidden="true">{j + 1}</span>
              {capa === it.arq && <span className="gl-capa"><Icone nome="estrela" tam={16} />Capa</span>}
              <span className="sr">Foto {j + 1}{capa === it.arq ? ", capa do álbum" : ""}</span>
            </button>
          </li>
        ))}
      </ul>

      {atual && (
        <div className="og-acoes" role="group" aria-label={`Foto ${k + 1}`}>
          <p><b>Foto {k + 1}</b> de {fotos.length}</p>
          <div className="og-bt">
            {capa === atual.arq ? <span className="fe-ecapa"><Icone nome="estrela" />É a capa</span>
              : <button type="button" className="btn btn-s btn-sm" onClick={() => mudar({ capa: atual.arq })}><Icone nome="estrela" />Usar como capa</button>}
            <button type="button" className="btn btn-s btn-sm" disabled={!!aj.ocupado}
              onClick={async () => { const n = await aj.fazer("girar", () => girar(mudar, atual), "Foto girada."); if (n) setSel(n); }}>
              <Icone nome="trocar" />{aj.ocupado ? "Girando…" : "Girar"}
            </button>
            <button type="button" className="btn btn-s btn-sm" disabled={k === 0} onClick={() => reordenar(k, k - 1)}><Icone nome="voltar" />Antes</button>
            <button type="button" className="btn btn-s btn-sm" disabled={k === fotos.length - 1} onClick={() => reordenar(k, k + 1)}>Depois<Icone nome="seguir" /></button>
            <button type="button" className="btn btn-s btn-sm" onClick={() => { mudar((x) => ({ ...x, itens: x.itens.filter((it) => it.arq !== atual.arq), capa: x.capa === atual.arq ? null : x.capa })); setSel(null); }}>
              <Icone nome="lixo" />Tirar
            </button>
          </div>
          <p className="pf-feito" role="status">{aj.feito}</p>
        </div>
      )}
    </div>
  );
}

function HistoriaAlbum({ m, mudar, sugestoes }) {
  return (
    <>
      <TituloEHistoria m={m} mudar={mudar} rotulo="Nome do álbum" exemplo="Ex.: Natal em família, 2008" rotuloHistoria="Sobre o álbum"
        exemploHistoria="Ex.: Fotos do Natal na casa da minha avó. Foi uma das últimas vezes em que todos estiveram juntos." />
      <Detalhes m={m} mudar={mudar} sugestoes={sugestoes} rotulos={{ pessoas: "Quem aparece?", legendaPessoas: "Quem aparece nas fotos" }} />
      <p className="ed-dica">Vale para todas as fotos. Não precisa repetir em cada uma.</p>
    </>
  );
}

function FotosDoAlbum({ m, mudar, sugestoes, arquivos }) {
  return <Galeria m={m} mudar={mudar} sugestoes={sugestoes} arquivos={arquivos} organizar={false} />;
}

/** Foto ou álbum à mostra ao lado dos campos. */
export function VitrineFotos({ m }) {
  const fotos = fotosDe(m);
  if (!fotos.length) return null;
  if (m.tipo === "album" && fotos.length > 1) {
    const capa = capaDe(m);
    return (
      <span className={`cg-fotos${fotos.length > 2 ? " cg-pilha" : ""}`}>
        {fotos.length > 2 && fotos.filter((it) => it.arq !== capa).slice(0, 2).map((it) => <span key={it.arq} className="foto cg-atras"><Miniatura arq={it.arq} /></span>)}
        <span className="foto cg-frente"><Miniatura arq={capa} alt="Capa do álbum" /></span>
      </span>
    );
  }
  return <FotoInteira arq={capaDe(m)} alt={m.titulo || "A foto"} />;
}

const temFoto = (m) => fotosDe(m).length > 0;
const temTexto = (m) => !!(m.titulo || m.descricao || modoData(m.data) || m.etiquetas?.length || m.lugar);

// Cada passo: id, título (a pergunta da tela), corpo, se precisa de conteúdo para seguir, e se já tem algo.
export const PASSOS_FOTO = [
  { id: "foto", titulo: (m) => (temFoto(m) ? "Sua foto" : "Escolha sua fotografia"), Corpo: PrepararFoto, essencial: true, feito: temFoto },
  { id: "historia", titulo: "Conte a história", dica: "Se não quiser escrever agora, toque em “Pular”.", Corpo: HistoriaFoto, lado: true, feito: temTexto },
  { id: "pessoas", titulo: "Quem aparece?", dica: "Toque em “Marcar pessoas na foto” e depois no rosto de cada um.", Corpo: PessoasFoto, feito: (m) => fotosDe(m).some((it) => it.marcas.length) },
];

export const PASSOS_ALBUM = [
  { id: "fotos", titulo: (m) => (m.itens.length ? "Organize as fotos" : "Escolha suas fotografias"), Corpo: OrganizarAlbum, essencial: true, feito: temFoto },
  { id: "historia", titulo: "Sobre o álbum", dica: "Conte uma vez só. Se não quiser agora, toque em “Pular”.", Corpo: HistoriaAlbum, lado: true, feito: (m) => temTexto(m) || m.pessoas.length > 0 },
  { id: "pessoas", titulo: "Pessoas e legendas", dica: "Opcional. Toque numa foto para marcar quem aparece ou escrever uma legenda. Para várias de uma vez, use “Selecionar várias”.",
    Corpo: FotosDoAlbum, feito: (m) => m.itens.some((it) => it.marcas.length || it.legenda) },
];
