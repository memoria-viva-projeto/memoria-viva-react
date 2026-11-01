import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { Campo, CampoData, EtiquetasTempo, Janela, TextoLivre, erroData } from "./campos.jsx";
import { EscolherPessoas, MarcarPessoas } from "./pessoas.jsx";
import { Miniatura } from "./midia.jsx";
import { ComVoz } from "./voz.jsx";
import { Andamento, BotaoArquivos } from "./arquivos.jsx";
import { dataVazia, ehCheio, prepararFoto, textoData, textoQuando } from "./guardados.js";

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const dataOuNada = (d) => (d && (d.ano || d.mes || d.decada || d.naoSei) ? d : null);
const mover = (lista, de, para) => {
  const l = [...lista];
  const [x] = l.splice(de, 1);
  l.splice(para, 0, x);
  return l;
};

/** Uma foto do álbum aberta grande: marcar pessoas, legenda e, se quiser, data, local e observações só dela. */
function Visor({ m, k, mudarItem, onIr, onMover, onTirar, onCapa, sugestoes, organizar }) {
  const it = m.itens[k];
  const [mais, setMais] = useState(!!(it.data || it.etiquetas?.length || it.lugar || it.observacao));
  const [tirando, setTirando] = useState(false);
  const [erro, setErro] = useState("");
  const mudar = (campos) => mudarItem(it.arq, campos);
  const total = m.itens.length;

  // setas do teclado passam as fotos (quando não se está escrevendo)
  useEffect(() => {
    const tecla = (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
      if (e.key === "ArrowRight" && k < total - 1) onIr(k + 1);
      if (e.key === "ArrowLeft" && k > 0) onIr(k - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [k, total, onIr]);

  const substituir = async (fs) => {
    if (!fs[0]) return;
    try {
      const a = await prepararFoto(fs[0]);
      // as pessoas continuam marcadas, mas sem lugar (a foto nova pode ser diferente)
      mudar({ arq: a.id, marcas: it.marcas.map((x) => ({ ...x, x: null, y: null })) });
      if (m.capa === it.arq) onCapa(a.id);
      setErro("");
    } catch (er) {
      setErro(ehCheio(er) ? "Não há mais espaço neste aparelho." : "Não deu para abrir essa foto. Tente outra.");
    }
  };

  return (
    <div className="fe-corpo">
      <MarcarPessoas key={it.arq} id={`fe-${k}`} arq={it.arq} alt={it.legenda || `Foto ${k + 1} do álbum`}
        marcas={it.marcas} onMudar={(marcas) => mudar({ marcas })} sugestoes={sugestoes} />

      <div className="ed-campo">
        <label htmlFor="fe-legenda">Legenda desta foto <span className="ed-marca">(opcional)</span></label>
        <ComVoz rotulo="Legenda desta foto" valor={it.legenda} onMudar={(legenda) => mudar({ legenda })}>
          <TextoLivre id="fe-legenda" className="ge-texto" valor={it.legenda} onMudar={(legenda) => mudar({ legenda })} maxLength={300}
            placeholder="Ex.: A vó cortando o bolo, com os netos em volta." />
        </ComVoz>
      </div>

      {mais ? (
        <div className="fe-mais">
          <CampoData id="fe-data" legenda="Data desta foto" valor={it.data || dataVazia()}
            onMudar={(d) => mudar({ data: d.modo ? d : null })} erro={erroData(it.data)} />
          <p className="ed-dica fe-vale">Em branco, vale o que você disse do álbum{textoQuando(m) ? `: ${textoQuando(m)}` : ""}.</p>
          <EtiquetasTempo id="fe-etiquetas" valor={it.etiquetas} onMudar={(etiquetas) => mudar({ etiquetas })} />
          <Campo id="fe-lugar" rotulo="Local desta foto" marca="opcional" valor={it.lugar} onMudar={(lugar) => mudar({ lugar })}
            dica={`Em branco, vale o local do álbum${m.lugar ? `: ${m.lugar}` : ""}.`} />
          <Campo id="fe-obs" rotulo="Observações" marca="opcional" valor={it.observacao} onMudar={(observacao) => mudar({ observacao })}
            longo linhas={3} max={600} exemplo="Foi a primeira vez que o Thiago viu a vó dançar." />
        </div>
      ) : (
        <button type="button" className="btn-l" onClick={() => setMais(true)}><Icone nome="mais" />Quando, onde e observações só desta foto</button>
      )}

      <div className="fe-acoes">
        {m.capa !== it.arq && !(m.capa == null && k === 0)
          ? <button type="button" className="btn btn-s btn-sm" onClick={() => onCapa(it.arq)}><Icone nome="estrela" />Usar como capa</button>
          : <span className="fe-ecapa"><Icone nome="estrela" />Esta é a capa</span>}
        <BotaoArquivos className="btn btn-s btn-sm" rotulo="Substituir a foto" icone="trocar" onArquivos={substituir} />
        {!tirando && <button type="button" className="btn btn-s btn-sm" onClick={() => setTirando(true)}><Icone nome="lixo" />Tirar do álbum</button>}
      </div>
      {organizar && <div className="fe-ordem" role="group" aria-label="Lugar da foto no álbum">
        <span>Lugar no álbum: <b>{k + 1}ª de {total}</b></span>
        <button type="button" className="btn btn-s btn-sm" disabled={k === 0} onClick={() => onMover(k, k - 1)}><Icone nome="voltar" />Mais para o começo</button>
        <button type="button" className="btn btn-s btn-sm" disabled={k === total - 1} onClick={() => onMover(k, k + 1)}>Mais para o fim<Icone nome="seguir" /></button>
      </div>}
      {erro && <p className="ed-erro" role="alert">{erro}</p>}
      {tirando && (
        <div className="fe-confirma" role="alert">
          <p>Tirar esta foto do álbum?</p>
          <button type="button" className="btn btn-p btn-sm" onClick={() => onTirar([it.arq])}><Icone nome="lixo" />Sim, tirar</button>
          <button type="button" className="btn-l" onClick={() => setTirando(false)}>Não, deixar</button>
        </div>
      )}

      <div className="fe-nav">
        <button type="button" className="btn btn-s" disabled={k === 0} onClick={() => onIr(k - 1)}><Icone nome="voltar" />Anterior</button>
        <span>{k + 1} de {total}</span>
        <button type="button" className="btn btn-s" disabled={k === total - 1} onClick={() => onIr(k + 1)}>Próxima<Icone nome="seguir" /></button>
      </div>
    </div>
  );
}

/** Aplicar uma informação em várias fotos de uma vez. */
function EmLote({ acao, n, comLegenda, onAplicar, sugestoes, albumData }) {
  const [data, setData] = useState(dataVazia());
  const [texto, setTexto] = useState("");
  const [pessoas, setPessoas] = useState([]);
  const fotos = plural(n, "foto", "fotos");

  if (acao === "data") {
    const erro = erroData(data);
    return (
      <div className="lo-form">
        <CampoData id="lote-data" legenda="Data destas fotos" valor={data} onMudar={setData} erro={erro} />
        <button type="button" className="btn btn-p" disabled={!!erro || !dataOuNada(data)}
          onClick={() => onAplicar((it) => ({ ...it, data: dataOuNada(data) }), `Data aplicada em ${fotos}.`)}>
          <Icone nome="certo" />Aplicar em {fotos}
        </button>
        <button type="button" className="btn-l" onClick={() => onAplicar((it) => ({ ...it, data: null }), `${fotos} voltaram a usar a data do álbum.`)}>
          Voltar a usar a data do álbum{albumData ? ` (${albumData})` : ""}
        </button>
      </div>
    );
  }
  if (acao === "lugar") {
    return (
      <div className="lo-form">
        <Campo id="lote-lugar" rotulo="Local destas fotos" valor={texto} onMudar={setTexto} exemplo="Casa da vó, em Campinas" />
        <button type="button" className="btn btn-p" disabled={!texto.trim()}
          onClick={() => onAplicar((it) => ({ ...it, lugar: texto.trim() }), `Local aplicado em ${fotos}.`)}>
          <Icone nome="certo" />Aplicar em {fotos}
        </button>
      </div>
    );
  }
  if (acao === "pessoas") {
    return (
      <div className="lo-form">
        <EscolherPessoas id="lote-pessoas" rotulo="Quem aparece nestas fotos" valor={pessoas} onMudar={setPessoas} sugestoes={sugestoes} />
        <p className="ed-dica">Elas ficam marcadas nas fotos sem um lugar exato. Depois, se quiser, aponte o rosto em cada foto.</p>
        <button type="button" className="btn btn-p" disabled={!pessoas.length}
          onClick={() => onAplicar((it) => {
            const novas = pessoas.filter((p) => !it.marcas.some((k) => k.p === p)).map((p) => ({ p, x: null, y: null }));
            return { ...it, marcas: [...it.marcas, ...novas] };
          }, `${plural(pessoas.length, "pessoa marcada", "pessoas marcadas")} em ${fotos}.`)}>
          <Icone nome="marcar" />Marcar em {fotos}
        </button>
      </div>
    );
  }
  if (acao === "legenda") {
    return (
      <div className="lo-form">
        <Campo id="lote-legenda" rotulo="Descrição em comum" valor={texto} onMudar={setTexto} longo linhas={2} max={300}
          exemplo="Os primos na mesa das crianças." />
        {comLegenda > 0 && <p className="ed-dica">{plural(comLegenda, "das fotos escolhidas já tem legenda", "das fotos escolhidas já têm legenda")}. Ela será trocada por esta.</p>}
        <button type="button" className="btn btn-p" disabled={!texto.trim()}
          onClick={() => onAplicar((it) => ({ ...it, legenda: texto.trim() }), `Descrição aplicada em ${fotos}.`)}>
          <Icone nome="certo" />Aplicar em {fotos}
        </button>
      </div>
    );
  }
  return (
    <div className="lo-form">
      <p>{n === 1 ? "A foto escolhida deixa" : `As ${n} fotos escolhidas deixam`} de fazer parte deste álbum.</p>
      <button type="button" className="btn btn-p" onClick={() => onAplicar(null)}><Icone nome="lixo" />Sim, tirar {fotos}</button>
    </div>
  );
}

const ACOES = [
  ["pessoas", "Marcar pessoas", "marcar"],
  ["data", "Mudar a data", "calendario"],
  ["lugar", "Mudar o local", "pin"],
  ["legenda", "Descrição em comum", "comentar"],
  ["comeco", "Levar para o começo", "voltar"],
  ["remover", "Tirar do álbum", "lixo"],
];

/**
 * Galeria do álbum, como no Google Fotos: tocar numa foto abre grande (marcar pessoas, legenda);
 * "Selecionar" para mudar muitas de uma vez; arrastar (computador) ou "Mais para o começo/fim" para mudar a ordem.
 */
export default function Galeria({ m, mudar, sugestoes, arquivos, organizar = true }) {
  const [selecionando, setSelecionando] = useState(false);
  const [sel, setSel] = useState([]);
  const [aberta, setAberta] = useState(null); // índice da foto aberta
  const [acao, setAcao] = useState(null);
  const [feito, setFeito] = useState("");
  const [arrastando, setArrastando] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const [soltandoArquivos, setSoltandoArquivos] = useState(false);
  const gradeRef = useRef(null);

  const mudarItem = (arq, campos) => mudar((x) => ({ ...x, itens: x.itens.map((it) => (it.arq === arq ? { ...it, ...campos } : it)) }));
  const capa = m.capa || m.itens[0]?.arq;
  const tirar = (arqs) => {
    mudar((x) => ({ ...x, itens: x.itens.filter((it) => !arqs.includes(it.arq)), capa: arqs.includes(x.capa) ? null : x.capa }));
    setSel([]);
    setAberta(null);
    setFeito(`${plural(arqs.length, "foto tirada", "fotos tiradas")} do álbum.`);
  };
  const reordenar = (de, para) => {
    if (de === para) return;
    mudar((x) => ({ ...x, itens: mover(x.itens, de, para) }));
    setFeito(`Foto levada para o ${para + 1}º lugar.`);
  };
  const aplicar = (fn, msg) => {
    if (acao === "remover") { tirar(sel); setAcao(null); return; }
    if (acao === "comeco") return;
    mudar((x) => ({ ...x, itens: x.itens.map((it) => (sel.includes(it.arq) ? fn(it) : it)) }));
    setAcao(null);
    setFeito(msg);
  };
  const levarParaOComeco = () => {
    mudar((x) => ({ ...x, itens: [...x.itens.filter((it) => sel.includes(it.arq)), ...x.itens.filter((it) => !sel.includes(it.arq))] }));
    setAcao(null);
    setFeito(`${plural(sel.length, "foto levada", "fotos levadas")} para o começo do álbum.`);
  };
  const alternar = (arq) => setSel((s) => (s.includes(arq) ? s.filter((x) => x !== arq) : [...s, arq]));
  const todas = sel.length === m.itens.length;
  const escolher = (id) => (id === "comeco" ? levarParaOComeco() : setAcao(id));

  const comLegenda = m.itens.filter((it) => it.legenda).length;
  const comPessoas = m.itens.filter((it) => it.marcas.length).length;

  // soltar arquivos do computador em qualquer lugar da galeria
  const soltar = (e) => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    setSoltandoArquivos(false);
    if (!arquivos.proc) arquivos.juntar(e.dataTransfer.files);
  };

  return (
    <section className={`gl${soltandoArquivos ? " gl-soltando" : ""}`} aria-labelledby="gl-t"
      onDragOver={(e) => { if (organizar && [...e.dataTransfer.types].includes("Files")) { e.preventDefault(); setSoltandoArquivos(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSoltandoArquivos(false); }} onDrop={soltar}>
      <div className="gl-barra">
        <h2 id="gl-t" className="gl-conta">
          {plural(m.itens.length, "foto", "fotos")}
          {(comLegenda > 0 || comPessoas > 0) && <span> · {comLegenda} com legenda · {comPessoas} com pessoas</span>}
        </h2>
        {selecionando ? (
          <>
            <button type="button" className="btn btn-s btn-sm" onClick={() => setSel(todas ? [] : m.itens.map((it) => it.arq))}>
              <Icone nome="selecionar" />{todas ? "Desmarcar todas" : "Selecionar todas"}
            </button>
            <button type="button" className="btn-l" onClick={() => { setSelecionando(false); setSel([]); }}><Icone nome="fechar" />Terminar</button>
          </>
        ) : (
          <>
            {organizar && <BotaoArquivos className="btn btn-s btn-sm" rotulo="Juntar mais fotos" icone="mais" multiple disabled={!!arquivos.proc} onArquivos={(fs) => arquivos.juntar(fs)} />}
            <button type="button" className="btn btn-s btn-sm" onClick={() => { setSelecionando(true); setFeito(""); }}>
              <Icone nome="selecionar" />Selecionar várias
            </button>
          </>
        )}
      </div>
      <p className="ed-dica">
        {selecionando ? "Toque nas fotos que quer mudar juntas."
          : <>Toque numa foto para ver grande, marcar quem aparece ou escrever uma legenda.{organizar && <span className="gl-arraste"> Arraste para mudar a ordem.</span>}</>}
      </p>
      <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
      <p className="gl-feito" role="status">{feito}</p>

      <ul ref={gradeRef} className={`gl-grade${selecionando ? " gl-sel" : ""}`}>
        {m.itens.map((it, k) => {
          const on = sel.includes(it.arq);
          return (
            <li key={it.arq} className={`${alvo === k && arrastando !== null && arrastando !== k ? "gl-alvo" : ""}${arrastando === k ? " gl-movendo" : ""}`}
              draggable={!selecionando && organizar}
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(k)); e.dataTransfer.effectAllowed = "move"; setArrastando(k); }}
              onDragOver={(e) => { if (arrastando !== null) { e.preventDefault(); setAlvo(k); } }}
              onDrop={(e) => { if (arrastando !== null) { e.preventDefault(); e.stopPropagation(); reordenar(arrastando, k); } setArrastando(null); setAlvo(null); }}
              onDragEnd={() => { setArrastando(null); setAlvo(null); }}>
              <button type="button" className={`gl-it${on ? " on" : ""}`} aria-pressed={selecionando ? on : undefined}
                onClick={() => (selecionando ? alternar(it.arq) : setAberta(k))}>
                <Miniatura arq={it.arq} />
                {selecionando && <span className="gl-check" aria-hidden="true">{on && <Icone nome="certo" tam={22} />}</span>}
                {capa === it.arq && <span className="gl-capa"><Icone nome="estrela" tam={16} />Capa</span>}
                {(it.legenda || it.marcas.length > 0) && (
                  <span className="gl-info" aria-hidden="true">
                    {it.legenda && <Icone nome="comentar" tam={16} />}
                    {it.marcas.length > 0 && <><Icone nome="marcar" tam={16} />{it.marcas.length}</>}
                  </span>
                )}
                <span className="sr">
                  Foto {k + 1}{it.legenda ? `: ${it.legenda}` : ""}{it.marcas.length ? `, ${plural(it.marcas.length, "pessoa marcada", "pessoas marcadas")}` : ""}
                  {selecionando ? "" : ". Abrir"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selecionando && (
        <div className="gl-lote" role="group" aria-label="O que fazer com as fotos escolhidas">
          <p><b>{plural(sel.length, "foto escolhida", "fotos escolhidas")}</b></p>
          {/* celular: um botão que abre a lista de ações; computador: as ações à vista */}
          <button type="button" className="btn btn-p btn-sm gl-lote-menu" disabled={!sel.length} onClick={() => setAcao("menu")}>
            <Icone nome="corrigir" />O que fazer com elas?
          </button>
          <div className="gl-lote-bt">
            {ACOES.map(([id, nome, icone]) => (
              <button key={id} type="button" className="btn btn-s btn-sm" disabled={!sel.length} onClick={() => escolher(id)}>
                <Icone nome={icone} />{nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <Janela id="gl-lote" aberta={!!acao} onFechar={() => setAcao(null)}
        titulo={acao === "menu" ? `O que fazer com ${plural(sel.length, "foto", "fotos")}?` : acao && `${ACOES.find((a) => a[0] === acao)[1]} · ${plural(sel.length, "foto", "fotos")}`}>
        {acao === "menu" && (
          <div className="gl-menu">
            {ACOES.map(([id, nome, icone]) => (
              <button key={id} type="button" className="btn btn-s" onClick={() => escolher(id)}><Icone nome={icone} />{nome}</button>
            ))}
          </div>
        )}
        {acao && acao !== "menu" && <EmLote key={acao} acao={acao} n={sel.length} comLegenda={m.itens.filter((it) => sel.includes(it.arq) && it.legenda).length}
          onAplicar={aplicar} sugestoes={sugestoes} albumData={textoData(m.data)} />}
      </Janela>

      <Janela id="gl-foto" className="fe" aberta={aberta !== null && !!m.itens[aberta]} onFechar={() => setAberta(null)}
        titulo={aberta !== null && `Foto ${aberta + 1} de ${m.itens.length}`}>
        {aberta !== null && m.itens[aberta] && (
          <Visor key={m.itens[aberta].arq} m={m} k={aberta} mudarItem={mudarItem} onIr={setAberta} onTirar={tirar}
            onMover={(de, para) => { reordenar(de, para); setAberta(para); }}
            onCapa={(arq) => mudar({ capa: arq })} sugestoes={sugestoes} organizar={organizar} />
        )}
      </Janela>
    </section>
  );
}
