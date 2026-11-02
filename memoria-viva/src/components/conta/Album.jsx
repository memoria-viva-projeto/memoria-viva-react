import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { FotoMarcada } from "./pessoas.jsx";
import { Miniatura, useArquivo } from "./midia.jsx";
import { Comentarios, Reacoes } from "./interacoes.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";
import { chaveDaFoto, fotosDe, lerArquivo, nomeEtiqueta, textoData, textoQuando } from "./guardados.js";
import { comentariosDe, contextoDaFoto } from "./comentarios.js";
import { ehOcasiao } from "./memorias.js";

// O álbum de fotografias em três lugares, sempre com as mesmas fotos e os mesmos comentários:
// - no feed: deslizar entre as fotos sem sair da publicação (CarrosselAlbum);
// - na página do álbum: folhear como um álbum de verdade, em páginas (Folhear);
// - uma foto aberta, grande, com as reações e os comentários só dela (VerFoto).
// Nada nas páginas é inventado: legendas, datas, ocasiões, observações e balões vêm do que a família guardou.

const nomes = (refs) => refs.map((p) => pessoa(p).nome).join(", ");
const nomeDe = (id) => (id === CONTA.pessoa.id ? CONTA.pessoa.nome : pessoa(id).nome); // no álbum, o nome de quem escreveu (não "Você")
const editando = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
const poucoMovimento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.movimento === "menos";

/** Uma foto com o botão de mostrar quem está nela, como nas redes sociais. */
export function FotoComPessoas({ it, alt }) {
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

/**
 * Uma foto do álbum, grande: legenda, data, local, pessoas, observação, e as reações e comentários só dela
 * (separados dos do álbum). Setas do teclado passam de foto.
 */
export function VerFoto({ x, k, onIr, guardados, onReagir, onComentar, onApagar }) {
  const fotos = fotosDe(x.m);
  const it = fotos[k];
  const chave = chaveDaFoto(it);
  const coms = comentariosDe(x, guardados, chave);
  const [comentando, setComentando] = useState(false);
  const data = textoQuando(it) || x.quando;
  const lugar = it.lugar || x.lugar;
  const marcas = it.marcas.map((y) => y.p);

  useEffect(() => {
    const tecla = (e) => {
      if (editando(e)) return;
      if (e.key === "ArrowLeft" && k > 0) onIr(k - 1);
      if (e.key === "ArrowRight" && k < fotos.length - 1) onIr(k + 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [k, fotos.length, onIr]);

  return (
    <div className="vf">
      <FotoComPessoas key={it.arq} it={it} alt={it.legenda || `Foto ${k + 1} de “${x.titulo}”`} />
      {it.legenda && <p className="vf-leg">{it.legenda}</p>}
      {(data || lugar) && <p className="mv-meta">{[data, lugar].filter(Boolean).join(" · ")}{!textoQuando(it) && x.quando ? " (do álbum)" : ""}</p>}
      {marcas.length > 0 && <p><b>Nesta foto:</b> {nomes(marcas)}</p>}
      {it.observacao && <p className="mv-texto">{it.observacao}</p>}

      <div className="vf-reage">
        <Reacoes coms={coms} rotulo="Ações para esta foto" comentando={comentando} onComentar={() => setComentando((c) => !c)} onReagir={(t) => onReagir(t, chave)} />
        <Comentarios x={x} chave={chave} sobre="esta foto" coms={coms} aberto={comentando} onAbrir={() => setComentando(true)}
          onComentar={(t) => onComentar(t, chave)} onApagar={onApagar} />
      </div>
      <details className="mm-ctx">
        <summary>O que a IA vai saber sobre esta foto</summary>
        <p className="ed-dica">Só esta foto e o que vale para o álbum todo. As outras fotos não entram.</p>
        <pre>{contextoDaFoto(x, chave, guardados).texto}</pre>
      </details>

      <div className="fe-nav">
        <button type="button" className="btn btn-s" disabled={k === 0} onClick={() => onIr(k - 1)}><Icone nome="voltar" />Anterior</button>
        <span>{k + 1} de {fotos.length}</span>
        <button type="button" className="btn btn-s" disabled={k === fotos.length - 1} onClick={() => onIr(k + 1)}>Próxima<Icone nome="seguir" /></button>
      </div>
    </div>
  );
}

// ---------------- no feed: as fotos lado a lado, para deslizar ----------------

function FotoDoSlide({ arq }) {
  const r = useArquivo(arq, false);
  return r ? <img className="ab-slide-img" src={r.url} alt="" draggable={false} /> : <span className="ab-slide-vazio" />;
}

/**
 * Todas as fotos do álbum dentro da publicação: deslizar (dedo ou trackpad), ou Anterior/Próxima.
 * "2 de 15" discreto em cima; tocar numa foto abre grande. Só carrega a foto da vez e as vizinhas.
 * children: o que fica por cima das fotos (o botão de quem está).
 */
export function CarrosselAlbum({ x, onAbrirFoto, children }) {
  const fotos = fotosDe(x.m);
  const [atual, setAtual] = useState(0);
  const [vistas, setVistas] = useState(() => new Set([0, 1]));
  const trilho = useRef(null);
  const n = fotos.length;

  const aoRolar = () => {
    const el = trilho.current;
    const k = Math.round(el.scrollLeft / el.clientWidth);
    if (k === atual) return;
    setAtual(k);
    setVistas((v) => (v.has(k - 1) && v.has(k + 1) ? v : new Set([...v, k - 1, k, k + 1])));
  };
  const ir = (k) => {
    const el = trilho.current;
    el.scrollTo({ left: Math.max(0, Math.min(n - 1, k)) * el.clientWidth, behavior: poucoMovimento() ? "auto" : "smooth" });
  };
  const tecla = (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(atual - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); ir(atual + 1); }
  };
  const legenda = fotos[atual]?.legenda;

  return (
    <div className="ab-car">
      <div className="ab-palco">
        <div className="ab-trilho" ref={trilho} onScroll={aoRolar} onKeyDown={tecla} role="group" aria-roledescription="carrossel" aria-label={`Fotos do álbum ${x.titulo}`}>
          {fotos.map((it, k) => (
            <button key={it.arq} type="button" className="ab-slide" onClick={() => onAbrirFoto(k)} tabIndex={k === atual ? 0 : -1}
              aria-label={`Ver maior a foto ${k + 1} de ${n}${it.legenda ? `: ${it.legenda}` : ""}`}>
              <FotoDoSlide arq={vistas.has(k) ? it.arq : null} />
            </button>
          ))}
        </div>
        <span className="mm-selo-midia ab-conta" aria-hidden="true">{atual + 1} de {n}</span>
        {children}
      </div>
      <span className="sr" aria-live="polite">Foto {atual + 1} de {n}</span>
      <div className="ab-car-nav">
        <button type="button" className="btn-l" disabled={atual === 0} onClick={() => ir(atual - 1)}><Icone nome="voltar" tam={20} />Anterior</button>
        <span className="ab-pontos" aria-hidden="true">
          {n <= 7 ? fotos.map((it, k) => <i key={it.arq} className={k === atual ? "on" : ""} />) : <b>{atual + 1} / {n}</b>}
        </span>
        <button type="button" className="btn-l" disabled={atual === n - 1} onClick={() => ir(atual + 1)}>Próxima<Icone nome="seguir" tam={20} /></button>
      </div>
      {legenda && <p className="ab-car-leg mao">{legenda}</p>}
    </div>
  );
}

// ---------------- na página do álbum: folhear ----------------

/** Proporção (largura ÷ altura) de cada foto, lida do arquivo guardado. Enquanto não chega, vale "deitada". */
function useProporcoes(fotos) {
  const [p, setP] = useState({});
  const chaves = fotos.map((it) => it.arq).join("|");
  useEffect(() => {
    let vivo = true;
    Promise.all(fotos.map((it) => lerArquivo(it.arq).then((a) => [it.arq, a?.largura && a?.altura ? a.largura / a.altura : null]).catch(() => [it.arq, null])))
      .then((l) => vivo && setP(Object.fromEntries(l)));
    return () => { vivo = false; };
  }, [chaves]); // eslint-disable-line react-hooks/exhaustive-deps
  return p;
}


// ---------------- o kit de scrapbook (public/img/scrapbook) ----------------
// Recortes limpos do kit memoria_viva_kit_scrapbook (elementos individuais e adesivos tirados das pranchas 02 e 05).
// Prendedores seguram as fotos; enfeites decoram os cantos livres.
const KIT = "/img/scrapbook/";
const ENFEITES = {
  sol: "sol_desenhado.png", hibisco: "flor_hibisco.png", folhagem: "folhagem.png", manga: "manga.png", goiaba: "goiaba.png",
  laco: "laco_colorido.png", flor: "flor_sorridente.png", ticket: "ticket_de_recordacao.png", selo: "moldura_selo.png",
  camera: "camera.png", filme: "filme.png", relogio: "relogio.png", vinil: "vinil.png", radio: "radio.png", fones: "fones.png",
  carta: "carta.png", coracao: "coracao.png", estrela: "estrela.png", girassol: "girassol.png", mala: "mala.png", globo: "globo.png",
  aviao: "aviao.png", coco: "coco.png", guardasol: "guarda_sol.png", palmeira: "selo_palmeira.png", cupcake: "cupcake.png",
};

// Os enfeites combinam com a lembrança: pelo que a família escreveu (título, legendas, lugar) e pelas ocasiões marcadas.
const TEMAS = [
  ["praia", /praia|\bmar\b|litoral|beira-mar|ver[ãa]o|piscina|\bilha\b|coqueir/, ["guardasol", "coco", "sol", "hibisco", "palmeira"]],
  ["festa", /anivers|festa|parab[ée]ns|\bbolo\b|formatura|comemora/, ["cupcake", "laco", "estrela", "flor"]],
  ["viagem", /viagem|passeio|f[ée]rias|excurs|estrada|rodovi[áa]ria|aeroporto|avi[ãa]o/, ["mala", "globo", "ticket", "aviao", "selo"]],
  ["musica", /m[úu]sica|can[çc][ãa]o|\bdisco|vinil|r[áa]dio|\bbaile|samba|forr[óo]|seresta|viol[ãa]o/, ["vinil", "radio", "fones"]],
  ["quintal", /quintal|s[íi]tio|fazenda|ro[çc]a|pomar|manga|goiaba|fruta|horta/, ["manga", "goiaba", "girassol", "folhagem"]],
  ["familia", /casamento|natal|reuni[ãa]o|fam[íi]lia|vov[óô]|\bav[óô]\b|batizado/, ["coracao", "carta", "laco", "girassol"]],
  ["antiga", null, ["camera", "filme", "relogio", "selo"]],
];
const TEMA_DA_ETIQUETA = { aniversario: "festa", festa: "festa", formatura: "festa", viagem: "viagem", casamento: "familia", natal: "familia", reuniao: "familia", antigamente: "antiga", "meus-pais": "antiga" };
const SEM_TEMA = ["folhagem", "girassol", "hibisco", "estrela"]; // brasileiros e neutros, quando nada diz o contrário

/** Os enfeites que combinam com este álbum (e quais temas foram reconhecidos). */
export function enfeitesDo(x, fotos) {
  const texto = [x.titulo, x.texto, x.lugar, ...fotos.flatMap((it) => [it.legenda, it.observacao, it.lugar])].filter(Boolean).join(" ").toLowerCase();
  const etiquetas = [...(x.m.etiquetas || []), ...fotos.flatMap((it) => it.etiquetas || [])];
  const antiga = (x.tempo?.decadas || []).some((d) => d < 1980);
  const temas = TEMAS.filter(([nome, re]) => (re && re.test(texto)) || etiquetas.some((e) => TEMA_DA_ETIQUETA[e] === nome) || (nome === "antiga" && antiga));
  // intercala os temas (um de cada), para a página variar sem misturar demais
  const listas = temas.map((t) => t[2]);
  const lista = [];
  for (let i = 0; i < 6; i += 1) listas.forEach((l) => l[i] && !lista.includes(l[i]) && lista.push(l[i]));
  return { temas: temas.map((t) => t[0]), lista: lista.length ? lista : SEM_TEMA };
}

// como cada foto fica presa: nunca dois iguais na mesma página
const PRESAS = ["alfinete", "fita", "clipe", "cantos", "fitas", "solta"];
const NA_BORDA_DE_CIMA = new Set(["alfinete", "fita", "clipe", "fitas"]);
const FITAS = ["t-gema", "t-turq", "t-papel"];
// o recorte de papel atrás de algumas fotos (dá camadas, como num álbum montado à mão)
const PAPEIS = ["kraft", "gema", "turquesa", "quadriculado", "urucum"];
// rabiscos feitos à mão (sem nenhuma informação: só enfeite), desenhados num quadrado de 40
const RABISCOS = {
  coracao: "M20 34c-9-6-15-12-15-19 0-5 4-8 8-8 3 0 6 2 7 5 1-3 4-5 7-5 4 0 8 3 8 8 0 7-6 13-15 19z",
  estrela: "M20 5l4 10.5 11.5.5-9 7 3.2 11.2L20 28l-9.6 6.3 3.1-11.1-9-7.1L16 15.5z",
  brilhos: "M9 5v9M4.5 9.5h9M29 4v7M25.5 7.5h7M31 24v10M26 29h10M15 27v5M12.5 29.5h5",
  espiral: "M21 21c2-2 5 0 4 3-1 4-7 4-8-1-1-6 6-9 11-6 6 4 4 13-3 15-8 2-15-5-12-13 2-6 9-10 16-8",
};

// ---------------- as composições ----------------
// Posições em % da página (x e largura da largura; y e altura da altura). r: [x, y, largura, altura] da região da foto.
// A foto fica inteira, do maior tamanho que couber, encostada em "a" (c centro; t/b/l/r lados; tl/tr/bl/br cantos):
// as fotos de uma página encostam umas nas outras, formando um grupo. g: giro em graus.
// papel: recorte atrás [x, y, l, a, giro]; nota: onde vai o bilhete ou o balão; livres: cantos para enfeites [x, y, l, giro].
// "d": páginas do computador (largura ÷ altura ≈ .72). "c": celular (página em pé e estreita, até duas fotos, fotos maiores).
const MODELOS = {
  destaque: {
    d: { fotos: [{ r: [8, 6, 84, 66], g: -1.5, a: "c" }], papel: [0, 26, 100, 18, -3], nota: [10, 75, 56, 21], livres: [[70, 77, 22, 8], [2, 24, 15, -10], [84, 48, 14, 10]] },
    c: { fotos: [{ r: [5, 5, 90, 70], g: -1.5, a: "c" }], papel: [0, 24, 100, 18, -3], nota: [8, 77, 60, 20], livres: [[74, 79, 22, 6], [2, 2, 16, -10], [82, 2, 16, 10]] },
  },
  "destaque-deitada": {
    d: { fotos: [{ r: [4, 16, 92, 52], g: 1.5, a: "c" }], papel: [0, 30, 100, 18, -2], nota: [10, 70, 58, 26], livres: [[74, 72, 20, 6], [6, 3, 18, -8], [76, 3, 18, 8]] },
    c: { fotos: [{ r: [3, 18, 94, 46], g: 1.5, a: "c" }], papel: [0, 30, 100, 18, -2], nota: [8, 66, 64, 30], livres: [[72, 3, 24, 8], [4, 3, 22, -8], [76, 70, 22, 6]] },
  },
  bilhete: {
    d: { fotos: [{ r: [5, 4, 90, 54], g: 1.2, a: "b" }], nota: [10, 60, 64, 36], livres: [[78, 64, 18, 8], [80, 86, 15, -6]] },
    c: { fotos: [{ r: [3, 3, 94, 52], g: 1.2, a: "b" }], nota: [5, 57, 74, 40], livres: [[80, 62, 18, 8]] },
  },
  "bilhete-lado": {
    d: { fotos: [{ r: [4, 5, 60, 62], g: -1.5, a: "r" }], nota: [52, 58, 44, 38], livres: [[70, 8, 24, 8], [4, 74, 20, -8]] },
    c: { fotos: [{ r: [6, 3, 88, 56], g: -1.5, a: "b" }], nota: [6, 61, 82, 36], livres: [[82, 64, 16, 8]] },
  },
  diagonal: {
    d: { fotos: [{ r: [4, 5, 62, 44], g: -2, a: "br" }, { r: [34, 48, 62, 44], g: 2, a: "tl" }], papel: [6, 42, 88, 12, -4], livres: [[74, 8, 20, 8], [4, 58, 20, -8]] },
    c: { fotos: [{ r: [2, 3, 84, 47], g: -2, a: "br" }, { r: [14, 50, 84, 47], g: 2, a: "tl" }], papel: [0, 44, 100, 10, -4], livres: [[84, 4, 15, 8], [2, 84, 15, -8]] },
  },
  lado: {
    // duas em pé, lado a lado, com o bilhete (ou o balão) entre elas, embaixo
    d: { fotos: [{ r: [3, 10, 47, 56], g: -2, a: "r" }, { r: [50, 14, 47, 56], g: 2.2, a: "l" }], nota: [24, 73, 52, 22], livres: [[3, 74, 18, -8], [80, 76, 17, 8], [42, 1, 16, -6]] },
    c: { fotos: [{ r: [2, 3, 72, 47], g: -2, a: "br" }, { r: [26, 50, 72, 47], g: 2.2, a: "tl" }], livres: [[78, 4, 20, 8], [3, 60, 20, -8]] },
  },
  pilha: {
    d: { fotos: [{ r: [4, 4, 80, 45], g: -1.5, a: "br" }, { r: [16, 49, 80, 45], g: 1.8, a: "tl" }], papel: [0, 44, 100, 10, -3], livres: [[84, 10, 14, 10], [2, 60, 14, -10]] },
    c: { fotos: [{ r: [3, 4, 94, 45], g: -1.5, a: "b" }, { r: [3, 51, 94, 45], g: 1.8, a: "t" }], livres: [[4, 1, 18, -8], [78, 90, 18, 6]] },
  },
  grande: {
    d: { fotos: [{ r: [4, 3, 92, 50], g: -1, a: "b" }, { r: [6, 54, 44, 40], g: 2.5, a: "tr" }, { r: [50, 54, 44, 40], g: -2, a: "tl" }], livres: [[2, 88, 12, -8], [86, 88, 12, 8]] },
  },
  assimetrica: {
    d: { fotos: [{ r: [3, 4, 57, 62], g: -2, a: "tr" }, { r: [60, 8, 37, 32], g: 3, a: "bl" }, { r: [24, 64, 72, 32], g: -1.5, a: "t" }], papel: [56, 4, 40, 40, 4], livres: [[66, 44, 20, -6], [3, 72, 18, 8]] },
  },
  evento: {
    // quatro do mesmo momento, todas encostadas no meio
    d: { fotos: [{ r: [3, 3, 47, 46], g: -2, a: "br" }, { r: [50, 5, 47, 44], g: 1.5, a: "bl" }, { r: [3, 50, 47, 46], g: 1.8, a: "tr" }, { r: [50, 50, 47, 46], g: -2.2, a: "tl" }], livres: [[86, 92, 11, 8]] },
  },
};
const modeloDe = (nome, compacto) => (compacto && MODELOS[nome].c) || MODELOS[nome].d;

/**
 * Onde a foto fica de verdade na página (em % da largura e da altura), pela proporção dela: para ligar o balão à foto,
 * pôr a seta no lugar certo e saber se há espaço em cima. aspecto: largura ÷ altura da página.
 */
function retanguloDaFoto([rx, ry, rl, ra], prop, aspecto, a, comLegenda) {
  const H = 100 / aspecto; // altura da página em "% da largura"
  const l = rl - 7, alt = (ra / 100) * H - 7 - (comLegenda ? 9 : 0);
  const [fl, fa] = prop > l / alt ? [l, l / prop] : [alt * prop, alt];
  const x = /l/.test(a) ? rx + 3.5 : /r/.test(a) ? rx + rl - 3.5 - fl : rx + (rl - fl) / 2;
  const topo = (ry / 100) * H + 3.5;
  const y = /t/.test(a) ? topo : /b/.test(a) ? topo + alt - fa : topo + (alt - fa) / 2;
  return { x, y: (y / H) * 100, l: fl, a: (fa / H) * 100 };
}

// quantas fotos em cada página, em rodízio: uma grande com duas menores, duas, uma em destaque, quatro do mesmo momento, duas
const RODIZIO = [3, 2, 1, 4, 2];

/**
 * Monta as páginas sozinho, para ninguém precisar arrumar nada: a capa, depois as fotos na ordem do álbum.
 * Foto com observação (a história daquele momento) ganha página só dela, com o bilhete. As outras se revezam em
 * composições diferentes; a proporção de cada foto decide a composição.
 * maximo: quantas fotos cabem numa página sem ficarem pequenas (no celular, 2).
 * capa: a foto que já está na capa não se repete nas páginas.
 */
export function montarPaginas(fotos, prop, maximo = 4, capa = -1) {
  const r = (k) => prop[fotos[k].arq] || 1.4;
  const pags = [{ modelo: "capa", ks: [] }];
  let i = 0, vez = 0;
  while (i < fotos.length) {
    if (i === capa) { i += 1; continue; }
    if (fotos[i].observacao) { pags.push({ modelo: r(i) < 0.95 ? "bilhete-lado" : "bilhete", ks: [i] }); i += 1; continue; }
    const livres = [];
    for (let j = i; j < fotos.length && livres.length < maximo && !fotos[j].observacao; j += 1) if (j !== capa) livres.push(j);
    let quantas = Math.min(RODIZIO[vez % RODIZIO.length], livres.length);
    if (quantas === 1 && livres.length > 1 && r(livres[0]) > 1.15) quantas = 2; // foto deitada sozinha deixa a página vazia
    const ks = livres.slice(0, quantas);
    const deitadas = ks.filter((k) => r(k) > 1.1).length;
    const modelo = ks.length === 1 ? (r(ks[0]) > 1.15 ? "destaque-deitada" : "destaque")
      : ks.length === 2 ? (deitadas === 2 ? "pilha" : deitadas === 0 ? "lado" : "diagonal")
        : ks.length === 3 ? (r(ks[0]) > 1.1 ? "grande" : "assimetrica")
          : "evento";
    pags.push({ modelo, ks });
    i = ks[ks.length - 1] + 1;
    vez += 1;
  }
  return pags;
}

/** Qual foto vai na capa: a que a pessoa escolheu, ou a primeira. */
const capaDoAlbum = (x, fotos) => Math.max(0, fotos.findIndex((it) => it.arq === x.m.capa));

/** A primeira ocasião que a própria foto tem (Natal, Aniversário...), para o selo da página. */
const ocasiaoDe = (it) => (it.etiquetas || []).find(ehOcasiao);

/** A primeira pessoa marcada na foto com o lugar do rosto (para a seta com o nome). */
const marcadaDe = (it) => (it.marcas || []).find((k) => k.x != null && k.y != null);

/** Onde fica um bilhete: largura fixa e altura do texto, até o tamanho do lugar dele (a). */
const posNota = ([x, y, l, a]) => ({ ...pos([x, y, l]), "--nota-h": a });
const pos = ([x, y, l, a], giro) => ({ left: `${x}%`, top: `${y}%`, width: `${l}%`, ...(a != null ? { height: `${a}%` } : {}), ...(giro != null ? { "--gira": `${giro}deg` } : {}) });

/** O texto de um bilhete: se não couber no lugar, esmaece no fim (o texto inteiro está na foto aberta ou em Detalhes). */
function TextoDoBilhete({ texto }) {
  const ref = useRef(null);
  const [corta, setCorta] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const medir = () => setCorta(el.scrollHeight > el.clientHeight + 2);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [texto]);
  return <p ref={ref} className={`ab-nota-txt${corta ? " corta" : ""}`}>{texto}</p>;
}

function FotoNaPagina({ arq }) {
  const r = useArquivo(arq, false);
  return r ? <img src={r.url} alt="" draggable={false} /> : <span className="ab-foto-vazia" />;
}

/** O que prende a foto na página (alfinete, fita, clipe, cantoneiras), sempre na borda, longe do meio da foto. */
function Prendedor({ tipo, k }) {
  if (tipo === "alfinete") return <img className="ab-alfinete" src={`${KIT}alfinete_vermelho.png`} alt="" aria-hidden="true" />;
  if (tipo === "clipe") return <img className="ab-clipe" src={`${KIT}clipe_rosa.png`} alt="" aria-hidden="true" />;
  if (tipo === "fitas") return <img className="ab-fitas" src={`${KIT}fitas_decorativas.png`} alt="" aria-hidden="true" />;
  if (tipo === "fita") return <span className={`tape ${FITAS[k % FITAS.length]}`} aria-hidden="true" />;
  if (tipo === "cantos") {
    return (
      <>
        <span className="ab-canto ab-canto-a" aria-hidden="true"><img src={`${KIT}cantoneiras_com_coracao.png`} alt="" /></span>
        <span className="ab-canto ab-canto-b" aria-hidden="true"><img src={`${KIT}cantoneiras_com_coracao.png`} alt="" /></span>
      </>
    );
  }
  return null;
}

/** Um rabisco feito à mão (coração, estrela, brilhos, espiral). Só enfeite: não diz nada sobre a lembrança. */
function Rabisco({ nome, onde, cor = "" }) {
  return (
    <svg className={`ab-rabisco${cor ? ` ab-r-${cor}` : ""}`} style={pos(onde, onde[3])} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d={RABISCOS[nome]} />
    </svg>
  );
}

/**
 * Quem está na foto: um círculo à mão em volta do rosto marcado e uma seta com o nome, fora da foto (em cima ou embaixo).
 * Só aparece para quem foi marcado com o lugar do rosto.
 */
function QuemEsta({ marca, embaixo }) {
  const nome = pessoa(marca.p).nome;
  return (
    <span className="ab-quem" style={{ "--x": marca.x, "--y": marca.y }} aria-hidden="true">
      <svg className="ab-anel" viewBox="0 0 40 40"><path d="M21 4c9 0 15 7 15 16 0 9-7 16-16 16C11 36 4 29 4 20 4 12 10 5 18 4c2 0 5 1 7 2" /></svg>
      <span className={`ab-nome${embaixo ? " embaixo" : ""}`}>
        <svg className="ab-flecha" viewBox="0 0 30 40"><path d={embaixo ? "M14 38c-3-10 2-20 1-34M8 11l7-8 6 8" : "M14 2c-3 10 2 20 1 34M8 29l7 8 6-8"} /></svg>
        <span className="mao">{nome}</span>
      </span>
    </span>
  );
}

/**
 * Uma foto colada na página: a legenda escrita à mão embaixo, a data numa etiqueta e o lugar dela, se a família contou;
 * se alguém foi marcado no rosto, a seta com o nome.
 */
function FotoColada({ it, k, lugar, presa, papel, nComs, marca, marcaEmbaixo, onAbrir }) {
  const data = textoData(it.data);
  const temLegenda = it.legenda || data || it.lugar;
  return (
    <figure className={`ab-slot ab-a-${lugar.a}${temLegenda ? " com-leg" : ""}`} style={pos(lugar.r)}>
      <div className="ab-encaixe">
        <span className={`ab-pega${papel ? ` ab-papel-${papel}` : ""}`} style={{ "--gira": `${lugar.g}deg` }}>
          <button type="button" className={`ab-foto ab-p-${presa}`} onClick={() => onAbrir(k)}
            aria-label={`Ver maior a foto ${k + 1}${it.legenda ? `: ${it.legenda}` : ""}${data ? `, ${data}` : ""}${it.lugar ? `, ${it.lugar}` : ""}${marca ? `, com ${pessoa(marca.p).nome}` : ""}${nComs ? ` (${nComs} ${nComs === 1 ? "comentário" : "comentários"})` : ""}`}>
            <FotoNaPagina arq={it.arq} />
            <Prendedor tipo={presa} k={k} />
            {marca && <QuemEsta marca={marca} embaixo={marcaEmbaixo} />}
            {nComs > 0 && <span className="ab-tem-com" aria-hidden="true"><Icone nome="comentar" tam={16} />{nComs}</span>}
          </button>
          {temLegenda && (
            <span className="ab-legenda" aria-hidden="true">
              {it.legenda && <span className="mao ab-leg">{it.legenda}</span>}
              {data && <span className="mao ab-data">{data}</span>}
              {it.lugar && <span className="mao ab-lugar"><Icone nome="pin" tam={14} />{it.lugar}</span>}
            </span>
          )}
        </span>
      </div>
    </figure>
  );
}

/** Balão (o do kit) com o último comentário de uma foto: quem escreveu e o começo do que disse. Abre a foto com todos. */
function Balao({ c, onAbrir }) {
  return (
    <button type="button" className="ab-balao" onClick={onAbrir}>
      <span className="ab-balao-txt"><b>{nomeDe(c.autor)}:</b> {c.texto}</span>
      <span className="sr"> (abrir a foto com os comentários)</span>
    </button>
  );
}

/**
 * Uma linha pontilhada à mão, do bilhete (ou balão) até a foto a que ele pertence, com a pontinha de seta.
 * de/ate: [x, y] em % da página. aspecto: largura ÷ altura da página (para a seta não entortar).
 */
function Ligacao({ de, ate, aspecto }) {
  const H = 100 / aspecto;
  const [x1, y1] = [de[0], (de[1] / 100) * H], [x2, y2] = [ate[0], (ate[1] / 100) * H];
  const cx = (x1 + x2) / 2 + (y2 - y1) * 0.25, cy = (y1 + y2) / 2 - (x2 - x1) * 0.25; // uma curva, como feita à mão
  const ang = Math.atan2(y2 - cy, x2 - cx), p = 2.6;
  const ponta = (d) => `${x2 - p * Math.cos(ang + d)} ${y2 - p * Math.sin(ang + d)}`;
  return (
    <svg className="ab-ligacao" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="ab-ligacao-linha" d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} />
      <path d={`M${ponta(0.5)} L${x2} ${y2} L${ponta(-0.5)}`} />
    </svg>
  );
}

/** Um enfeite do kit, num canto livre da página. Com texto (selo da ocasião), o texto vai dentro. */
function Enfeite({ nome, onde, texto }) {
  return (
    <span className={`ab-enfeite ab-e-${nome}${texto ? " com-txt" : ""}`} style={pos(onde, onde[3])} aria-hidden={texto ? undefined : "true"}>
      <img src={`${KIT}${ENFEITES[nome]}`} alt="" />
      {texto && <span className="mao">{texto}</span>}
    </span>
  );
}

/** A capa: o nome do álbum numa etiqueta presa com alfinete, a foto da capa com fitas, quando e onde, e a história em um bilhete. */
function Capa({ x, fotos, enfeites, onAbrirFoto }) {
  const k = capaDoAlbum(x, fotos);
  const capa = fotos[k];
  // a ocasião já está escrita embaixo do título: aqui só enfeites do tema, sem texto repetido
  const [deco, deco2] = enfeites.lista.filter((e) => e !== "selo");
  return (
    <div className="ab-pag ab-capa ab-fundo-capa">
      <div className="ab-tela">
        <div className="ab-capa-rotulo">
          <img className="ab-alfinete" src={`${KIT}alfinete_vermelho.png`} alt="" aria-hidden="true" />
          <h2 className="ab-capa-t">{x.titulo}</h2>
          {(x.quando || x.lugar) && <p className="mao ab-capa-quando">{[x.quando, x.lugar].filter(Boolean).join(" · ")}</p>}
        </div>
        {capa && (
          <figure className="ab-slot ab-a-c" style={pos([5, 24, 90, x.texto ? 52 : 56])}>
            <div className="ab-encaixe">
              <span className="ab-pega ab-papel-turquesa" style={{ "--gira": "-2deg" }}>
                <button type="button" className="ab-foto ab-p-fitas" onClick={() => onAbrirFoto(k)} aria-label="Ver maior a foto da capa">
                  <FotoNaPagina arq={capa.arq} />
                  <img className="ab-fitas" src={`${KIT}fitas_decorativas.png`} alt="" aria-hidden="true" />
                </button>
              </span>
            </div>
          </figure>
        )}
        {x.texto && <div className="ab-nota ab-capa-nota" style={posNota([9, 78, 62, 17])}><TextoDoBilhete texto={x.texto} /></div>}
        {deco2 && <Enfeite nome={deco2} onde={[x.texto ? 75 : 72, x.texto ? 78 : 81, 20, 8]} />}
        {deco && <Enfeite nome={deco} onde={[2, 19, 16, -10]} />}
        <Rabisco nome="brilhos" onde={[80, 18, 12, 0]} cor="gema" />
      </div>
    </div>
  );
}

/**
 * Uma página do álbum (ou a capa). num: o número da página, para variar papel, prendedores e enfeites sem repetir.
 * compacto: celular (composições próprias). aspecto: largura ÷ altura da página. anotacoes: setas, nomes, balões e linhas.
 */
function Pagina({ x, pag, num, fotos, prop, guardados, enfeites, compacto, aspecto, anotacoes, onAbrirFoto }) {
  if (pag.modelo === "capa") return <Capa x={x} fotos={fotos} enfeites={enfeites} onAbrirFoto={onAbrirFoto} />;
  const m = modeloDe(pag.modelo, compacto);
  const its = pag.ks.map((k) => fotos[k]);
  // só comentários de pessoas viram anotação na página (sugestão da IA nunca aparece como se fosse de alguém)
  const coms = pag.ks.map((k) => comentariosDe(x, guardados, chaveDaFoto(fotos[k])).filter((c) => c.tipo === "comentario" && c.origem === "pessoa"));
  const rets = its.map((it, i) => retanguloDaFoto(m.fotos[i].r, prop[it.arq] || 1.4, aspecto, m.fotos[i].a, !!(it.legenda || textoData(it.data) || it.lugar)));
  // a nota: a história da foto (observação) ou, se não houver, o último comentário de uma foto da página
  const obs = pag.modelo.startsWith("bilhete") ? its[0].observacao : "";
  const comBalao = anotacoes && !obs && m.nota ? pag.ks.findIndex((_, i) => coms[i].length) : -1;
  // seta com o nome: na primeira foto com alguém marcado no rosto (em páginas de até duas fotos, onde ela fica grande)
  const comMarca = anotacoes && pag.ks.length <= 2 ? its.findIndex(marcadaDe) : -1;
  // o selo só quando a foto tem uma ocasião diferente das do álbum (essas já estão na capa)
  const doAlbum = x.m.etiquetas || [];
  const ocasiao = its.map(ocasiaoDe).find((o) => o && !doAlbum.includes(o));
  // enfeites: nem toda página tem; nunca o mesmo da página anterior; o selo da ocasião vem primeiro.
  // Sem bilhete nem balão, o lugar da nota também pode receber um enfeite. Às vezes, um rabisco no lugar de um adesivo.
  const livres = [...m.livres];
  if (m.nota && !obs && comBalao < 0) livres.unshift([m.nota[0] + m.nota[2] * 0.3, m.nota[1] + 2, 24, -6]);
  const deco = [];
  if (ocasiao && livres.length) deco.push({ nome: "selo", onde: livres.shift(), texto: nomeEtiqueta(ocasiao) });
  const quantos = pag.ks.length === 1 ? 2 : num % 3 === 0 ? 1 : 2; // página de uma foto só nunca fica vazia
  for (let i = 0; i < quantos && livres.length; i += 1) {
    if ((num + i) % 3 === 2) { deco.push({ rabisco: ["coracao", "estrela", "espiral"][num % 3], onde: livres.shift() }); continue; }
    const nome = enfeites.lista[(num * 2 + i) % enfeites.lista.length];
    if (!deco.some((d) => d.nome === nome)) deco.push({ nome, onde: livres.shift() });
  }
  // a linha do balão até a foto: sai do alto do balão e chega na lateral da foto (a legenda fica embaixo dela)
  let ligacao = null;
  if (comBalao >= 0) {
    const f = rets[comBalao], [nx, ny, nl] = m.nota;
    const deX = nx + nl * 0.22, direita = f.x + f.l / 2 < deX;
    ligacao = { de: [deX, ny + 1], ate: [direita ? Math.min(f.x + f.l + 1.5, 97) : Math.max(f.x - 1.5, 3), f.y + f.a * 0.72] };
  }
  const fundo = num % 4;
  return (
    <div className={`ab-pag ab-m-${pag.modelo} ab-fundo-${fundo}`}>
      <div className="ab-tela">
        {m.papel && <span className={`ab-recorte ab-recorte-${PAPEIS[(num + 2) % PAPEIS.length]}`} style={pos(m.papel, m.papel[4])} aria-hidden="true" />}
        {pag.ks.map((k, i) => {
          let presa = PRESAS[(num * 2 + i) % PRESAS.length];
          if (i === comMarca && NA_BORDA_DE_CIMA.has(presa)) presa = "cantos"; // o nome vai em cima: nada preso na borda de cima
          return (
            <FotoColada key={fotos[k].arq} it={fotos[k]} k={k} lugar={m.fotos[i]} nComs={coms[i].length} onAbrir={onAbrirFoto}
              presa={presa} papel={(num + i) % 2 === 0 ? PAPEIS[(num + i) % PAPEIS.length] : ""}
              marca={i === comMarca ? marcadaDe(fotos[k]) : null} marcaEmbaixo={rets[i].y < 9} />
          );
        })}
        {obs && (
          <div className="ab-nota" style={posNota(m.nota)}>
            <img className="ab-clipe" src={`${KIT}clipe_rosa.png`} alt="" aria-hidden="true" />
            <TextoDoBilhete texto={obs} />
          </div>
        )}
        {ligacao && <Ligacao {...ligacao} aspecto={aspecto} />}
        {comBalao >= 0 && (
          <div className="ab-nota-lugar" style={pos(m.nota)}>
            <Balao c={coms[comBalao][coms[comBalao].length - 1]} onAbrir={() => onAbrirFoto(pag.ks[comBalao])} />
          </div>
        )}
        {deco.map((d, i) => (d.rabisco
          ? <Rabisco key={`r${i}`} nome={d.rabisco} onde={[d.onde[0] + 3, d.onde[1], Math.min(d.onde[2], 14), d.onde[3]]} cor={num % 2 ? "anil" : ""} />
          : <Enfeite key={d.nome} {...d} />))}
        <span className="mao ab-num" aria-hidden="true">{num}</span>
      </div>
    </div>
  );
}

/** Miniatura de uma página, para achar uma parte do álbum. */
function PaginaMini({ pag, fotos }) {
  if (pag.modelo === "capa") return <span className="ab-mini ab-mini-capa"><Icone nome="album" tam={22} /></span>;
  return (
    <span className={`ab-mini ab-mini-${pag.ks.length}`}>
      {pag.ks.map((k) => <Miniatura key={fotos[k].arq} arq={fotos[k].arq} />)}
    </span>
  );
}

/**
 * O álbum para folhear: páginas duplas no computador, uma por vez (grande, em pé) no celular.
 * Virar: setas sempre à vista, setas do teclado ou deslizar o dedo. "Páginas" abre as miniaturas (a capa é a primeira).
 */
export function Folhear({ x, guardados, onAbrirFoto, anotacoes = true }) {
  const fotos = fotosDe(x.m);
  const prop = useProporcoes(fotos);
  const [largura, setLargura] = useState(0);
  const duplas = largura >= 860; // duas páginas só quando cabem de verdade (sem espremer)
  const compacto = largura < 600; // celular: composições próprias, até duas fotos por página
  const pags = montarPaginas(fotos, prop, compacto ? 2 : 4, capaDoAlbum(x, fotos));
  const [aspecto, setAspecto] = useState(0.72); // largura ÷ altura da página, medida de verdade
  const enfeites = enfeitesDo(x, fotos);
  const total = pags.length;
  const [pag, setPag] = useState(0);
  const [dir, setDir] = useState("");
  const [mapa, setMapa] = useState(false);
  const caixa = useRef(null);
  const toque = useRef(null);
  const arrastou = useRef(false);

  useEffect(() => {
    const el = caixa.current;
    const medir = () => {
      setLargura(el.clientWidth);
      const p = el.querySelector(".ab-pag");
      if (p?.clientHeight) setAspecto(p.clientWidth / p.clientHeight);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ao passar de uma para duas páginas (ou ao contrário) a página muda de formato: mede de novo
  useEffect(() => {
    const p = caixa.current.querySelector(".ab-pag");
    if (p?.clientHeight) setAspecto(p.clientWidth / p.clientHeight);
  }, [duplas, compacto]);

  const ultima = duplas ? (total - 1) - ((total - 1) % 2) : total - 1;
  const inicio = Math.min(duplas ? pag - (pag % 2) : pag, ultima); // girar a tela pode mudar quantas páginas há
  const ir = (p) => {
    const alvo = Math.max(0, Math.min(ultima, duplas ? p - (p % 2) : p));
    if (alvo === inicio) return;
    setDir(poucoMovimento() ? "" : alvo > inicio ? "prox" : "ant");
    setPag(alvo);
  };
  const passo = duplas ? 2 : 1;
  const proxima = () => ir(inicio + passo);
  const anterior = () => ir(inicio - passo);

  useEffect(() => {
    const tecla = (e) => {
      if (editando(e) || document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowRight") proxima();
      if (e.key === "ArrowLeft") anterior();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // deslizar o dedo vira a página; um toque continua abrindo a foto
  const comecar = (e) => { toque.current = { x: e.clientX, y: e.clientY }; arrastou.current = false; };
  const terminar = (e) => {
    const t = toque.current;
    toque.current = null;
    if (!t) return;
    const dx = e.clientX - t.x, dy = e.clientY - t.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      arrastou.current = true;
      if (dx < 0) proxima(); else anterior();
    }
  };
  const naoAbrirSeArrastou = (e) => { if (arrastou.current) { e.preventDefault(); e.stopPropagation(); arrastou.current = false; } };

  const visiveis = duplas ? [inicio, inicio + 1] : [inicio];
  const onde = duplas
    ? (inicio + 1 < total ? (inicio === 0 ? "Capa e página 1" : `${inicio} e ${inicio + 1}`) : `${inicio}`)
    : (inicio === 0 ? "Capa" : `${inicio}`);

  return (
    <section className="ab" aria-label={`Álbum ${x.titulo}, para folhear`} ref={caixa}>
      <div className={`ab-livro${duplas ? " ab-duplas" : ""}`} onPointerDown={comecar} onPointerUp={terminar} onPointerCancel={() => { toque.current = null; }}
        onClickCapture={naoAbrirSeArrastou}>
        <div key={inicio} className={`ab-folhas${dir ? ` ab-vira-${dir}` : ""}`}>
          {visiveis.map((p) => (p < total
            ? <Pagina key={p} x={x} pag={pags[p]} num={p} fotos={fotos} prop={prop} guardados={guardados} enfeites={enfeites}
              compacto={compacto} aspecto={aspecto} anotacoes={anotacoes} onAbrirFoto={onAbrirFoto} />
            : <div key={p} className="ab-pag ab-pag-fim ab-fundo-0" aria-hidden="true" />))}
        </div>
      </div>

      <div className="ab-barra">
        <button type="button" className="ab-seta" disabled={inicio === 0} onClick={anterior} aria-label="Página anterior">
          <Icone nome="voltar" tam={22} /><span>Anterior</span>
        </button>
        <button type="button" className="ab-onde" aria-expanded={mapa} onClick={() => setMapa(!mapa)}>
          <Icone nome="memorias" tam={20} />
          <span aria-live="polite">{inicio === 0 ? onde : <><span className="ab-pal">Página </span>{onde}</>}</span>
          {inicio > 0 && <span className="ab-de">de {total - 1}</span>}
        </button>
        <button type="button" className="ab-seta" disabled={inicio >= ultima} onClick={proxima} aria-label="Próxima página">
          <span>Próxima</span><Icone nome="seguir" tam={22} />
        </button>
      </div>
      {mapa && (
        <ul className="ab-mapa" aria-label="Páginas do álbum">
          {pags.map((pg, p) => (
            <li key={p}>
              <button type="button" className="ab-mapa-it" aria-current={visiveis.includes(p) ? "page" : undefined}
                onClick={() => { ir(p); setMapa(false); }}>
                <PaginaMini pag={pg} fotos={fotos} />
                <span>{p === 0 ? "Capa" : `Página ${p}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
