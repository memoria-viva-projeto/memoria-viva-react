import { useEffect, useMemo, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Adesivo from "../Adesivo.jsx";
import Avatar from "./Avatar.jsx";
import Arvore from "./Arvore.jsx";
import { ComVoz } from "./voz.jsx";
import { Miniatura } from "./midia.jsx";
import { pessoasDe } from "./pessoas.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { CONTA } from "../../dados/conta.js";
import { textoData, tituloDe, textoQuando } from "./guardados.js";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import {
  CATEGORIA, CATEGORIAS, EU, RELACOES, categoriaDe, desligar, ehFamilia, ehNova, faltaContar, geracoes, lacoDireto, ligar,
  nomeDe, nucleos, parentesco, porCategoria, relacaoDe, removerPessoa,
} from "./familia.js";

const simples = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Escolher o parentesco: etiquetas por grupo (Família próxima, Outras gerações...). "Outros familiares" pede o nome do
 * vínculo (rotulo) e, se quiser, o do outro lado (perguntaVolta / rotuloVolta: "madrinha" ↔ "afilhada").
 */
export function SeletorRelacao({ id, pergunta, valor, onEscolher, rotulo = "", onRotulo, perguntaVolta, rotuloVolta = "", onRotuloVolta }) {
  return (
    <fieldset className="fr-sel">
      <legend>{pergunta}</legend>
      {RELACOES.map(([grupo, lista]) => (
        <div key={grupo} className="fr-grupo" role="radiogroup" aria-label={grupo}>
          <p className="et-nome" aria-hidden="true">{grupo}</p>
          <div className="qd-modos">
            {lista.map(([k, nome]) => (
              <label key={k} className={`qd-modo${valor === k ? " on" : ""}`}>
                <input type="radio" name={`${id}-rel`} checked={valor === k} onChange={() => onEscolher(k)} />
                {valor === k && <Icone nome="certo" tam={16} />}{nome}
              </label>
            ))}
          </div>
        </div>
      ))}
      {valor === "outro" && (
        <div className="ed-campo">
          <label htmlFor={`${id}-rotulo`}>Que vínculo é esse?</label>
          <ComVoz rotulo="Que vínculo é esse" valor={rotulo} onMudar={onRotulo}>
            <input id={`${id}-rotulo`} type="text" maxLength={60} value={rotulo} placeholder="Ex.: madrinha, bisavó, compadre, ex-marido"
              onChange={(e) => onRotulo(e.target.value)} />
          </ComVoz>
        </div>
      )}
      {valor === "outro" && onRotuloVolta && (
        <div className="ed-campo">
          <label htmlFor={`${id}-volta`}>{perguntaVolta} <span className="fr-opc">(opcional)</span></label>
          <input id={`${id}-volta`} type="text" maxLength={60} value={rotuloVolta} placeholder="Ex.: afilhada, bisneto, compadre"
            onChange={(e) => onRotuloVolta(e.target.value)} />
        </div>
      )}
    </fieldset>
  );
}

/**
 * Corrigir ou criar a ligação entre quem (outro) e ancora: abre com o valor atual e só muda ao guardar.
 * Entre familiares, é um parentesco (vai para a árvore). Se uma das pessoas não é da família (amiga, madrinha...),
 * a ligação é escrita com as palavras de quem usa ("madrinha" ↔ "afilhada") e não mexe na árvore.
 */
function EscolherVinculo({ f, id, ancora, outro, onConfirmar, onCancelar }) {
  const livre = [ancora, outro].some((x) => x !== EU && !ehFamilia(f.pessoas.find((p) => p.id === x)));
  const atual = relacaoDe(f, outro, ancora);
  const laco = f.lacos.find((l) => l.tipo === "outro" && [l.de, l.para].includes(ancora) && [l.de, l.para].includes(outro));
  const [rel, setRel] = useState(livre ? "outro" : atual);
  const [rotulo, setRotulo] = useState(laco ? (laco.de === outro ? laco.rotulo : laco.rotuloVolta) || "" : "");
  const [volta, setVolta] = useState(laco ? (laco.de === outro ? laco.rotuloVolta : laco.rotulo) || "" : "");
  const quem = nomeDe(f, outro), de = nomeDe(f, ancora);
  const pronto = rel && (rel !== "outro" || rotulo.trim());
  return (
    <div className="fp-vinculo">
      {livre ? (
        <div className="fr-sel">
          <div className="ed-campo">
            <label htmlFor={`${id}-rotulo`}>{quem} é o quê de {de}?</label>
            <input id={`${id}-rotulo`} type="text" maxLength={60} value={rotulo} placeholder="Ex.: madrinha, melhor amiga, professora" onChange={(e) => setRotulo(e.target.value)} />
          </div>
          <div className="ed-campo">
            <label htmlFor={`${id}-volta`}>E {de} é o quê de {quem}? <span className="fr-opc">(opcional)</span></label>
            <input id={`${id}-volta`} type="text" maxLength={60} value={volta} placeholder="Ex.: afilhada, amiga, aluna" onChange={(e) => setVolta(e.target.value)} />
          </div>
        </div>
      ) : (
        <SeletorRelacao id={id} pergunta={`${quem} é o quê de ${de}?`} valor={rel} onEscolher={setRel}
          rotulo={rotulo} onRotulo={setRotulo} perguntaVolta={`E ${de} é o quê de ${quem}?`} rotuloVolta={volta} onRotuloVolta={setVolta} />
      )}
      {pronto && rel !== "outro" && (
        <p className="fr-previa">Vai ficar assim: <b>{quem}, {lacoDireto(ligar(f, ancora, outro, rel), outro, ancora).toLowerCase()} de {de}</b></p>
      )}
      <div className="fp-vinculo-bt">
        <button type="button" className="btn btn-p btn-sm" disabled={!pronto} onClick={() => onConfirmar(rel, rotulo.trim(), volta.trim())}>
          <Icone nome="certo" />{livre ? "Guardar ligação" : "Guardar parentesco"}
        </button>
        <button type="button" className="btn-l" onClick={onCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

/** Memórias e fotos em que a pessoa aparece (marcada pelo cadastro, ou pelo mesmo nome escrito antes de ela entrar na família). */
function emQueAparece(f, id, guardadas, memorias) {
  const p = f.pessoas.find((q) => q.id === id);
  const nome = simples(p?.nome);
  const bate = (r) => r === id || (nome && typeof r === "string" && simples(r) === nome);
  const minhas = guardadas.filter((m) => pessoasDe(m).some(bate));
  const demo = memorias.filter((m) => (m.pessoas || []).some(bate));
  const fotos = [
    ...guardadas.flatMap((m) => m.itens.filter((it) => it.tipo === "foto" && it.marcas.some((k) => bate(k.p))).map((it) => ({ m, arq: it.arq }))),
    ...demo.filter((m) => m.foto).map((m) => ({ m, src: m.foto })),
  ];
  return { memorias: [...minhas.map((m) => ({ m, para: `${ROTAS.memoria}/${m.id}`, titulo: tituloDe(m) })),
    ...demo.map((m) => ({ m, para: `${ROTAS.historia}#mem-${m.id}`, titulo: m.titulo }))], fotos };
}

const linkPerfil = (id) => (id === EU ? ROTAS.perfil : `${ROTAS.familia}/${id}`);
const FITAS = ["t-gema", "t-uru", "t-azul", "t-papel"];
const semMovimento = () => document.documentElement.dataset.movimento === "menos" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Lista que rola para o lado, com botões ‹ › quando há mais para ver (no celular nem sempre dá para
 * perceber, ou conseguir, arrastar). As bordas esmaecem do lado em que ainda tem gente.
 */
export function Rolagem({ className, rotulo, children }) {
  const lista = useRef(null);
  const [lados, setLados] = useState({ antes: false, depois: false });
  const medir = () => {
    const el = lista.current;
    if (!el) return;
    const antes = el.scrollLeft > 4, depois = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setLados((l) => (l.antes === antes && l.depois === depois ? l : { antes, depois }));
  };
  useEffect(medir); // a lista pode crescer (alguém novo entrou)
  useEffect(() => {
    const el = lista.current;
    el.addEventListener("scroll", medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", medir); ro.disconnect(); };
  }, []);
  const passar = (lado) => {
    const el = lista.current;
    el.scrollBy({ left: lado * Math.max(160, el.clientWidth * 0.8), behavior: semMovimento() ? "auto" : "smooth" });
  };
  return (
    <div className={`rl${lados.antes ? " rl-antes" : ""}${lados.depois ? " rl-depois" : ""}`}>
      <ul ref={lista} className={`rl-lista ${className}`}>{children}</ul>
      {lados.antes && <button type="button" className="rl-bt rl-esq" onClick={() => passar(-1)}><Icone nome="voltar" /><span className="sr">Ver {rotulo} anteriores</span></button>}
      {lados.depois && <button type="button" className="rl-bt rl-dir" onClick={() => passar(1)}><Icone nome="seguir" /><span className="sr">Ver mais {rotulo}</span></button>}
    </div>
  );
}

/** Uma pessoa num círculo, como nos "stories": a cor do anel diz a categoria; Urucum para quem chegou há pouco. */
function Roda({ f, id, tam = 72, legenda }) {
  const p = f.pessoas.find((q) => q.id === id);
  const nova = p && ehNova(p);
  return (
    <Link className={`fm-roda fm-cat-${categoriaDe(p)}${nova ? " nova" : ""}`} para={linkPerfil(id)}>
      <span className="fm-roda-anel"><Avatar id={id} tam={tam} />{nova && <span className="fm-roda-novo">novo</span>}</span>
      <b>{nomeDe(f, id)}</b>
      <span>{legenda ?? parentesco(f, id)}</span>
    </Link>
  );
}

/** Uma pessoa numa linha (nome e parentesco ao lado da foto). */
function Pessoa({ f, id, tam = 52 }) {
  const p = f.pessoas.find((q) => q.id === id);
  return (
    <Link className="fm-pessoa" para={linkPerfil(id)}>
      <Avatar id={id} tam={tam} />
      <span><b>{nomeDe(f, id)}</b><span>{parentesco(f, id)}{p?.faleceu ? " · em memória" : ""}</span></span>
    </Link>
  );
}

/**
 * "De geração em geração": o retrato de quem é dona da conta colado no álbum, com a família em volta.
 * Fica no perfil (seção "Sua família"). Sem a família carregada ainda, usa a lista da conta.
 */
export function MuralFamilia({ f, ajudante }) {
  const eu = CONTA.pessoa;
  const pessoas = f ? f.pessoas.filter((p) => !p.removida) : CONTA.familia.filter((p) => !p.removida);
  const gen = f ? geracoes(f) : new Map();
  const gens = new Set([0, ...gen.values()]);
  const volta = [...pessoas].sort((a, b) => (gen.get(b.id) ?? 0) - (gen.get(a.id) ?? 0)).slice(0, 6);
  const nome = (id) => (f ? nomeDe(f, id) : pessoas.find((p) => p.id === id)?.nome || id);
  return (
    <section className="fm-mural" aria-labelledby="pf-fam">
      <div className="fm-mural-foto">
        <figure className="foto leg cant fm-retrato">
          <span className="tape t-gema" aria-hidden="true" />
          <img src={eu.foto} alt={`Foto de ${eu.nome}`} />
          <figcaption className="lg">{eu.nome}</figcaption>
        </figure>
        <ul className="fm-volta">
          {volta.map((p, k) => (
            <li key={p.id} className={`fm-volta-${k}`}>
              <Link para={`${ROTAS.familia}/${p.id}`}><Avatar id={p.id} tam={58} /><span className="sr">{nome(p.id)}</span></Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="fm-mural-txt">
        <p className="mao fm-mao">de geração em geração</p>
        <h2 id="pf-fam" className="fm-titulo">Sua família</h2>
        <ul className="fm-numeros">
          <li><b>{pessoas.length}</b> {pessoas.length === 1 ? "pessoa" : "pessoas"}</li>
          {f && <li><b>{gens.size}</b> {gens.size === 1 ? "geração" : "gerações"}</li>}
        </ul>
        {ajudante && <p className="pf-ajuda"><Avatar id={ajudante.id} tam={36} /><span><b>{ajudante.nome}</b> ajuda você a cuidar deste perfil.</span></p>}
        <div className="fm-acoes">
          <Link className="btn btn-s" para={ROTAS.familia}><Icone nome="familia" />Ver a família</Link>
          <Link className="btn btn-s" para={`${ROTAS.familia}/arvore`}><Icone nome="arvore" />Ver a árvore</Link>
        </div>
      </div>
    </section>
  );
}

// ---------------- tela inicial da Família ----------------
// As pessoas da história (filtradas por categoria), a árvore, quem é quem na família e, depois, amigos e outros vínculos.
export function FamiliaInicio({ f }) {
  const [filtro, setFiltro] = useState("todos");
  const pessoas = f.pessoas.filter((p) => !p.removida);
  const familia = pessoas.filter(ehFamilia);
  const gen = geracoes(f);
  const gens = new Set([0, ...familia.map((p) => gen.get(p.id) ?? 0)]);
  const { ladoDeMim, casas, resto } = nucleos(f);
  const outras = porCategoria(f);
  const contagem = Object.fromEntries(CATEGORIAS.map(([k]) => [k, pessoas.filter((p) => categoriaDe(p) === k).length]));
  // nos círculos: quem chegou há pouco primeiro, depois a família (das gerações mais velhas para as mais novas), depois o resto
  const ordem = (p) => CATEGORIAS.findIndex(([k]) => k === categoriaDe(p));
  const rodas = pessoas
    .filter((p) => filtro === "todos" || categoriaDe(p) === filtro)
    .sort((a, b) => ehNova(b) - ehNova(a) || ordem(a) - ordem(b) || (gen.get(b.id) ?? 0) - (gen.get(a.id) ?? 0))
    .map((p) => p.id);
  const semRosto = familia.filter((p) => !p.fotoArq && !p.foto).length;
  const eu = CONTA.pessoa;

  return (
    <div className="c-wrap fm">
      <header className="fm-capa">
        <div className="fm-capa-txt">
          <p className="mao fm-mao">as pessoas da sua história</p>
          <h1 className="fm-titulo" tabIndex={-1}>A família de {eu.nome}<Adesivo nome="capivara" className="junto so-desk ad-capivara" /></h1>
          <p className="fm-conta">
            {contagem.familia} na família · {gens.size} {gens.size === 1 ? "geração" : "gerações"}
            {pessoas.length > contagem.familia && ` · ${pessoas.length - contagem.familia} entre amigos e outras pessoas queridas`}
          </p>
        </div>
        <Link className="btn btn-p" para={`${ROTAS.familia}/novo`}><Icone nome="convidar" />Adicionar pessoa</Link>
        <Adesivo nome="flor_tropical_heliconia" className="so-desk ad-familia" />
        <FaixaAzulejos semente={`a família de ${eu.nome}`} tamanho={18} girar={false} className="fm-capa-azulejos" />
      </header>

      <section aria-labelledby="fm-p-t" className="fm-pessoas">
        <h2 id="fm-p-t" className="sr">Pessoas</h2>
        <div className="fm-filtro" role="group" aria-label="Mostrar">
          {[["todos", "Todos", pessoas.length], ...CATEGORIAS.map(([k, nome]) => [k, nome, contagem[k]])].filter(([k, , n]) => k === "todos" || n > 0).map(([k, nome, n]) => (
            <button key={k} type="button" className={`qd-modo fm-cat-${k}${filtro === k ? " on" : ""}`} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
              {filtro === k && <Icone nome="certo" tam={16} />}{nome} <span className="fm-filtro-n">{n}</span>
            </button>
          ))}
        </div>
        <Rolagem key={filtro} className="fm-rodas" rotulo="pessoas">
          {rodas.map((id) => <li key={id}><Roda f={f} id={id} /></li>)}
        </Rolagem>
      </section>

      <section className="fm-previa" aria-labelledby="fm-a-t">
        <div className="fm-tit">
          <h2 id="fm-a-t" className="c-h2">A árvore<Adesivo nome="ramo_de_folhas_2" className="junto so-desk ad-fm-folha" /></h2>
          <Link className="btn-l" para={`${ROTAS.familia}/arvore`}><Icone nome="arvore" />Abrir a árvore inteira</Link>
        </div>
        <Arvore f={f} mini />
        {semRosto > 0 && (
          <p className="fm-rostos">
            <Icone nome="selecionar" tam={20} />
            <span>{semRosto === 1 ? "Uma pessoa da família ainda está sem rosto." : `${semRosto} pessoas da família ainda estão sem rosto.`} Dá para recortar de uma foto em que todos aparecem.</span>
            <Link className="btn btn-s btn-sm" para={`${ROTAS.familia}/rostos`}>Recortar rostos</Link>
          </p>
        )}
      </section>

      <section className="fm-nucleos" aria-labelledby="fm-q-t">
        <div className="fm-tit">
          <h2 id="fm-q-t" className="c-h2">Quem é quem na família</h2>
          <p className="ed-dica">Cada casa reúne um filho ou filha de {eu.nome} com quem veio depois.</p>
        </div>
        <ul className="fm-casas">
          {ladoDeMim.length > 0 && (
            <li className="fm-casa fm-casa-par">
              <span className="tape t-gema" aria-hidden="true" />
              <p className="mao fm-casa-mao">ao seu lado</p>
              {ladoDeMim.map((id) => <Pessoa key={id} f={f} id={id} tam={72} />)}
            </li>
          )}
          {casas.map(({ id, membros }, k) => {
            const falta = faltaContar(f.pessoas.find((p) => p.id === id));
            return (
              <li key={id} className="fm-casa">
                <span className={`tape ${FITAS[(k + 1) % FITAS.length]}`} aria-hidden="true" />
                <p className="mao fm-casa-mao">a casa de {nomeDe(f, id)}</p>
                <Pessoa f={f} id={id} tam={72} />
                {falta.length > 0 && <p className="fm-falta">A contar: {falta.slice(0, 2).join(", ")}</p>}
                {membros.length > 0 && (
                  <ul className="fm-casa-membros">
                    {membros.map((m) => <li key={m}><Pessoa f={f} id={m} tam={44} /></li>)}
                  </ul>
                )}
                <Link className="btn-l" para={`${ROTAS.familia}/novo?de=${id}`}><Icone nome="mais" />Adicionar parente de {nomeDe(f, id)}</Link>
              </li>
            );
          })}
          {resto.length > 0 && (
            <li className="fm-casa">
              <span className="tape t-papel" aria-hidden="true" />
              <p className="mao fm-casa-mao">mais parentes</p>
              <ul className="fm-casa-membros">
                {resto.map((m) => <li key={m}><Pessoa f={f} id={m} tam={44} /></li>)}
              </ul>
            </li>
          )}
        </ul>
      </section>

      <section className="fm-outros" aria-labelledby="fm-o-t">
        <div className="fm-tit">
          <h2 id="fm-o-t" className="c-h2">Amigos e outras pessoas queridas<span className="colagem so-desk ad-amigos" aria-hidden="true"><Adesivo nome="cadeira_de_praia" className="junto" /><Adesivo nome="guarda_sol" className="ad-guardasol" /></span></h2>
          <p className="ed-dica">Não entram na árvore, mas têm perfil, aparecem nas memórias e podem ter ligação com alguém da família.</p>
        </div>
        <ul className="fm-casas">
          {outras.map(([cat, ids]) => {
            const [, nome, , icone] = CATEGORIA[cat];
            return (
              <li key={cat} className={`fm-casa fm-grupo fm-cat-${cat}`}>
                <p className="fm-grupo-cab"><span className="fm-grupo-ic"><Icone nome={icone} tam={20} /></span><span className="mao fm-casa-mao">{nome.toLowerCase()}</span></p>
                {ids.length > 0 ? (
                  <ul className="fm-casa-membros">
                    {ids.map((m) => <li key={m}><Pessoa f={f} id={m} tam={48} /></li>)}
                  </ul>
                ) : <p className="ed-dica">Ninguém aqui ainda.</p>}
                <Link className="btn-l" para={`${ROTAS.familia}/novo?cat=${cat}`}><Icone nome="mais" />Adicionar em {nome.toLowerCase()}</Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="fm-privado"><Icone nome="conselho" />Só você vê essas pessoas. Ninguém precisa ter conta no Memória Viva. Se um dia tiverem, só verão o que você escolher mostrar.</p>
    </div>
  );
}

// ---------------- árvore completa ----------------
// atalhos do painel: adicionar um parente já com o parentesco escolhido
const ATALHOS = [["mae", "Mãe"], ["pai", "Pai"], ["conjuge", "Cônjuge"], ["filha", "Filha"], ["filho", "Filho"], ["irma", "Irmã"], ["irmao", "Irmão"]];

/** Ramos da árvore: a família toda, as gerações de cima (com a sua) e a casa de cada filho. */
function ramosDe(f) {
  const { ladoDeMim, casas } = nucleos(f);
  const gen = geracoes(f);
  const base = [EU, ...ladoDeMim];
  return [
    { id: "todos", nome: "Toda a família", mostrar: null },
    { id: "acima", nome: "De você para cima", mostrar: new Set([...base, ...[...gen].filter(([, g]) => g >= 0).map(([id]) => id)]) },
    ...casas.map((c) => ({ id: c.id, nome: `Ramo de ${nomeDe(f, c.id)}`, mostrar: new Set([...base, c.id, ...c.membros]) })),
  ];
}

export function ArvorePagina({ f }) {
  const [sel, setSel] = useState(() => new URLSearchParams(window.location.search).get("pessoa"));
  const [ramo, setRamo] = useState("todos");
  const ramos = useMemo(() => ramosDe(f), [f]); // o mesmo conjunto entre um toque e outro (a árvore só redesenha se mudar)
  const atual = ramos.find((r) => r.id === ramo) || ramos[0];
  const eu = sel === EU;
  const quem = sel && nomeDe(f, sel);
  return (
    <div className="c-wrap fm fm-arvore">
      <Link className="btn-l hs-voltar" para={ROTAS.familia}><Icone nome="voltar" />Família</Link>
      {/* topo curto: no celular, a árvore precisa aparecer inteira na tela, não lá embaixo */}
      <h1 className="fm-titulo fm-arv-titulo" tabIndex={-1}>Árvore da família<Adesivo nome="sagui" className="so-desk ad-arvore" /></h1>
      <Arvore f={f} selecionada={sel} onSelecionar={setSel} mostrar={atual.mostrar}
        topo={ramos.length > 2 && (
          <section aria-label="Ver um ramo da família">
            <Rolagem className="fm-ramos" rotulo="ramos">
              {ramos.map((r) => (
                <li key={r.id}>
                  <button type="button" className={`qd-modo${ramo === r.id ? " on" : ""}`} aria-pressed={ramo === r.id}
                    onClick={() => { setRamo(r.id); if (sel && r.mostrar && !r.mostrar.has(sel)) setSel(null); }}>
                    {ramo === r.id && <Icone nome="certo" tam={16} />}{r.nome}
                  </button>
                </li>
              ))}
            </Rolagem>
          </section>
        )} />
      <p className="fm-gesto">
        <Icone nome="conselho" tam={18} />
        <span>Arraste com um dedo para qualquer lado. Afaste dois dedos para aproximar, junte para afastar, ou toque duas vezes no fundo. No computador, use a rodinha. Toque numa pessoa para abrir o perfil ou adicionar um parente.</span>
      </p>
      <p className="fm-legenda" aria-hidden="true">
        <span><i className="fm-leg-pais" />pais e filhos</span>
        <span><i className="fm-leg-conjuge" />casal</span>
        <span><i className="fm-leg-outros" />irmãos, primos e outros vínculos</span>
      </p>
      <Link className="btn btn-s btn-sm fm-arv-rostos" para={`${ROTAS.familia}/rostos`}><Icone nome="selecionar" />Rostos de uma foto de grupo</Link>
      {sel && (
        <div className="fm-painel" role="region" aria-label={`Ações para ${quem}`}>
          <Avatar id={sel} tam={56} />
          <p className="fm-painel-nome"><b>{quem}</b><span>{parentesco(f, sel)}</span></p>
          <div className="fm-painel-bt">
            <Link className="btn btn-s btn-sm" para={linkPerfil(sel)}><Icone nome="ver" />{eu ? "Seu perfil" : "Ver o perfil"}</Link>
            {!eu && <Link className="btn-l" para={`${ROTAS.familia}/${sel}#parentes`}><Icone nome="corrigir" />Corrigir parentesco</Link>}
            {!eu && !f.pessoas.find((p) => p.id === sel)?.fotoArq && <Link className="btn-l" para={`${ROTAS.familia}/rostos?para=${sel}`}><Icone nome="selecionar" />Dar um rosto</Link>}
          </div>
          <div className="fm-painel-add">
            <p>Adicionar {eu ? "um parente seu" : `um parente de ${quem}`}:</p>
            <Rolagem className="fm-atalhos" rotulo="parentescos">
              {ATALHOS.map(([rel, nome]) => (
                <li key={rel}><Link className="qd-modo" para={`${ROTAS.familia}/novo?de=${sel}&rel=${rel}`}><Icone nome="mais" tam={16} />{nome}</Link></li>
              ))}
              <li><Link className="qd-modo" para={`${ROTAS.familia}/novo?de=${sel}`}>Outro…</Link></li>
            </Rolagem>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- perfil de um familiar ----------------
function Parentes({ f, id, onMudar }) {
  const [corrigindo, setCorrigindo] = useState(null);
  const [ligando, setLigando] = useState(false);
  const [quem, setQuem] = useState("");
  const ligados = [...new Set(f.lacos.flatMap((l) => (l.de === id ? [l.para] : l.para === id ? [l.de] : [])))];
  const livres = [EU, ...f.pessoas.filter((p) => !p.removida).map((p) => p.id)].filter((x) => x !== id && !ligados.includes(x));
  const nome = nomeDe(f, id);
  const familia = ehFamilia(f.pessoas.find((p) => p.id === id));

  return (
    <section className="fp-sec" id="parentes" aria-labelledby="fp-par-t">
      <h2 id="fp-par-t" className="mv-h2">{familia ? "Parentes próximos" : `Ligações de ${nome}`}</h2>
      <p className="ed-dica">{familia ? "Os parentescos montam a árvore." : `Com quem ${nome} tem ligação entre as pessoas cadastradas (madrinha da Juliana, amiga do Antônio…). Isso não entra na árvore.`}</p>
      {ligados.length === 0 && <p className="ed-dica">Ainda sem ligações.</p>}
      <ul className="fp-parentes">
        {ligados.map((outro) => (
          <li key={outro}>
            <div className="fp-par">
              <Avatar id={outro} tam={48} />
              <p>
                {outro === EU ? <Link para={ROTAS.perfil}>{nomeDe(f, outro)}</Link> : <Link para={`${ROTAS.familia}/${outro}`}>{nomeDe(f, outro)}</Link>}
                <span>{lacoDireto(f, outro, id)} de {nome}</span>
              </p>
              <div className="fp-par-bt">
                <button type="button" className="btn-l" aria-expanded={corrigindo === outro} onClick={() => setCorrigindo(corrigindo === outro ? null : outro)}>
                  <Icone nome="corrigir" />Corrigir
                </button>
                <button type="button" className="btn-l" onClick={() => onMudar(desligar(f, id, outro), `O vínculo entre ${nome} e ${nomeDe(f, outro)} foi tirado.`)}>
                  <Icone nome="fechar" />Tirar vínculo
                </button>
              </div>
            </div>
            {corrigindo === outro && (
              <EscolherVinculo f={f} id={`fp-${outro}`} ancora={id} outro={outro} onCancelar={() => setCorrigindo(null)}
                onConfirmar={(rel, rotulo, volta) => { onMudar(ligar(f, id, outro, rel, rotulo, volta), "Parentesco corrigido."); setCorrigindo(null); }} />
            )}
          </li>
        ))}
      </ul>
      {livres.length > 0 && (ligando ? (
        <div className="fp-ligar">
          <div className="ed-campo">
            <label htmlFor="fp-quem">Com quem, entre as pessoas cadastradas?</label>
            <select id="fp-quem" value={quem} onChange={(e) => setQuem(e.target.value)}>
              <option value="">Escolha</option>
              {livres.map((x) => <option key={x} value={x}>{nomeDe(f, x)} ({parentesco(f, x)})</option>)}
            </select>
          </div>
          {quem ? (
            <EscolherVinculo key={quem} f={f} id="fp-novo" ancora={id} outro={quem} onCancelar={() => { setLigando(false); setQuem(""); }}
              onConfirmar={(rel, rotulo, volta) => { onMudar(ligar(f, id, quem, rel, rotulo, volta), "Vínculo guardado."); setLigando(false); setQuem(""); }} />
          ) : <button type="button" className="btn-l" onClick={() => setLigando(false)}>Cancelar</button>}
        </div>
      ) : (
        <button type="button" className="btn btn-s btn-sm" onClick={() => setLigando(true)}><Icone nome="link" />Ligar a alguém já cadastrado</button>
      ))}
    </section>
  );
}

// Estado da conta de cada familiar. Hoje só existe "sem-conta"; os outros já têm lugar na tela para quando houver contas.
const ESTADOS = {
  "sem-conta": { rotulo: "Sem conta · registro seu", icone: "familia" },
  convite: { rotulo: "Convite pendente", icone: "enviar" },
  vinculada: { rotulo: "Tem conta no Memória Viva", icone: "certo" },
};

/** O que essa pessoa vê (ou verá) da Maria. Nada é automático: cada memória precisa ser escolhida. */
function Privacidade({ p, nome, estado, guardadas, memorias }) {
  const eu = CONTA.pessoa.nome;
  const titulos = (p.compartilhado || []).map((mid) => {
    const g = guardadas.find((m) => m.id === mid);
    return g ? tituloDe(g) : memorias.find((m) => m.id === mid)?.titulo;
  }).filter(Boolean);
  const texto = {
    "sem-conta": `${nome} não tem conta no Memória Viva. Este perfil é um registro que ${eu} fez, e só ${eu} vê.`,
    convite: `${nome} foi convidado(a) e ainda não aceitou. Até aceitar, não vê nada.`,
    vinculada: `${nome} tem conta própria e cuida do que conta sobre si. O parentesco entre vocês continua o mesmo.`,
  }[p.conta?.estado || "sem-conta"];
  return (
    <div className="fp-priv">
      <div className={`fp-priv-bloco fp-priv-${p.conta?.estado || "sem-conta"}`}>
        <p className="fp-priv-tit"><Icone nome={estado.icone} tam={22} />{estado.rotulo}</p>
        <p>{texto}</p>
      </div>
      <div className="fp-priv-bloco">
        <p className="fp-priv-tit"><Icone nome="ver" tam={22} />O que {nome} pode ver</p>
        {titulos.length ? (
          <ul className="fp-priv-lista">{titulos.map((t) => <li key={t}>{t}</li>)}</ul>
        ) : (
          <p>Nada, por enquanto. Se {nome} tiver conta um dia, {eu} escolhe memória por memória o que mostrar. Nada é compartilhado sozinho.</p>
        )}
      </div>
    </div>
  );
}

export function Familiar({ f, id, guardadas, memorias, onMudar, ir }) {
  const [tirando, setTirando] = useState(false);
  // aba aberta; "#parentes" (vindo de "Corrigir parentesco" na árvore) já abre em Parentes
  const [escolhida, setAba] = useState(() => (window.location.hash === "#parentes" ? "parentes" : null));
  const abaRef = useRef(null);
  const p = f.pessoas.find((q) => q.id === id && !q.removida);
  if (!p) {
    return (
      <div className="c-wrap fm">
        <Link className="btn-l hs-voltar" para={ROTAS.familia}><Icone nome="voltar" />Família</Link>
        <h1 className="fm-titulo" tabIndex={-1}>Esta pessoa não está cadastrada</h1>
      </div>
    );
  }
  const nome = nomeDe(f, id);
  const nasc = textoData(p.nascimento), morte = p.faleceu ? textoData(p.falecimento) : "";
  const aparece = emQueAparece(f, id, guardadas, memorias);
  const falta = faltaContar(p);
  const editar = `${ROTAS.familia}/${id}/editar`;
  const ligados = [...new Set(f.lacos.flatMap((l) => (l.de === id ? [l.para] : l.para === id ? [l.de] : [])))];
  const estado = ESTADOS[p.conta?.estado] || ESTADOS["sem-conta"];
  const familia = ehFamilia(p);
  const [cat, nomeCat, , iconeCat] = CATEGORIA[categoriaDe(p)];

  const abas = [
    ["fotos", "Fotos", aparece.fotos.length],
    ["memorias", "Memórias", aparece.memorias.length],
    ["parentes", familia ? "Parentes" : "Ligações", ligados.length],
    ["privacidade", "Privacidade"],
  ];
  const aba = escolhida || (aparece.fotos.length ? "fotos" : "memorias");
  const irPara = (k) => { setAba(k); abaRef.current?.scrollIntoView({ block: "start" }); };
  // setas do teclado passam de uma aba para a outra
  const teclas = (e) => {
    const k = abas.findIndex((a) => a[0] === aba);
    const n = e.key === "ArrowRight" ? k + 1 : e.key === "ArrowLeft" ? k - 1 : null;
    if (n === null) return;
    const prox = abas[(n + abas.length) % abas.length][0];
    setAba(prox);
    document.getElementById(`fp-aba-${prox}`)?.focus();
  };

  return (
    <div className="c-wrap fm fp">
      <Link className="btn-l hs-voltar" para={ROTAS.familia}><Icone nome="voltar" />Família</Link>
      <header className="fp-cab">
        <span className={`fp-foto${ehNova(p) ? " nova" : ""}`}><Avatar id={id} tam={140} /></span>
        <div className="fp-quem">
          {/* categoria (de que grupo é) e vínculo (o que é para você) aparecem separados */}
          <p className="fp-etiquetas">
            <span className={`fp-cat fm-cat-${cat}`}><Icone nome={iconeCat} tam={16} />{nomeCat}</span>
            <span className="mv-tipo">{parentesco(f, id)}{p.faleceu ? " · em memória" : ""}</span>
          </p>
          <h1 className="fm-titulo" tabIndex={-1}>{nome}</h1>
          {p.nomeCompleto && p.nomeCompleto !== p.nome && <p className="fp-completo">{p.nomeCompleto}</p>}
          <ul className="fp-numeros">
            {abas.slice(0, 3).map(([k, rotulo, n]) => (
              <li key={k}><button type="button" onClick={() => irPara(k)}><b>{n}</b>{rotulo.toLowerCase()}</button></li>
            ))}
          </ul>
        </div>
        <div className="fp-sobre">
          {p.bio ? <p className="fp-bio">{p.bio}</p> : <p className="mv-convite">Ainda sem a história de {nome}. <Link className="btn-l" para={`${editar}?passo=historia`}>Contar</Link></p>}
          {p.outras && <p className="fp-outras">{p.outras}</p>}
          <p className="fp-datas">
            {nasc ? <span><Icone nome="calendario" tam={18} />Nasceu: <b>{nasc}</b></span> : <span className="fp-pend"><Icone nome="calendario" tam={18} />Nascimento a contar</span>}
            {p.faleceu && (morte ? <span><Icone nome="coracao" tam={18} />Faleceu: <b>{morte}</b></span> : <span className="fp-pend"><Icone nome="coracao" tam={18} />Em memória</span>)}
            {p.origem && <span><Icone nome="pin" tam={18} />De <b>{p.origem}</b></span>}
          </p>
          {p.fotoArq && p.fotoRecorte ? (
            <p className="fp-recorte"><Icone nome="selecionar" tam={18} /><span>Foto recortada de “{p.fotoRecorte.origem}”: aproximada, escolhida por você. <Link className="btn-l" para={`${editar}?passo=datas`}>Trocar ou tirar</Link></span></p>
          ) : !p.fotoArq && !p.foto && (
            <p className="fp-recorte"><Icone nome="selecionar" tam={18} /><span>Sem foto ainda. <Link className="btn-l" para={`${ROTAS.familia}/rostos?para=${id}`}>Recortar o rosto de uma foto de grupo</Link></span></p>
          )}
          <p className={`fp-conta fp-conta-${p.conta?.estado || "sem-conta"}`}><Icone nome={estado.icone} tam={18} />{estado.rotulo}</p>
        </div>
      </header>

      <div className="mv-acoes fp-acoes">
        <Link className="btn btn-p btn-sm" para={editar}><Icone nome="corrigir" />{falta.length ? "Completar o perfil" : "Editar"}</Link>
        {familia && <Link className="btn btn-s btn-sm" para={`${ROTAS.familia}/novo?de=${id}`}><Icone nome="convidar" />Adicionar parente</Link>}
        {familia && <Link className="btn btn-s btn-sm" para={`${ROTAS.familia}/arvore?pessoa=${id}`}><Icone nome="arvore" />Ver na árvore</Link>}
      </div>

      {ligados.length > 0 && (
        <section aria-label={`Parentes próximos de ${nome}`}>
          <Rolagem className="fm-rodas fp-destaques" rotulo={`parentes de ${nome}`}>
            {ligados.map((x) => <li key={x}><Roda f={f} id={x} tam={60} legenda={lacoDireto(f, x, id)} /></li>)}
          </Rolagem>
        </section>
      )}

      <div className="fp-abas" role="tablist" aria-label={`Sobre ${nome}`} ref={abaRef} onKeyDown={teclas}>
        {abas.map(([k, rotulo, n]) => (
          <button key={k} type="button" role="tab" id={`fp-aba-${k}`} aria-controls={`fp-painel-${k}`} aria-selected={aba === k} tabIndex={aba === k ? 0 : -1}
            className={aba === k ? "on" : undefined} onClick={() => setAba(k)}>
            {rotulo}{n !== undefined && <span className="fp-abas-n">{n}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`fp-painel-${aba}`} aria-labelledby={`fp-aba-${aba}`} className="fp-painel">
        {aba === "fotos" && (aparece.fotos.length ? (
          <ul className="gl-grade fp-fotos">
            {aparece.fotos.map((x, k) => (
              <li key={k}>
                <Link className="gl-it" para={x.src ? `${ROTAS.historia}#mem-${x.m.id}` : `${ROTAS.memoria}/${x.m.id}`}>
                  {x.src ? <span className="mi"><img src={x.src} alt="" /></span> : <Miniatura arq={x.arq} />}
                  <span className="sr">{x.m.titulo || tituloDe(x.m)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="fp-vazio">Ainda sem fotos de {nome}. Ao guardar uma foto, toque em “Quem aparece” e marque {nome}: ela aparece aqui.</p>)}

        {aba === "memorias" && (aparece.memorias.length ? (
          <ul className="fp-mems">
            {aparece.memorias.map(({ m, para, titulo }) => (
              <li key={m.id}><Link className="fp-mem" para={para}><Icone nome="memorias" tam={20} /><span><b>{titulo}</b><span>{textoQuando(m) || m.quando || ""}</span></span></Link></li>
            ))}
          </ul>
        ) : <p className="fp-vazio">Quando {nome} for marcado numa foto, ou ligado a uma receita ou música, a memória aparece aqui.</p>)}

        {aba === "parentes" && <Parentes f={f} id={id} onMudar={onMudar} />}

        {aba === "privacidade" && <Privacidade p={p} nome={nome} estado={estado} guardadas={guardadas} memorias={memorias} />}
      </div>

      <div className="mv-fim">
        {tirando ? (
          <div className="fe-confirma" role="alert">
            <p>Tirar {nome} da família? Os vínculos somem da árvore; as memórias em que {nome} foi marcado continuam com o nome.</p>
            <button type="button" className="btn btn-p btn-sm" onClick={() => { ir(ROTAS.familia); onMudar(removerPessoa(f, id), `${nome} saiu da família.`); }}><Icone nome="lixo" />Sim, tirar</button>
            <button type="button" className="btn-l" onClick={() => setTirando(false)}>Não, manter</button>
          </div>
        ) : (
          <button type="button" className="btn-l mv-apagar" onClick={() => setTirando(true)}><Icone nome="lixo" />Tirar da família</button>
        )}
      </div>
    </div>
  );
}
