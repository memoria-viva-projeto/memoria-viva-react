// Comentários, "Eu me lembro" e curtidas de cada memória, guardados de verdade (IndexedDB, banco "memoria-viva-comentarios"),
// e o contexto que a IA recebe para conversar sobre uma memória (ou sobre uma foto de um álbum).
//
// comentário: { id, memoria (id da memória), fonte: "demo" | "guardada", foto? (chave da foto, ver chaveDaFoto), autor (id da pessoa),
//               texto, tipo: "comentario" | "lembro" | "curtir", origem: "pessoa" | "ia", criadoEm (ISO) }
//   sem foto: vale para a memória inteira (o álbum todo). Com foto: só para aquela foto. Um nunca aparece no lugar do outro.
//   origem "pessoa": escrito por alguém (é a lembrança dessa pessoa, não um fato confirmado).
//   origem "ia": reservado para o que a IA sugerir no futuro; sempre aparece separado e marcado como sugestão.
// Banco próprio, como o da família: se uma aba antiga segurar o banco das memórias, os comentários abrem do mesmo jeito.
// Os comentários que já vêm na demonstração (CONTA.memorias[].comentarios) entram como "semente": aparecem e vão para
// o contexto, mas não ficam no banco nem podem ser apagados.

import { CONTA, pessoa } from "../../dados/conta.js";
import { abrirBanco, chaveDaFoto, fotosDe, novoId, pedirEm, textoQuando } from "./guardados.js";

let conexao;
function abrir() {
  conexao ||= abrirBanco("memoria-viva-comentarios", [["comentarios", "id"]])
    .then((db) => { db.addEventListener("versionchange", () => { conexao = null; }); return db; })
    .catch((e) => { conexao = null; throw e; });
  return conexao;
}
const pedir = async (modo, fazer) => pedirEm(await abrir(), "comentarios", modo, fazer);

export const listarComentarios = () => pedir("readonly", (s) => s.getAll());
export const guardarComentario = (c) => pedir("readwrite", (s) => s.put(c));
export const apagarComentario = (id) => pedir("readwrite", (s) => s.delete(id));

export const novoComentario = ({ memoria, fonte, foto = null, autor = CONTA.pessoa.id, texto = "", tipo = "comentario", origem = "pessoa" }) => ({
  id: novoId("com"), memoria, fonte, ...(foto ? { foto } : {}), autor, texto: texto.trim(), tipo, origem, criadoEm: new Date().toISOString(),
});

/**
 * Os comentários de uma memória (só dela), na ordem em que foram escritos: os da demonstração antes, depois os guardados.
 * foto: a chave de uma foto do álbum → só os daquela foto. Sem foto → só os da memória inteira.
 */
export function comentariosDe(x, guardados, foto = null) {
  const sementes = (x.fonte === "demo" && !foto ? x.m.comentarios || [] : []).map((c, k) => ({
    id: `semente-${x.id}-${k}`, memoria: x.id, fonte: "demo", autor: c.de, texto: c.texto, tipo: c.lembro ? "lembro" : "comentario",
    origem: "pessoa", criadoEm: null, semente: true,
  }));
  const meus = guardados.filter((c) => c.memoria === x.id && c.fonte === x.fonte && (c.foto || null) === foto)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  return [...sementes, ...meus];
}

/** Quantas pessoas reagiram de um jeito ("lembro", "curtir") e se você foi uma delas. */
export function reacoes(coms, tipo) {
  const quem = new Set(coms.filter((c) => c.tipo === tipo).map((c) => c.autor));
  return { n: quem.size, eu: quem.has(CONTA.pessoa.id) };
}

// ---------------- contexto para a IA ----------------

const NOME_TIPO = { foto: "fotografia", album: "álbum de fotografias", musica: "música", receita: "receita", video: "vídeo", conselho: "conselho" };
const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "sem data registrada");

/** "Juliana (filha)", "Maria (dona da conta)". O parentesco vem da Família, quando a pessoa está lá. */
function quem(id) {
  if (id === CONTA.pessoa.id) return `${CONTA.pessoa.nome} (dona da conta)`;
  const p = pessoa(id);
  return p.relacao ? `${p.nome} (${p.relacao})` : p.nome;
}

// O que a IA precisa seguir ao usar este contexto (vai junto, no começo da conversa).
export const REGRAS_DO_CONTEXTO = [
  "Use só o que está registrado nesta memória. Não misture com outras memórias.",
  "Num álbum, o que está numa foto vale só para aquela foto. O que é do álbum vale para o álbum como um todo. Não passe a informação de uma foto para outra.",
  "Diga de quem é cada informação (“Juliana contou que…”). Comentários são a lembrança de quem escreveu: podem ter enganos e não são fatos confirmados.",
  "Separe o que as pessoas escreveram do que é sugestão da IA. Sugestão da IA nunca vale como fato.",
  "Não invente nomes, datas, lugares nem detalhes. Se não estiver registrado, diga que não sabe e pergunte.",
];

/** Comentários, lembranças, curtidas e sugestões de uma lista (de uma memória inteira ou de uma foto), separados. */
function partes(lista) {
  const comentarios = lista.filter((c) => c.tipo === "comentario" && c.origem === "pessoa")
    .map((c) => ({ id: c.id, autor: c.autor, nome: quem(c.autor), daDona: c.autor === CONTA.pessoa.id, data: c.criadoEm, texto: c.texto }));
  const lembraram = [...new Set(lista.filter((c) => c.tipo === "lembro").map((c) => c.autor))].map(quem);
  const curtiram = [...new Set(lista.filter((c) => c.tipo === "curtir").map((c) => c.autor))].map(quem);
  const sugestoesIA = lista.filter((c) => c.origem === "ia").map((c) => c.texto);
  return { comentarios, lembraram, curtiram, sugestoesIA };
}

function linhasDasPartes(p, sobre, recuo = "") {
  return [
    p.comentarios.length
      ? [`${recuo}Comentários sobre ${sobre} (a lembrança de quem escreveu, não fatos confirmados):`,
        ...p.comentarios.map((c) => `${recuo}- ${c.nome}, ${dataCurta(c.data)}: “${c.texto}”`)].join("\n")
      : `${recuo}Ainda não há comentários sobre ${sobre}.`,
    p.lembraram.length && `${recuo}Disseram “Eu me lembro”: ${p.lembraram.join(", ")}.`,
    p.curtiram.length && `${recuo}Curtiram: ${p.curtiram.join(", ")}.`,
    p.sugestoesIA.length && [`${recuo}Sugestões da IA, ainda não confirmadas (não tratar como fato):`, ...p.sugestoesIA.map((s) => `${recuo}- ${s}`)].join("\n"),
  ].filter(Boolean);
}

/** O que está registrado numa foto de um álbum: só dela (legenda, data, lugar, quem está, observação). */
function fatosDaFoto(it) {
  const marcas = (it.marcas || []).map((k) => k.p);
  return [
    it.legenda && `Legenda: “${it.legenda}”`,
    textoQuando(it) && `Quando: ${textoQuando(it)}`,
    it.lugar && `Onde: ${it.lugar}`,
    marcas.length && `Quem aparece: ${marcas.map(quem).join(", ")}`,
    it.observacao && `Observação escrita por ${quem(CONTA.pessoa.id)}: “${it.observacao}”`,
  ].filter(Boolean);
}

/** Uma foto do álbum no contexto: o que ela tem e o que disseram sobre ela. null se não há nada sobre ela. */
function blocoDaFoto(x, it, n, total, guardados, sempre) {
  const fatos = fatosDaFoto(it);
  const p = partes(comentariosDe(x, guardados, chaveDaFoto(it)));
  const tem = fatos.length || p.comentarios.length || p.lembraram.length || p.curtiram.length || p.sugestoesIA.length;
  if (!tem && !sempre) return null;
  return {
    foto: chaveDaFoto(it), n, fatos, ...p,
    texto: [`FOTO ${n} de ${total} (foto ${chaveDaFoto(it)})`, ...fatos.map((f) => `  ${f}`), ...linhasDasPartes(p, "esta foto", "  ")].join("\n"),
  };
}

/**
 * Tudo o que se sabe sobre uma memória, com a fonte de cada informação.
 * Num álbum, cada foto que tem algo registrado entra no seu próprio bloco, separada do álbum e das outras fotos.
 * Devolve { memoria, fatos, comentarios, lembraram, curtiram, sugestoesIA, fotos, texto }: as partes e um texto pronto para a IA.
 */
export function contextoDaMemoria(x, guardados) {
  const lista = comentariosDe(x, guardados);
  const fonte = x.enviadaPor ? `enviada por ${quem(x.enviadaPor)}` : `guardada por ${quem(x.autor)}`;
  const situacao = x.status === "aguardando" ? `${CONTA.pessoa.nome} ainda não confirmou` : `confirmada por ${CONTA.pessoa.nome}`;
  const album = x.fonte === "guardada" && x.tipo === "album";
  const fatos = [
    x.quando && `Quando: ${x.quando}`,
    x.lugar && `Onde: ${x.lugar}`,
    x.pessoas.length && `Quem aparece${album ? " (em alguma foto)" : ""}${x.pessoasConfirmadas ? " (confirmado por " + CONTA.pessoa.nome + ")" : ""}: ${x.pessoas.map(quem).join(", ")}`,
    x.receita && `Receita: ${x.receita}`,
    x.frase && `Conselho, nas palavras de ${quem(x.autor)}: “${x.frase}”`,
    x.relato && `Relato escrito por ${quem(x.autor)}: “${x.relato}”`,
    x.texto && `Descrição escrita por ${quem(x.autor)}: “${x.texto}”`,
    x.audio && `Há um relato em áudio de ${quem(x.autor)} (${Math.round(x.audio.duracao / 60)} min), ainda sem transcrição.`,
  ].filter(Boolean);
  const p = partes(lista);
  if (x.sugestaoIA) p.sugestoesIA.unshift(`${x.sugestaoIA.campo}: ${x.sugestaoIA.texto}`);
  const todas = album ? fotosDe(x.m) : [];
  const fotos = todas.map((it, k) => blocoDaFoto(x, it, k + 1, todas.length, guardados, false)).filter(Boolean);

  const texto = [
    `MEMÓRIA ${x.id} · ${NOME_TIPO[x.tipo] || "lembrança"}: “${x.titulo}”${album ? ` (${todas.length} fotos)` : ""}`,
    `Origem: ${fonte}; ${situacao}.`,
    album && "SOBRE O ÁLBUM INTEIRO:",
    ...fatos,
    ...linhasDasPartes(p, album ? "o álbum inteiro" : "esta memória"),
    album && (fotos.length
      ? ["SOBRE CADA FOTO (vale só para aquela foto; não misture uma foto com outra nem com o álbum):", ...fotos.map((f) => f.texto)].join("\n")
      : "Nenhuma foto deste álbum tem legenda, data, observação ou comentário próprio ainda."),
  ].filter(Boolean).join("\n");

  return { memoria: x.id, fatos, ...p, fotos, texto };
}

/**
 * Para conversar sobre uma foto de um álbum: o que é do álbum (marcado como do álbum) e o que é só daquela foto.
 * As outras fotos não entram.
 */
export function contextoDaFoto(x, chave, guardados) {
  const todas = fotosDe(x.m);
  const k = todas.findIndex((it) => chaveDaFoto(it) === chave);
  if (k < 0) return null;
  const b = blocoDaFoto(x, todas[k], k + 1, todas.length, guardados, true);
  const doAlbum = [x.quando && `Quando (do álbum): ${x.quando}`, x.lugar && `Onde (do álbum): ${x.lugar}`, x.texto && `Descrição do álbum, escrita por ${quem(x.autor)}: “${x.texto}”`].filter(Boolean);
  const texto = [
    `FOTO de um ${NOME_TIPO[x.tipo] || "lembrança"}: “${x.titulo}” (memória ${x.id})`,
    doAlbum.length ? ["O que vale para o álbum todo (use só se a foto não disser outra coisa):", ...doAlbum.map((d) => `- ${d}`)].join("\n") : "",
    b.texto,
  ].filter(Boolean).join("\n");
  return { memoria: x.id, ...b, doAlbum, texto };
}

/** Para a conversa: o contexto de uma memória (ou de uma foto dela) pelo id, com as regras. Só aquela memória entra. */
export function contextoParaConversa(id, itens, guardados, foto = null) {
  const x = itens.find((y) => y.id === id);
  if (!x) return null;
  const c = foto ? contextoDaFoto(x, foto, guardados) : contextoDaMemoria(x, guardados);
  if (!c) return null;
  return { ...c, regras: REGRAS_DO_CONTEXTO, prompt: `${REGRAS_DO_CONTEXTO.map((r) => `- ${r}`).join("\n")}\n\n${c.texto}` };
}
