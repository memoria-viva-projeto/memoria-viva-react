import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { EU, ehFamilia, geracoes, nomeDe, parentesco } from "./familia.js";

const NOME_GERACAO = { 3: "Bisavós", 2: "Avós", 1: "Pais", 0: "Sua geração", "-1": "Filhos", "-2": "Netos", "-3": "Bisnetos" };
const nomeGeracao = (g) => NOME_GERACAO[g] || (g > 0 ? `${g} gerações acima` : `${-g} gerações abaixo`);
const ZOOM_MIN = 0.3, ZOOM_MAX = 2;
const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
// zoom ao abrir e ao centralizar: o tamanho real dos retratos (nada encolhe para caber na tela)
const INICIAL = 1;

/** Monta as linhas da árvore: uma por geração, cada uma em ordem (filhos embaixo dos pais, casais lado a lado). Só a família entra. */
function montar(f, mostrar) {
  const gen = geracoes(f);
  const vivos = [EU, ...f.pessoas.filter((p) => !p.removida && ehFamilia(p)).map((p) => p.id)].filter((id) => !mostrar || mostrar.has(id));
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
 * Árvore da família numa janela de navegação livre, como um mapa: arrastar para qualquer lado, pinça, rodinha,
 * toque duplo, teclado e botões. Abre no tamanho real, centrada em você; nunca encolhe sozinha para caber.
 * mini = prévia do início: janela mais baixa, rodinha só com Ctrl (para não prender a página); tocar abre o perfil.
 * Sem mini, tocar numa pessoa a seleciona: as ligações dela ficam em destaque e onSelecionar recebe o id.
 * mostrar (opcional): só as pessoas desse conjunto (um ramo da família).
 * topo (opcional): o que fica por cima da árvore, no alto da janela (os ramos), como filtros sobre um mapa.
 *
 * As linhas são calculadas pela posição de cada pessoa dentro do desenho (offsetLeft/offsetTop), que não muda com o zoom:
 * o desenho inteiro (pessoas + linhas) é que é movido e ampliado junto, por transform.
 */
export default function Arvore({ f, mini, selecionada, onSelecionar, mostrar, topo }) {
  const linhas = montar(f, mostrar);
  const janela = useRef(null);
  const area = useRef(null);
  const nos = useRef(new Map());
  const vista = useRef({ x: 0, y: 0, s: 1 });
  const ocupado = useRef(null); // [x1, y1, x2, y2] das pessoas, dentro do desenho
  const quadros = useRef([]); // [x1, y1, x2, y2] de cada pessoa
  const [zoom, setZoom] = useState(1);
  const [tracos, setTracos] = useState({ w: 0, h: 0, caminhos: [], nozinhos: [] });

  // ---------- desenho das ligações ----------
  useLayoutEffect(() => {
    const desenhar = () => {
      const base = area.current;
      if (!base) return;
      // posição de um elemento dentro do desenho (somando os deslocamentos até a área)
      const desloc = (el) => {
        let x = 0, y = 0, e = el;
        while (e && e !== base) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
        return { x, y };
      };
      const pos = (id) => {
        const el = nos.current.get(id);
        if (!el) return null;
        const ft = el.querySelector(".av-foto");
        const o = desloc(ft), oc = desloc(el);
        return { x: o.x + ft.offsetWidth / 2, topo: o.y, base: oc.y + el.offsetHeight, meio: o.y + ft.offsetHeight / 2, larg: ft.offsetWidth };
      };
      const caminhos = [], nozinhos = [];
      const classeDe = (tipo, ...ids) => `av-l av-l-${tipo}${selecionada ? (ids.includes(selecionada) ? " on" : " fora") : ""}`;
      // galho com curvas nos cantos: desce de (x1, y1) até y, vai para o lado e desce até (x2, y2)
      const galho = (x1, y1, y, x2, y2) => {
        const r = Math.max(0, Math.min(16, Math.abs(x2 - x1) / 2, y - y1, y2 - y));
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
          const y = Math.min(e.topo, d.topo) - 12;
          caminhos.push({ d: `M${e.x} ${e.topo} V${y + 8} Q${e.x} ${y} ${e.x + 8} ${y} H${d.x - 8} Q${d.x} ${y} ${d.x} ${y + 8} V${d.topo}`, classe, id: l.id });
        }
      });
      // da mãe e do pai que faltam até mim (pontilhado)
      ["mae", "pai"].forEach((v) => {
        const a = pos(`vazio-${v}`), b = pos(EU);
        if (a && b) caminhos.push({ d: galho(a.x, a.base, a.base + (b.topo - a.base) / 2, b.x, b.topo), classe: "av-l av-l-vazio", id: v });
      });
      // a área ocupada pelas pessoas (para o limite de arrastar: o meio da janela nunca sai dela)
      const caixas = [...nos.current.keys()].map((id) => {
        const el = nos.current.get(id), o = desloc(el);
        return [o.x, o.y, o.x + el.offsetWidth, o.y + el.offsetHeight];
      });
      quadros.current = caixas;
      if (caixas.length) ocupado.current = caixas.reduce((c, b) => [Math.min(c[0], b[0]), Math.min(c[1], b[1]), Math.max(c[2], b[2]), Math.max(c[3], b[3])]);
      setTracos({ w: base.offsetWidth, h: base.offsetHeight, caminhos, nozinhos });
    };
    desenhar();
    const ro = new ResizeObserver(desenhar);
    ro.observe(area.current);
    document.fonts?.ready.then(desenhar);
    return () => ro.disconnect();
  }, [f, selecionada, mini, mostrar]);

  // ---------- mover e ampliar ----------
  // A janela mostra um pedaço de um espaço maior: o desenho fica no tamanho real (zoom 1) e se move livre.
  // O único limite é não deixar a árvore sumir: o meio da janela fica sempre sobre a área ocupada pelas pessoas.
  const aplicar = (v) => {
    const j = janela.current, a = area.current;
    if (!j || !a) return;
    const vw = j.clientWidth, vh = j.clientHeight;
    const [x1, y1, x2, y2] = ocupado.current || [0, 0, a.offsetWidth, a.offsetHeight];
    const x = limitar(v.x, vw / 2 - x2 * v.s, vw / 2 - x1 * v.s), y = limitar(v.y, vh / 2 - y2 * v.s, vh / 2 - y1 * v.s);
    vista.current = { x, y, s: v.s };
    a.style.transform = `translate(${x}px, ${y}px) scale(${v.s})`;
    setZoom(v.s);
  };
  // aproxima ou afasta mantendo parado o ponto (px, py) da janela: o que está sob os dedos (ou o mouse) fica no lugar
  const zoomEm = (px, py, fator) => {
    const v = vista.current;
    const s = limitar(v.s * fator, ZOOM_MIN, ZOOM_MAX);
    aplicar({ s, x: px - (px - v.x) * (s / v.s), y: py - (py - v.y) * (s / v.s) });
  };
  const doMeio = (fator) => zoomEm(janela.current.clientWidth / 2, janela.current.clientHeight / 2, fator);
  const verTudo = () => {
    const j = janela.current, a = area.current;
    const s = limitar(Math.min(j.clientWidth / a.offsetWidth, j.clientHeight / a.offsetHeight) * 0.94, ZOOM_MIN, 1);
    aplicar({ s, x: (j.clientWidth - a.offsetWidth * s) / 2, y: (j.clientHeight - a.offsetHeight * s) / 2 });
  };
  // ao soltar: se nenhuma pessoa ficou à vista, a árvore volta até a mais próxima (sem mudar o zoom)
  const garantirVisivel = () => {
    const j = janela.current, v = vista.current;
    if (!j || !quadros.current.length) return;
    const [l, t, r, b] = [-v.x / v.s, -v.y / v.s, (j.clientWidth - v.x) / v.s, (j.clientHeight - v.y) / v.s];
    if (quadros.current.some(([x1, y1, x2, y2]) => x2 > l && x1 < r && y2 > t && y1 < b)) return;
    const mx = (l + r) / 2, my = (t + b) / 2;
    const [x1, y1, x2, y2] = quadros.current.reduce((p, q) => (Math.hypot((q[0] + q[2]) / 2 - mx, (q[1] + q[3]) / 2 - my) < Math.hypot((p[0] + p[2]) / 2 - mx, (p[1] + p[3]) / 2 - my) ? q : p));
    aplicar({ s: v.s, x: j.clientWidth / 2 - ((x1 + x2) / 2) * v.s, y: j.clientHeight / 2 - ((y1 + y2) / 2) * v.s });
  };
  // enquadramento inicial: a pessoa (a escolhida, ou você) no meio, no tamanho real
  const centrar = (id = selecionada || EU, s = INICIAL) => {
    const el = nos.current.get(id), j = janela.current;
    if (!el) return;
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, e = el;
    while (e && e !== area.current) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    aplicar({ s, x: j.clientWidth / 2 - x * s, y: j.clientHeight / 2 - y * s });
  };

  // ao abrir (e a cada ramo novo): centrada em você, sem encolher para caber
  useLayoutEffect(() => { centrar(selecionada || EU); }, [mostrar]);
  // se o desenho mudar de tamanho (alguém entrou, as fontes carregaram), só confere os limites
  useLayoutEffect(() => { aplicar(vista.current); }, [tracos.w, tracos.h]);

  // dedos e mouse: um ponteiro arrasta, dois fazem pinça; toque duplo no fundo aproxima ali.
  // Um toque sem arrastar continua sendo um toque (escolhe ou abre a pessoa).
  const ponteiros = useRef(new Map());
  const gesto = useRef(null);
  const arrastou = useRef(false);
  const ultimoToque = useRef(null);
  const relativo = (e) => {
    const r = janela.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const comecar = () => {
    const ps = [...ponteiros.current.values()];
    if (ps.length === 1) gesto.current = { tipo: "mover", p0: ps[0], v0: { ...vista.current } };
    else if (ps.length >= 2) {
      const [a, b] = ps;
      gesto.current = { tipo: "pinca", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { ...vista.current } };
    } else gesto.current = null;
  };
  const soltar = (e) => {
    const p = ponteiros.current.get(e.pointerId);
    ponteiros.current.delete(e.pointerId);
    if (janela.current.hasPointerCapture?.(e.pointerId)) janela.current.releasePointerCapture(e.pointerId);
    // toque duplo no fundo (fora das pessoas): aproxima naquele ponto
    if (p && !arrastou.current && ponteiros.current.size === 0 && !e.target.closest?.(".av-no")) {
      const t = ultimoToque.current, agora = e.timeStamp;
      if (t && agora - t.em < 320 && Math.hypot(p.x - t.x, p.y - t.y) < 30) { zoomEm(p.x, p.y, 1.6); ultimoToque.current = null; }
      else ultimoToque.current = { ...p, em: agora };
    }
    if (ponteiros.current.size === 0) garantirVisivel();
    comecar();
  };
  const eventos = {
    onPointerDown: (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ponteiros.current.set(e.pointerId, relativo(e));
      if (ponteiros.current.size === 1) arrastou.current = false;
      // com dois dedos, os dois passam a ser da janela (nenhum vira "toque" numa pessoa)
      if (ponteiros.current.size === 2) ponteiros.current.forEach((_, id) => { try { janela.current.setPointerCapture(id); } catch { /* ponteiro já saiu */ } });
      comecar();
    },
    onPointerMove: (e) => {
      if (!ponteiros.current.has(e.pointerId)) return;
      ponteiros.current.set(e.pointerId, relativo(e));
      const g = gesto.current;
      if (!g) return;
      if (g.tipo === "mover") {
        const p = ponteiros.current.get(e.pointerId);
        const dx = p.x - g.p0.x, dy = p.y - g.p0.y;
        if (!arrastou.current && Math.hypot(dx, dy) < 6) return;
        if (!arrastou.current) { arrastou.current = true; janela.current.setPointerCapture(e.pointerId); }
        aplicar({ ...g.v0, x: g.v0.x + dx, y: g.v0.y + dy });
      } else {
        const [a, b] = [...ponteiros.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const s = limitar(g.v0.s * (d / g.d0), ZOOM_MIN, ZOOM_MAX);
        // o ponto do desenho que estava entre os dedos no começo continua entre os dedos (e acompanha se eles andarem)
        const cx = (g.m0.x - g.v0.x) / g.v0.s, cy = (g.m0.y - g.v0.y) / g.v0.s;
        arrastou.current = true;
        aplicar({ s, x: m.x - cx * s, y: m.y - cy * s });
      }
    },
    onPointerUp: soltar,
    onPointerCancel: soltar,
    // depois de arrastar, o "clique" que o navegador manda não deve abrir ninguém
    onClickCapture: (e) => { if (arrastou.current) { e.preventDefault(); e.stopPropagation(); arrastou.current = false; } },
    onDoubleClick: (e) => { if (!e.target.closest(".av-no")) { const p = relativo(e); zoomEm(p.x, p.y, 1.6); } },
    onKeyDown: (e) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const v = vista.current, passo = 60;
      const acoes = {
        ArrowLeft: () => aplicar({ ...v, x: v.x + passo }), ArrowRight: () => aplicar({ ...v, x: v.x - passo }),
        ArrowUp: () => aplicar({ ...v, y: v.y + passo }), ArrowDown: () => aplicar({ ...v, y: v.y - passo }),
        "+": () => doMeio(1.2), "=": () => doMeio(1.2), "-": () => doMeio(1 / 1.2), 0: () => centrar(),
      };
      if (acoes[e.key] && (e.target === janela.current || e.key.length === 1)) { e.preventDefault(); acoes[e.key](); }
    },
  };

  // rodinha do mouse (e a pinça do touchpad): aproxima e afasta no ponto do mouse.
  // Na prévia do início, só com Ctrl, para a rodinha continuar rolando a página.
  useEffect(() => {
    const j = janela.current;
    const rodar = (e) => {
      if (mini && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = relativo(e);
      zoomEm(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)));
    };
    j.addEventListener("wheel", rodar, { passive: false });
    return () => j.removeEventListener("wheel", rodar);
  }, [mini]);

  // a pessoa escolhida fora da tela (pela lista, por exemplo) vem para o meio
  // a pessoa escolhida que ficou fora da janela (pela lista, por exemplo) vem para o meio, sem mudar o zoom
  useEffect(() => {
    const el = selecionada && nos.current.get(selecionada);
    if (!el) return;
    const r = el.getBoundingClientRect(), j = janela.current.getBoundingClientRect();
    if (r.left < j.left || r.right > j.right || r.top < j.top || r.bottom > j.bottom) centrar(selecionada, vista.current.s);
  }, [selecionada]);

  const guardar = (id) => (el) => (el ? nos.current.set(id, el) : nos.current.delete(id));
  const tam = mini ? 88 : 104;

  return (
    <div className={`av-parede${mini ? " av-mini" : ""}`}>
      {topo && <div className="av-topo">{topo}</div>}
      <div ref={janela} className="av-janela" tabIndex={0} {...eventos} role="group"
        aria-label="Árvore da família. Arraste para mover; use os botões, a pinça ou as teclas + e − para aproximar e afastar.">
        <div className="av-arvore" ref={area}>
          <svg className="av-linhas" width={tracos.w} height={tracos.h} aria-hidden="true">
            {tracos.caminhos.map((c) => <path key={c.id} d={c.d} className={c.classe} />)}
            {tracos.nozinhos.map((n) => (
              <path key={`n-${n.id}`} className={n.classe}
                d={`M${n.x} ${n.y + 6} C${n.x - 10} ${n.y - 1} ${n.x - 6} ${n.y - 10} ${n.x} ${n.y - 4.5} C${n.x + 6} ${n.y - 10} ${n.x + 10} ${n.y - 1} ${n.x} ${n.y + 6}Z`} />
            ))}
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
                          <span className="av-foto"><span className="av-vazio-ic" style={{ width: tam, height: tam }}><Icone nome="mais" tam={mini ? 26 : 36} /></span><span className="av-nome">{n.nome}</span></span>
                          <span className="av-par">a contar</span>
                        </Link>
                      </li>
                    );
                  }
                  const p = f.pessoas.find((q) => q.id === n.id);
                  const conteudo = (
                    <>
                      <span className="av-foto">
                        {n.id === EU && <span className="tape t-gema" aria-hidden="true" />}
                        <Avatar id={n.id} tam={tam} forma="quadrada" />
                        <span className="av-nome">{nomeDe(f, n.id)}</span>
                      </span>
                      <span className="av-par">{parentesco(f, n.id)}{p?.faleceu ? " · em memória" : ""}</span>
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
      <div className="av-controles" role="group" aria-label="Aproximar e mover a árvore">
        <button type="button" className="rl-bt" onClick={() => doMeio(1.25)} disabled={zoom >= ZOOM_MAX}><Icone nome="mais" /><span className="sr">Aproximar</span></button>
        <button type="button" className="rl-bt av-menos" onClick={() => doMeio(1 / 1.25)} disabled={zoom <= ZOOM_MIN}><span aria-hidden="true">−</span><span className="sr">Afastar</span></button>
        <button type="button" className="rl-bt" onClick={() => centrar()}><Icone nome="pin" /><span className="sr">{selecionada ? `Centralizar em ${nomeDe(f, selecionada)}` : "Centralizar (voltar ao começo)"}</span></button>
        <button type="button" className="rl-bt" onClick={verTudo}><Icone nome="ver" /><span className="sr">Ver a árvore inteira</span></button>
      </div>
    </div>
  );
}
