import { useLayoutEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { EU, geracoes, nomeDe, parentesco } from "./familia.js";

const NOME_GERACAO = { 3: "Bisavós", 2: "Avós", 1: "Pais", 0: "Sua geração", "-1": "Filhos", "-2": "Netos", "-3": "Bisnetos" };
const nomeGeracao = (g) => NOME_GERACAO[g] || (g > 0 ? `${g} gerações acima` : `${-g} gerações abaixo`);

/** Monta as linhas da árvore: uma por geração, cada uma em ordem (filhos embaixo dos pais, casais lado a lado). */
function montar(f, mostrar) {
  const gen = geracoes(f);
  const vivos = [EU, ...f.pessoas.filter((p) => !p.removida).map((p) => p.id)].filter((id) => !mostrar || mostrar.has(id));
  const porGeracao = new Map();
  vivos.forEach((id) => {
    const g = gen.has(id) ? gen.get(id) : 0;
    if (!porGeracao.has(g)) porGeracao.set(g, []);
    porGeracao.get(g).push(id);
  });

  // lugares vazios: a mãe e o pai de quem é dona da conta, se ainda não foram contados
  const paisDeMim = f.lacos.filter((l) => l.tipo === "pais" && l.para === EU && !l.modo).map((l) => (f.pessoas.find((p) => p.id === l.de) || {}).genero);
  // (num ramo, os lugares vazios não aparecem)
  const vazios = [];
  if (!mostrar && !paisDeMim.includes("f") && !paisDeMim.includes("")) vazios.push({ vazio: "mae", nome: "Sua mãe" });
  if (!mostrar && !paisDeMim.includes("m") && !paisDeMim.includes("")) vazios.push({ vazio: "pai", nome: "Seu pai" });
  if (vazios.length && !porGeracao.has(1)) porGeracao.set(1, []);

  const ordem = new Map();
  const linhas = [...porGeracao.keys()].sort((a, b) => b - a).map((g) => {
    const acima = (id) => f.lacos.filter((l) => l.para === id && (l.tipo === "pais" || l.tipo === "avos" || l.tipo === "tios")).map((l) => ordem.get(l.de)).filter((x) => x !== undefined);
    let ids = porGeracao.get(g)
      .map((id, k) => ({ id, k, chave: Math.min(...acima(id), 1e6) }))
      .sort((a, b) => a.chave - b.chave || a.k - b.k).map((x) => x.id);
    // casais lado a lado
    const arrumada = [];
    ids.forEach((id) => {
      if (arrumada.includes(id)) return;
      arrumada.push(id);
      f.lacos.filter((l) => l.tipo === "conjuge" && (l.de === id || l.para === id)).forEach((l) => {
        const outro = l.de === id ? l.para : l.de;
        if (ids.includes(outro) && !arrumada.includes(outro)) arrumada.push(outro);
      });
    });
    ids = arrumada;
    ids.forEach((id, k) => ordem.set(id, g * 1000 + k));
    return { g, nos: [...(g === 1 ? vazios : []), ...ids.map((id) => ({ id }))] };
  });
  return linhas;
}

/**
 * Árvore da família. mini = prévia (fotos menores, tocar abre o perfil).
 * Sem mini, tocar numa pessoa a seleciona: as ligações dela ficam em destaque e onSelecionar recebe o id.
 * mostrar (opcional): só as pessoas desse conjunto (um ramo da família).
 */
export default function Arvore({ f, mini, selecionada, onSelecionar, mostrar }) {
  const linhas = montar(f, mostrar);
  const area = useRef(null);
  const nos = useRef(new Map());
  const [tracos, setTracos] = useState({ w: 0, h: 0, caminhos: [] });

  // as linhas entre as pessoas são desenhadas depois que todos estão no lugar (e de novo se o tamanho muda)
  useLayoutEffect(() => {
    const desenhar = () => {
      const base = area.current?.getBoundingClientRect();
      if (!base) return;
      const pos = (id) => {
        const el = nos.current.get(id);
        if (!el) return null;
        const r = el.querySelector(".av-foto").getBoundingClientRect();
        const caixa = el.getBoundingClientRect(); // a linha para os filhos sai de baixo do nome
        return { x: r.left - base.left + r.width / 2, topo: r.top - base.top, base: caixa.bottom - base.top, meio: r.top - base.top + r.height / 2, larg: r.width };
      };
      const caminhos = [], nozinhos = [];
      const classeDe = (tipo, ...ids) => `av-l av-l-${tipo}${selecionada ? (ids.includes(selecionada) ? " on" : " fora") : ""}`;
      // galho com curvas nos cantos: desce de (x1, y1) até y, vai para o lado e desce até (x2, y2)
      const galho = (x1, y1, y, x2, y2) => {
        const r = Math.max(0, Math.min(14, Math.abs(x2 - x1) / 2, y - y1, y2 - y));
        if (r < 2) return `M${x1} ${y1} V${y} H${x2} V${y2}`;
        const s = Math.sign(x2 - x1);
        return `M${x1} ${y1} V${y - r} Q${x1} ${y} ${x1 + s * r} ${y} H${x2 - s * r} Q${x2} ${y} ${x2} ${y + r} V${y2}`;
      };
      const casados = (a, b) => f.lacos.some((l) => l.tipo === "conjuge" && ((l.de === a && l.para === b) || (l.de === b && l.para === a)));

      // filho de um casal: um galho só, saindo do meio da linha do casal
      const feitos = new Set();
      const paisDe = new Map();
      f.lacos.filter((l) => l.tipo === "pais").forEach((l) => paisDe.set(l.para, [...(paisDe.get(l.para) || []), l]));
      paisDe.forEach((ls, filho) => {
        if (ls.length !== 2 || !casados(ls[0].de, ls[1].de)) return;
        const [a, b, c] = [pos(ls[0].de), pos(ls[1].de), pos(filho)];
        if (!a || !b || !c || Math.abs(a.meio - b.meio) > 2) return;
        const x = (a.x + b.x) / 2, y = (Math.max(a.base, b.base) + c.topo) / 2;
        caminhos.push({ d: galho(x, a.meio, y, c.x, c.topo), classe: classeDe("pais", ls[0].de, ls[1].de, filho), id: `casal-${filho}` });
        ls.forEach((l) => feitos.add(l.id));
      });

      f.lacos.forEach((l) => {
        if (feitos.has(l.id)) return;
        const a = pos(l.de), b = pos(l.para);
        if (!a || !b) return;
        const classe = classeDe(l.tipo, l.de, l.para);
        if (["pais", "avos", "tios", "sogros"].includes(l.tipo)) {
          const [cima, baixo] = a.topo < b.topo ? [a, b] : [b, a];
          caminhos.push({ d: galho(cima.x, cima.base, cima.base + (baixo.topo - cima.base) / 2, baixo.x, baixo.topo), classe, id: l.id });
        } else if (l.tipo === "conjuge") {
          const [e, d] = a.x < b.x ? [a, b] : [b, a];
          caminhos.push({ d: `M${e.x + e.larg / 2} ${e.meio} H${d.x - d.larg / 2}`, classe, id: l.id });
          nozinhos.push({ x: (e.x + e.larg / 2 + d.x - d.larg / 2) / 2, y: e.meio, classe: classe.replace("av-l ", "av-no-casal "), id: l.id });
        } else {
          const [e, d] = a.x < b.x ? [a, b] : [b, a];
          const y = Math.min(e.topo, d.topo) - 10;
          caminhos.push({ d: `M${e.x} ${e.topo} V${y + 8} Q${e.x} ${y} ${e.x + 8} ${y} H${d.x - 8} Q${d.x} ${y} ${d.x} ${y + 8} V${d.topo}`, classe, id: l.id });
        }
      });
      // da mãe e do pai que faltam até mim (pontilhado)
      ["mae", "pai"].forEach((v) => {
        const a = pos(`vazio-${v}`), b = pos(EU);
        if (a && b) caminhos.push({ d: galho(a.x, a.base, a.base + (b.topo - a.base) / 2, b.x, b.topo), classe: "av-l av-l-vazio", id: v });
      });
      setTracos({ w: area.current.scrollWidth, h: area.current.scrollHeight, caminhos, nozinhos });
    };
    desenhar();
    const ro = new ResizeObserver(desenhar);
    ro.observe(area.current);
    document.fonts?.ready.then(desenhar);
    return () => ro.disconnect();
  }, [f, selecionada, mini, mostrar]);

  // ao abrir, a árvore fica centrada em quem é dona da conta (no celular, o resto se vê arrastando para o lado)
  const rolagem = useRef(null);
  useLayoutEffect(() => {
    const r = rolagem.current, eu = nos.current.get(EU);
    if (!r || !eu || r.scrollWidth <= r.clientWidth) return;
    const a = eu.getBoundingClientRect(), b = r.getBoundingClientRect();
    r.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2);
  }, []);

  const guardar = (id) => (el) => (el ? nos.current.set(id, el) : nos.current.delete(id));

  return (
    <div ref={rolagem} className={`av-rolagem${mini ? " av-mini" : ""}`}>
      <div className="av-arvore" ref={area}>
        <svg className="av-linhas" width={tracos.w} height={tracos.h} aria-hidden="true">
          {tracos.caminhos.map((c) => <path key={c.id} d={c.d} className={c.classe} />)}
          {(tracos.nozinhos || []).map((n) => <circle key={`n-${n.id}`} cx={n.x} cy={n.y} r={6} className={n.classe} />)}
        </svg>
        {linhas.map(({ g, nos: lista }) => (
          <section key={g} className="av-geracao" aria-label={nomeGeracao(g)}>
            <p className="av-gen-nome">{nomeGeracao(g)}</p>
            <ul className="av-linha">
              {lista.map((n) => {
                if (n.vazio) {
                  return (
                    <li key={n.vazio} ref={guardar(`vazio-${n.vazio}`)}>
                      <Link className="av-no av-vazio" para={`${ROTAS.familia}/novo?de=${EU}&rel=${n.vazio}`}>
                        <span className="av-foto"><Icone nome="mais" tam={mini ? 26 : 36} /></span>
                        <span className="av-nome">{n.nome}</span>
                        <span className="av-par">a contar</span>
                      </Link>
                    </li>
                  );
                }
                const conteudo = (
                  <>
                    <span className="av-foto"><Avatar id={n.id} tam={mini ? 64 : 96} /></span>
                    <span className="av-nome">{nomeDe(f, n.id)}</span>
                    <span className="av-par">{parentesco(f, n.id)}{f.pessoas.find((p) => p.id === n.id)?.faleceu ? " · em memória" : ""}</span>
                  </>
                );
                return (
                  <li key={n.id} ref={guardar(n.id)}>
                    {mini || !onSelecionar
                      ? <Link className={`av-no${n.id === EU ? " av-eu" : ""}`} para={n.id === EU ? ROTAS.perfil : `${ROTAS.familia}/${n.id}`}>{conteudo}</Link>
                      : <button type="button" className={`av-no${n.id === EU ? " av-eu" : ""}${selecionada === n.id ? " on" : ""}`} aria-pressed={selecionada === n.id}
                          onClick={() => onSelecionar(selecionada === n.id ? null : n.id)}>{conteudo}</button>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
