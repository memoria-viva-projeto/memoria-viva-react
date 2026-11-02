// Minhas memórias: as lembranças da demonstração (CONTA.memorias) e as guardadas no aparelho, num formato só,
// para a biblioteca (pastas por categoria) e o feed. Nada aqui muda os dados: só lê e organiza.
//
// item: { id, fonte: "demo" | "guardada", m (a memória original), tipo, titulo, quando, lugar, texto, relato, audio,
//         foto (endereço) | arq (arquivo guardado), fotos (quantas), pessoas, autor, enviadaPor, status, em (data p/ ordem),
//         categorias }

import { CONTA } from "../../dados/conta.js";
import { ETIQUETAS_TEMPO, capaDe, textoQuando, tituloDe } from "./guardados.js";
import { pessoasDe } from "./pessoas.jsx";

// [id, nome, ícone]. As pastas vêm do tipo de cada memória: ninguém precisa classificar nada.
export const CATEGORIAS = [
  ["todas", "Todas as memórias", "memorias"],
  ["fotos", "Fotografias", "foto"],
  ["albuns", "Álbuns", "album"],
  ["musicas", "Músicas", "musica"],
  ["receitas", "Receitas", "receita"],
  ["historias", "Histórias e relatos", "ler"],
  ["conselhos", "Conselhos e ensinamentos", "conselho"],
  ["frases", "Frases e falas", "comentar"],
  ["videos", "Vídeos", "video"],
  ["outras", "Outras lembranças", "estrela"],
];
const DO_TIPO = { foto: "fotos", album: "albuns", musica: "musicas", receita: "receitas", video: "videos", conselho: "conselhos", frase: "frases" };

/** Pastas de uma memória: a do tipo e, se a pessoa contou um relato (escrito ou falado), também "Histórias e relatos". */
export function categoriasDe(x) {
  const cats = [DO_TIPO[x.tipo] || "outras"];
  if (x.relato || x.audio) cats.push("historias");
  return cats;
}

const dia = 864e5;

// ---------------- tempo: datas reais, épocas e ocasiões (nunca convertidas umas nas outras) ----------------

/** Anos que uma data cobre: o ano exato, ou cada ano de um período. Década sozinha e "não sei" não viram ano. */
function anosDe(d) {
  if (!d) return [];
  const modo = d.modo || (d.decada ? "decada" : d.anoFim ? "periodo" : d.ano ? "ano" : "");
  const ano = Number(d.ano), fim = Number(d.anoFim);
  if (!ano || modo === "decada" || modo === "naosei") return [];
  if (fim > ano) return Array.from({ length: Math.min(fim - ano, 100) + 1 }, (_, k) => ano + k);
  return [ano];
}

/** O que se sabe do tempo de uma memória (e das fotos dela): anos, décadas e etiquetas (fases da vida, ocasiões). */
function tempoDe(m, fonte) {
  if (fonte === "demo") {
    const anos = m.ano ? [m.ano] : [];
    return { anos, decadas: anos.map((a) => Math.floor(a / 10) * 10), etiquetas: m.etiquetas || [] };
  }
  const datas = [m.data, ...(m.itens || []).map((it) => it.data)].filter(Boolean);
  const anos = [...new Set(datas.flatMap(anosDe))];
  const decadas = [...new Set([...anos.map((a) => Math.floor(a / 10) * 10), ...datas.filter((d) => d.decada).map((d) => Number(d.decada))])];
  const etiquetas = [...new Set([...(m.etiquetas || []), ...(m.itens || []).flatMap((it) => it.etiquetas || [])])];
  return { anos, decadas, etiquetas };
}

export const FILTRO_VAZIO = { ano: "", decada: "", de: "", ate: "", etapa: "", ocasiao: "", pessoa: "" };
const OCASIOES = new Set(ETIQUETAS_TEMPO.find(([g]) => g === "Ocasiões")[1].map(([k]) => k));
export const ehOcasiao = (k) => OCASIOES.has(k);

/**
 * Filtra pelo tempo e pelas pessoas; os filtros valem juntos (ex.: Juventude + Antônio).
 * Com filtro de ano, década ou intervalo, memórias sem data não entram (não dá para saber).
 */
export function filtrar(itens, f) {
  return itens.filter((x) => {
    const t = x.tempo;
    if (f.ano && !t.anos.includes(Number(f.ano))) return false;
    if (f.decada && !t.decadas.includes(Number(f.decada))) return false;
    if (f.de || f.ate) {
      const de = Number(f.de) || -Infinity, ate = Number(f.ate) || Infinity;
      const dentro = t.anos.some((a) => a >= de && a <= ate) || (!t.anos.length && t.decadas.some((d) => d + 9 >= de && d <= ate));
      if (!dentro) return false;
    }
    if (f.etapa && !t.etiquetas.includes(f.etapa)) return false;
    if (f.ocasiao && !t.etiquetas.includes(f.ocasiao)) return false;
    if (f.pessoa && !x.pessoas.includes(f.pessoa)) return false;
    return true;
  });
}
export const filtroAtivo = (f) => Object.values(f).some(Boolean);

/** As opções que existem nas memórias (nada de opção que não leva a lugar nenhum). */
export function opcoesDeFiltro(itens) {
  const anos = [...new Set(itens.flatMap((x) => x.tempo.anos))].sort((a, b) => a - b);
  const decadas = [...new Set(itens.flatMap((x) => x.tempo.decadas))].sort((a, b) => a - b);
  const etiquetas = new Set(itens.flatMap((x) => x.tempo.etiquetas));
  const ordem = ETIQUETAS_TEMPO.flatMap(([, l]) => l.map(([k]) => k));
  const presentes = ordem.filter((k) => etiquetas.has(k));
  const pessoas = [...new Set(itens.flatMap((x) => x.pessoas))];
  return { anos, decadas, etapas: presentes.filter((k) => !ehOcasiao(k)), ocasioes: presentes.filter(ehOcasiao), pessoas };
}

/** Uma memória da demonstração no formato do feed. */
function daDemo(m) {
  const x = {
    id: m.id, fonte: "demo", m, tipo: m.tipo, titulo: m.titulo || m.frase || "", quando: m.quando || "", lugar: m.lugar || "",
    texto: "", relato: m.texto || "", frase: m.frase || "", audio: m.audio || null,
    receita: m.receita || "", foto: m.foto || null, alt: m.alt || "", arq: null, fotos: m.foto ? 1 : 0,
    pessoas: m.pessoas || [], autor: m.origem?.tipo === "familia" ? m.origem.por : CONTA.pessoa.id,
    enviadaPor: m.origem?.tipo === "familia" ? m.origem.por : null, status: m.status, sugestaoIA: m.sugestaoIA || null,
    emocionaram: m.emocionaram || [], pessoasConfirmadas: !!m.pessoasConfirmadas,
    em: Date.now() - (m.publicadaHaDias || 0) * dia, tempo: tempoDe(m, "demo"),
  };
  return { ...x, categorias: categoriasDe(x) };
}

/** Uma memória guardada pela pessoa (no aparelho) no formato do feed. */
export function daGuardada(m) {
  const fotos = m.itens.filter((it) => it.tipo === "foto" && !it.anexo).length;
  const x = {
    id: m.id, fonte: "guardada", m, tipo: m.tipo, titulo: tituloDe(m), quando: textoQuando(m), lugar: m.lugar || "",
    texto: m.descricao || "", relato: "", frase: "", audio: null, receita: "", foto: null, alt: "", arq: capaDe(m), fotos,
    pessoas: pessoasDe(m), autor: CONTA.pessoa.id, enviadaPor: null, status: "confirmada", sugestaoIA: null,
    emocionaram: [], pessoasConfirmadas: !!m.pessoasConfirmadas, em: new Date(m.criadaEm).getTime(), tempo: tempoDe(m, "guardada"),
  };
  return { ...x, categorias: categoriasDe(x) };
}

/** Todas as memórias, da mais recente para a mais antiga (pela data em que entraram, não a do acontecimento). */
export const juntarMemorias = (memorias, guardadas) =>
  [...guardadas.map(daGuardada), ...memorias.map(daDemo)].sort((a, b) => b.em - a.em);

/** Quantas há em cada pasta. "todas" conta cada memória uma vez. */
export function contarPorCategoria(itens) {
  const n = Object.fromEntries(CATEGORIAS.map(([k]) => [k, 0]));
  n.todas = itens.length;
  itens.forEach((x) => x.categorias.forEach((c) => { n[c] += 1; }));
  return n;
}

export const naCategoria = (itens, cat) => (cat === "todas" ? itens : itens.filter((x) => x.categorias.includes(cat)));
