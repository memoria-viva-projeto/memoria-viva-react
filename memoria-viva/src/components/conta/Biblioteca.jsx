import { useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { Midia } from "./Feed.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { listaDeIngredientes } from "./EditorReceita.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";
import { nomeEtiqueta } from "./guardados.js";
import { FILTRO_VAZIO, opcoesDeFiltro } from "./memorias.js";

const nome = (id) => (id === CONTA.pessoa.id ? "Você" : pessoa(id).nome);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ---------------- filtros (tempo e pessoas), num lugar só ----------------

/** "Filtrar": fechado mostra só os filtros em uso; aberto mostra ano, década, intervalo, fase da vida, ocasião e pessoas. */
export function Filtros({ itens, f, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const o = opcoesDeFiltro(itens);
  const mudar = (campo, valor) => onMudar({ ...f, [campo]: f[campo] === valor ? "" : valor });
  const ativos = [
    f.ano && ["ano", `Ano ${f.ano}`], f.decada && ["decada", `Anos ${f.decada}`],
    (f.de || f.ate) && ["intervalo", `${f.de || "…"} a ${f.ate || "…"}`],
    f.etapa && ["etapa", nomeEtiqueta(f.etapa)], f.ocasiao && ["ocasiao", nomeEtiqueta(f.ocasiao)], f.pessoa && ["pessoa", `Com ${nome(f.pessoa)}`],
  ].filter(Boolean);
  const tirar = (k) => onMudar(k === "intervalo" ? { ...f, de: "", ate: "" } : { ...f, [k]: "" });
  const semTempo = !o.anos.length && !o.decadas.length && !o.etapas.length && !o.ocasioes.length;
  const chips = (campo, lista, rotulo) => (
    <div className="qd-modos">
      {lista.map((v) => (
        <button key={v} type="button" className={`qd-modo${f[campo] === v ? " on" : ""}`} aria-pressed={f[campo] === v} onClick={() => mudar(campo, v)}>
          {f[campo] === v && <Icone nome="certo" tam={16} />}{rotulo(v)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mm-filtros">
      <div className="mm-filtros-linha">
        <button type="button" className={`qd-modo${aberto ? " on" : ""}`} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          <Icone nome="buscar" tam={18} />Filtrar{ativos.length > 0 && <span className="mm-n">{ativos.length}</span>}
        </button>
        {ativos.map(([k, rot]) => (
          <button key={k} type="button" className="mm-filtro-ativo" onClick={() => tirar(k)}>{rot}<Icone nome="fechar" tam={16} /><span className="sr"> (tirar este filtro)</span></button>
        ))}
        {ativos.length > 1 && <button type="button" className="btn-l" onClick={() => onMudar(FILTRO_VAZIO)}>Limpar</button>}
      </div>
      {aberto && (
        <div className="mm-filtro-painel" role="region" aria-label="Filtros">
          {semTempo && <p className="ed-dica">Nenhuma memória tem data, época ou ocasião ainda. Dá para contar ao completar cada memória.</p>}
          {(o.anos.length > 0 || o.decadas.length > 0) && (
            <fieldset className="mm-fgrupo">
              <legend>Quando</legend>
              <div className="mm-fcampos">
                {o.decadas.length > 0 && (
                  <div className="ed-campo"><label htmlFor="mf-dec">Década</label>
                    <select id="mf-dec" value={f.decada} onChange={(e) => onMudar({ ...f, decada: e.target.value })}>
                      <option value="">Todas</option>{o.decadas.map((d) => <option key={d} value={d}>Anos {d}</option>)}
                    </select></div>
                )}
                {o.anos.length > 0 && (
                  <div className="ed-campo"><label htmlFor="mf-ano">Ano</label>
                    <select id="mf-ano" value={f.ano} onChange={(e) => onMudar({ ...f, ano: e.target.value })}>
                      <option value="">Todos</option>{o.anos.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select></div>
                )}
                {o.anos.length > 1 && (
                  <div className="ed-campo"><label htmlFor="mf-de">De</label>
                    <select id="mf-de" value={f.de} onChange={(e) => onMudar({ ...f, de: e.target.value })}>
                      <option value="">Início</option>{o.anos.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select></div>
                )}
                {o.anos.length > 1 && (
                  <div className="ed-campo"><label htmlFor="mf-ate">Até</label>
                    <select id="mf-ate" value={f.ate} onChange={(e) => onMudar({ ...f, ate: e.target.value })}>
                      <option value="">Hoje</option>{o.anos.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select></div>
                )}
              </div>
              <p className="ed-dica">Memórias sem data não aparecem quando você escolhe um ano ou uma década.</p>
            </fieldset>
          )}
          {o.etapas.length > 0 && <fieldset className="mm-fgrupo"><legend>Fase da vida ou época</legend>{chips("etapa", o.etapas, nomeEtiqueta)}</fieldset>}
          {o.ocasioes.length > 0 && <fieldset className="mm-fgrupo"><legend>Ocasião</legend>{chips("ocasiao", o.ocasioes, nomeEtiqueta)}</fieldset>}
          {o.pessoas.length > 0 && (
            <fieldset className="mm-fgrupo"><legend>Quem aparece</legend>
              <div className="qd-modos">
                {o.pessoas.map((id) => (
                  <button key={id} type="button" className={`qd-modo mm-fpessoa${f.pessoa === id ? " on" : ""}`} aria-pressed={f.pessoa === id} onClick={() => mudar("pessoa", id)}>
                    <Avatar id={id} tam={28} />{nome(id)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <button type="button" className="btn btn-s btn-sm" onClick={() => setAberto(false)}><Icone nome="certo" />Pronto</button>
        </div>
      )}
    </div>
  );
}

// ---------------- cada categoria do seu jeito ----------------

/** Abre uma memória: as guardadas têm página própria (álbum, receita, música, vídeo); o resto abre a publicação por cima. */
function Abrir({ x, cat, onAbrir, className, children, rotulo }) {
  if (x.fonte === "guardada") return <Link className={className} para={`${ROTAS.memoria}/${x.id}?de=${cat}`} aria-label={rotulo}>{children}</Link>;
  return <button type="button" className={className} onClick={() => onAbrir(x)} aria-label={rotulo}>{children}</button>;
}

/** Fotos em mosaico, cada uma na proporção dela (vertical, horizontal ou quadrada). */
function Mosaico({ itens, cat, onAbrir }) {
  return (
    <ul className="bb-mosaico">
      {itens.map((x) => (
        <li key={`${x.fonte}-${x.id}`}>
          <Abrir x={x} cat={cat} onAbrir={onAbrir} className={`bb-foto bb-foto-${x.tipo}`} rotulo={x.titulo}>
            <Midia x={x} mini />
            <span className="bb-foto-leg"><b>{x.titulo}</b>{x.quando && <span>{x.quando}</span>}</span>
          </Abrir>
        </li>
      ))}
    </ul>
  );
}

/** A estante de álbuns: capa com foto de verdade, nome, época, quantas fotos e um pedaço da história. */
function Albuns({ itens, cat, onAbrir }) {
  return (
    <ul className="bb-estante">
      {itens.map((x) => (
        <li key={x.id}>
          <Abrir x={x} cat={cat} onAbrir={onAbrir} className="bb-album" rotulo={`Abrir o álbum ${x.titulo}`}>
            <span className="bb-album-capa"><Midia x={x} mini /></span>
            <span className="bb-album-txt">
              <b>{x.titulo}</b>
              <span className="bb-album-meta">{[x.quando, plural(x.fotos, "foto", "fotos")].filter(Boolean).join(" · ")}</span>
              {x.texto && <span className="bb-album-desc">{x.texto}</span>}
            </span>
          </Abrir>
        </li>
      ))}
    </ul>
  );
}

/** Receitas como fichas do caderno da família: nome, foto se tiver, quem fazia, ocasiões, e o que já foi escrito. */
function Receitas({ itens, cat, onAbrir }) {
  return (
    <ul className="bb-fichas">
      {itens.map((x) => {
        const e = x.m.extra || {};
        const ingredientes = listaDeIngredientes(e.ingredientes).length;
        const resumo = x.texto || e.segredos || "";
        return (
          <li key={`${x.fonte}-${x.id}`}>
            <Abrir x={x} cat={cat} onAbrir={onAbrir} className="bb-ficha" rotulo={`Abrir a receita ${x.titulo || x.receita}`}>
              {(x.foto || x.arq) && <span className="bb-ficha-foto"><Midia x={x} mini /></span>}
              <span className="bb-ficha-txt">
                <span className="mao bb-ficha-mao">receita</span>
                <b>{x.receita || x.titulo}</b>
                {x.receita && x.titulo !== x.receita && <span className="bb-ficha-de">{x.titulo}</span>}
                {e.quem && <span className="bb-ficha-de"><Icone nome="familia" tam={16} />Quem fazia: {e.quem}</span>}
                {e.ocasioes && <span className="bb-ficha-de"><Icone nome="calendario" tam={16} />{e.ocasioes}</span>}
                {resumo && <span className="bb-ficha-resumo">{resumo}</span>}
                <span className="bb-ficha-pe">
                  {ingredientes > 0 ? plural(ingredientes, "ingrediente", "ingredientes") : "Ingredientes ainda não escritos"}
                  {" · "}{e.preparo ? "com modo de preparo" : "preparo ainda não escrito"}
                </span>
              </span>
            </Abrir>
          </li>
        );
      })}
    </ul>
  );
}

/** Músicas: capa, nome, quem canta e por que importa. */
function Musicas({ itens, cat, onAbrir }) {
  return (
    <ul className="bb-lista">
      {itens.map((x) => {
        const e = x.m.extra || {};
        return (
          <li key={x.id}>
            <Abrir x={x} cat={cat} onAbrir={onAbrir} className="bb-linha" rotulo={`Ouvir ${x.titulo}`}>
              <span className="bb-linha-capa bb-disco"><Midia x={x} mini /></span>
              <span className="bb-linha-txt">
                <b>{x.titulo}</b>
                {e.artista && <span>{e.artista}</span>}
                {(e.porque || e.lembranca || x.texto) && <span className="bb-linha-desc">{e.porque || e.lembranca || x.texto}</span>}
              </span>
              <Icone nome="ouvir" tam={24} />
            </Abrir>
          </li>
        );
      })}
    </ul>
  );
}

/** Vídeos: prévia, título e o que acontecia. */
function Videos({ itens, cat, onAbrir }) {
  return (
    <ul className="bb-lista">
      {itens.map((x) => {
        const e = x.m.extra || {};
        return (
          <li key={x.id}>
            <Abrir x={x} cat={cat} onAbrir={onAbrir} className="bb-linha" rotulo={`Ver ${x.titulo}`}>
              <span className="bb-linha-capa bb-tela"><Midia x={x} mini /></span>
              <span className="bb-linha-txt">
                <b>{x.titulo}</b>
                {x.quando && <span>{x.quando}</span>}
                {(e.contexto || x.texto) && <span className="bb-linha-desc">{e.contexto || x.texto}</span>}
              </span>
            </Abrir>
          </li>
        );
      })}
    </ul>
  );
}

/** Conselhos, frases e relatos: o texto em primeiro lugar, com quem disse e o contexto. */
function Falas({ itens, cat, onAbrir }) {
  return (
    <ul className="bb-falas">
      {itens.map((x) => {
        const texto = x.frase || x.relato || x.texto;
        return (
          <li key={`${x.fonte}-${x.id}`}>
            <Abrir x={x} cat={cat} onAbrir={onAbrir} className="bb-fala" rotulo={x.titulo}>
              <span className="bb-fala-txt">“{texto}”</span>
              <span className="bb-fala-quem"><Avatar id={x.autor} tam={32} /><span><b>{nome(x.autor)}</b>{[x.titulo !== texto && x.titulo, x.quando, x.m.guardadoPara && `guardado para ${x.m.guardadoPara}`].filter(Boolean).join(" · ")}</span></span>
              {x.audio && <span className="bb-fala-audio"><Icone nome="ouvir" tam={18} />Tem relato em áudio</span>}
            </Abrir>
          </li>
        );
      })}
    </ul>
  );
}

const VISTAS = { albuns: Albuns, receitas: Receitas, musicas: Musicas, videos: Videos, conselhos: Falas, frases: Falas, historias: Falas };

/** O conteúdo de uma pasta, do jeito do tipo dela (fotos e "todas" em mosaico). */
export function VistaCategoria({ cat, itens, onAbrir }) {
  const Vista = VISTAS[cat] || Mosaico;
  return <Vista itens={itens} cat={cat} onAbrir={onAbrir} />;
}

