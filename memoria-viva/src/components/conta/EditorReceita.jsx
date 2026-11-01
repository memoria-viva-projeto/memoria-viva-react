import { useLayoutEffect, useRef } from "react";
import Icone from "./Icone.jsx";
import { TextoLivre } from "./campos.jsx";
import { ComVoz, Microfone } from "./voz.jsx";
import { Miniatura } from "./midia.jsx";
import { Andamento, BotaoArquivos } from "./arquivos.jsx";
import Detalhes from "./Detalhes.jsx";

/** Ingredientes como lista: um por linha. Aceita o formato antigo (um texto com quebras de linha). */
export const listaDeIngredientes = (v) => (Array.isArray(v) ? v : (v || "").split("\n").map((l) => l.trim()).filter(Boolean));


/** Lista editável: Enter cria a próxima linha; apagar uma linha vazia volta para a anterior. */
function Ingredientes({ lista, onMudar }) {
  const linhas = lista.length ? lista : [""];
  // a linha nova recebe o foco logo que aparece (antes da próxima tecla)
  const focarEm = useRef(null);
  useLayoutEffect(() => {
    if (focarEm.current === null) return;
    document.getElementById(`cd-ing-${focarEm.current}`)?.focus();
    focarEm.current = null;
  });
  const focar = (k) => { focarEm.current = k; };
  const mudarLinha = (k, v) => onMudar(linhas.map((l, j) => (j === k ? v : l)));
  const novaDepois = (k) => { onMudar([...linhas.slice(0, k + 1), "", ...linhas.slice(k + 1)]); focar(k + 1); };
  const tirar = (k) => { onMudar(linhas.filter((_, j) => j !== k)); focar(Math.max(0, k - 1)); };

  return (
    <div className="cd-ings">
      <ul>
        {linhas.map((l, k) => (
          <li key={k}>
            <label className="sr" htmlFor={`cd-ing-${k}`}>Ingrediente {k + 1}</label>
            <input id={`cd-ing-${k}`} type="text" value={l} maxLength={160} autoComplete="off"
              placeholder={k === 0 ? "Ex.: 2 xícaras de fubá" : ""}
              onChange={(e) => mudarLinha(k, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); novaDepois(k); }
                if (e.key === "Backspace" && !l && linhas.length > 1) { e.preventDefault(); tirar(k); }
              }} />
            {(l || linhas.length > 1) && (
              <button type="button" className="cd-tirar" aria-label={`Tirar ${l || `o ingrediente ${k + 1}`}`} onClick={() => tirar(k)}>
                <Icone nome="fechar" tam={18} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="cd-ings-bt">
        <button type="button" className="btn btn-s btn-sm" onClick={() => novaDepois(linhas.length - 1)}><Icone nome="mais" />Mais um ingrediente</button>
        <Microfone rotulo="Falar um ingrediente" onTexto={(t) => onMudar([...linhas.filter((x) => x.trim()), t.replace(/[.!?]$/, "")])} />
      </div>
    </div>
  );
}

const usarExtra = (mudar) => (k) => (v) => mudar((y) => ({ ...y, extra: { ...y.extra, [k]: v } }));
const pratoDe = (m) => m.itens.find((it) => !it.anexo && it.tipo === "foto");

/** A folha do caderno (cada etapa é uma página). */
function Folha({ children }) {
  return <div className="cd-folha"><span className="cd-furos" aria-hidden="true" />{children}</div>;
}

/** Página 1: o nome, quem fazia e, se quiser, a foto do prato. */
function PaginaNome({ m, mudar, arquivos }) {
  const x = m.extra;
  const ex = usarExtra(mudar);
  const prato = pratoDe(m);
  return (
    <Folha>
      <div className="cd-cab">
        <div className="cd-nome">
          <label className="cd-rot" htmlFor="ge-titulo">Nome da receita</label>
          <ComVoz rotulo="Nome da receita" valor={m.titulo} onMudar={(v) => mudar({ titulo: v })}>
            <input id="ge-titulo" className="cd-titulo" type="text" maxLength={120} value={m.titulo} placeholder="Bolo de fubá da vó"
              onChange={(e) => mudar({ titulo: e.target.value })} autoComplete="off" />
          </ComVoz>
          <div className="cd-quem">
            <label htmlFor="cd-quem">Quem fazia</label>
            <ComVoz rotulo="Quem fazia" valor={x.quem} onMudar={ex("quem")}>
              <input id="cd-quem" type="text" maxLength={160} value={x.quem || ""} placeholder="Ex.: minha mãe, Dona Cida" onChange={(e) => ex("quem")(e.target.value)} />
            </ComVoz>
            <label htmlFor="cd-ocasioes">Quando era feita</label>
            <ComVoz rotulo="Quando era feita" valor={x.ocasioes} onMudar={ex("ocasioes")}>
              <input id="cd-ocasioes" type="text" maxLength={200} value={x.ocasioes || ""} placeholder="Ex.: café de domingo, festa junina" onChange={(e) => ex("ocasioes")(e.target.value)} />
            </ComVoz>
          </div>
        </div>
        <div className="cd-prato">
          {prato ? (
            <>
              <figure className="foto cd-prato-foto">
                <span className="tape t-uru" style={{ left: "50%", top: -12, transform: "translateX(-50%) rotate(4deg)" }} />
                <Miniatura arq={prato.arq} alt={`Foto do prato${m.titulo ? `: ${m.titulo}` : ""}`} />
              </figure>
              <button type="button" className="btn-l" onClick={() => mudar((y) => ({ ...y, itens: y.itens.filter((it) => it.arq !== prato.arq) }))}>
                <Icone nome="trocar" />Trocar a foto
              </button>
            </>
          ) : (
            <BotaoArquivos className="cd-sem-foto" rotulo="Foto do prato (se tiver)" icone="foto" disabled={!!arquivos.proc}
              onArquivos={(fs) => arquivos.juntar([...fs].slice(0, 1))} />
          )}
          <Andamento proc={arquivos.proc} aviso={arquivos.aviso} />
        </div>
      </div>
    </Folha>
  );
}

/** Página 2: a história, escrita livre, e o segredo de família. */
function PaginaHistoria({ m, mudar, sugestoes }) {
  const ex = usarExtra(mudar);
  return (
    <Folha>
      <section className="cd-sec">
        <label className="cd-rot" htmlFor="ge-desc">A história desta receita</label>
        <ComVoz rotulo="A história desta receita" valor={m.descricao} onMudar={(v) => mudar({ descricao: v })}>
          <TextoLivre id="ge-desc" className="cd-texto" valor={m.descricao} onMudar={(v) => mudar({ descricao: v })} maxLength={4000} linhas={3}
            placeholder="De onde ela vem, quem ensinou, que lembrança ela traz…" />
        </ComVoz>
      </section>
      <aside className="cd-segredo">
        <label className="cd-rot" htmlFor="cd-segredo">Segredo de família</label>
        <ComVoz rotulo="Segredo de família" valor={m.extra.segredos} onMudar={ex("segredos")}>
          <TextoLivre id="cd-segredo" className="cd-texto" valor={m.extra.segredos} onMudar={ex("segredos")} maxLength={2000} linhas={2}
            placeholder="O que só a família sabe. Ex.: a erva-doce, e o forno bem quente." />
        </ComVoz>
      </aside>
      <Detalhes m={m} mudar={mudar} sugestoes={sugestoes}
        rotulos={{ data: "Desde quando?", lugar: "De onde vem?", pessoas: "Pessoas ligadas a ela", legendaData: "De quando é a receita", legendaLugar: "De onde ela vem", exemploLugar: "Do sítio da família, em Minas", legendaPessoas: "Pessoas ligadas a ela" }} />
    </Folha>
  );
}

/** Página 3: ingredientes (lista rápida) e modo de preparo (escrita livre). */
function PaginaPreparo({ m, mudar }) {
  const ex = usarExtra(mudar);
  return (
    <Folha>
      <section className="cd-sec" aria-labelledby="cd-ing-t">
        <h2 id="cd-ing-t" className="cd-rot">Ingredientes</h2>
        <Ingredientes lista={listaDeIngredientes(m.extra.ingredientes)} onMudar={ex("ingredientes")} />
      </section>
      <section className="cd-sec">
        <label className="cd-rot" htmlFor="cd-preparo">Modo de preparo</label>
        <ComVoz rotulo="Modo de preparo" valor={m.extra.preparo} onMudar={ex("preparo")}>
          <TextoLivre id="cd-preparo" className="cd-texto" valor={m.extra.preparo} onMudar={ex("preparo")} maxLength={6000} linhas={4}
            placeholder="Escreva do seu jeito, como se estivesse explicando para alguém na cozinha." />
        </ComVoz>
      </section>
    </Folha>
  );
}

/** A receita pronta, na mesma folha (na prévia antes de guardar e na página da memória). */
export function FolhaLida({ m, completar }) {
  const x = m.extra;
  const ingredientes = listaDeIngredientes(x.ingredientes);
  const prato = pratoDe(m);
  const falta = (txt) => <p className="mv-convite">{txt} {completar}</p>;
  return (
    <article className="cd-folha cd-ler" aria-label={`Receita: ${m.titulo || "sem nome"}`}>
      <span className="cd-furos" aria-hidden="true" />
      <header className="cd-cab">
        <div className="cd-nome">
          <p className="cd-titulo">{m.titulo || "Receita sem nome"}</p>
          {(x.quem || x.ocasioes) && (
            <p className="cd-quem-ler">{x.quem && <>Quem fazia: <b>{x.quem}</b></>}{x.quem && x.ocasioes && <br />}{x.ocasioes && <>Quando era feita: <b>{x.ocasioes}</b></>}</p>
          )}
        </div>
        {prato && (
          <div className="cd-prato">
            <figure className="foto cd-prato-foto">
              <span className="tape t-uru" style={{ left: "50%", top: -12, transform: "translateX(-50%) rotate(4deg)" }} />
              <Miniatura arq={prato.arq} alt={`Foto do prato: ${m.titulo}`} />
            </figure>
          </div>
        )}
      </header>
      {m.descricao && <section className="cd-sec"><h2 className="cd-rot">A história desta receita</h2><p className="cd-texto">{m.descricao}</p></section>}
      <section className="cd-sec">
        <h2 className="cd-rot">Ingredientes</h2>
        {ingredientes.length ? <ul className="cd-lista">{ingredientes.map((l, k) => <li key={k}>{l}</li>)}</ul> : falta("Ainda não contados.")}
      </section>
      <section className="cd-sec">
        <h2 className="cd-rot">Modo de preparo</h2>
        {x.preparo ? <p className="cd-texto">{x.preparo}</p> : falta("Ainda não contado.")}
      </section>
      {x.segredos && <aside className="cd-segredo"><h2 className="cd-rot">Segredo de família</h2><p className="cd-texto">{x.segredos}</p></aside>}
    </article>
  );
}

/** A receita tem alguma coisa escrita (para poder guardar). */
export const receitaTemAlgo = (m) => !!(m.titulo || m.descricao || m.extra.preparo || m.extra.segredos || m.extra.quem
  || listaDeIngredientes(m.extra.ingredientes).some((l) => l.trim()) || pratoDe(m));

// Cada etapa é uma página do caderno.
export const PASSOS_RECEITA = [
  { id: "nome", titulo: "Qual é a receita?", dica: "Comece pelo nome. A foto do prato é só se tiver.", Corpo: PaginaNome, caderno: true,
    feito: (m) => !!(m.titulo || m.extra.quem || m.extra.ocasioes || pratoDe(m)) },
  { id: "historia", titulo: "A história da receita", dica: "Escreva livre, do seu jeito. Pode pular.", Corpo: PaginaHistoria, caderno: true,
    feito: (m) => !!(m.descricao || m.extra.segredos) },
  { id: "preparo", titulo: "Como se faz", dica: "Se não lembrar agora, pule: dá para completar outro dia.", Corpo: PaginaPreparo, caderno: true,
    feito: (m) => !!(m.extra.preparo || listaDeIngredientes(m.extra.ingredientes).some((l) => l.trim())) },
];
