// Memórias guardadas pela própria pessoa, com as fotos.
// Ficam no IndexedDB deste navegador: aguentam álbuns com muitas fotos,
// continuam lá ao trocar de tela ou recarregar, mas ainda não vão para um servidor
// (não aparecem em outro aparelho).
//
// Lojas:
// - "memorias": a memória pronta (id, tipo, titulo, descricao, data, lugar, pessoas, itens...)
// - "rascunhos": a memória sendo preenchida (chave "novo-album", "editar-<id>"...), salva a cada mudança
// - "arquivos": { id, blob, mini, tipo, largura, altura, nome } — o arquivo e a miniatura
//
// A família (ver familia.js) tem um banco só dela ("memoria-viva-familia"). Cada banco tem a sua fila de
// aberturas: se uma aba antiga deixar o banco das memórias preso, a família abre do mesmo jeito.

import { sessao } from "../../dados/conta.js";

const BANCO = "memoria-viva";
const ESPERA = 4000; // se o banco não responder nisso, a tela avisa em vez de ficar "Abrindo…" para sempre

/** Abre um banco (na versão que já existir; as lojas só são criadas no primeiro uso). */
export function abrirBanco(nome, lojas) {
  return new Promise((ok, erro) => {
    let desistiu = false;
    const prazo = setTimeout(() => {
      desistiu = true;
      window.dispatchEvent(new Event("mv-banco-bloqueado"));
      erro(Object.assign(new Error("O banco do navegador não respondeu."), { name: "BancoPreso" }));
    }, ESPERA);
    const r = indexedDB.open(nome);
    r.onupgradeneeded = () => {
      const db = r.result;
      lojas.forEach(([loja, keyPath]) => db.objectStoreNames.contains(loja) || db.createObjectStore(loja, { keyPath }));
    };
    r.onsuccess = () => {
      const db = r.result;
      clearTimeout(prazo);
      if (desistiu) { db.close(); return; } // respondeu tarde: a próxima tentativa abre de novo
      // se outra aba precisar atualizar o banco, esta solta a conexão (senão a outra fica esperando)
      db.onversionchange = () => db.close();
      window.dispatchEvent(new Event("mv-banco-livre"));
      ok(db);
    };
    r.onblocked = () => window.dispatchEvent(new Event("mv-banco-bloqueado"));
    r.onerror = () => { clearTimeout(prazo); erro(r.error); };
  });
}

let conexao;
function abrir() {
  conexao ||= abrirBanco(BANCO, [["memorias", "id"], ["rascunhos", "chave"], ["arquivos", "id"]])
    .then((db) => { db.addEventListener("versionchange", () => { conexao = null; }); return db; })
    .catch((e) => { conexao = null; throw e; });
  return conexao;
}

export function pedirEm(db, loja, modo, fazer) {
  return new Promise((ok, erro) => {
    const t = db.transaction(loja, modo);
    const r = fazer(t.objectStore(loja));
    t.oncomplete = () => ok(r?.result);
    t.onerror = t.onabort = () => erro(t.error || r?.error);
  });
}
const pedir = async (loja, modo, fazer) => pedirEm(await abrir(), loja, modo, fazer);

// ---- de quem é cada coisa guardada aqui ----
// Memórias e rascunhos levam a marca da conta que guardou ("conta": id do usuário; vazio = demonstração da Maria).
// Cada conta só vê o que é dela. O que foi guardado antes desta marca existir fica com a demonstração.
const dono = () => sessao.idUsuario ?? null;
const meu = (x) => (x?.conta ?? null) === dono();

const todasMemorias = () => pedir("memorias", "readonly", (s) => s.getAll());
export const listarMemorias = () => todasMemorias().then((ms) => ms.filter(meu));

// ---- família: banco próprio ----
let conexaoFamilia;
function abrirFamilia() {
  conexaoFamilia ||= abrirBanco("memoria-viva-familia", [["familia", "chave"]])
    .then((db) => { db.addEventListener("versionchange", () => { conexaoFamilia = null; }); return db; })
    .catch((e) => { conexaoFamilia = null; throw e; });
  return conexaoFamilia;
}

/** A família guardada. Na primeira vez, traz a que estava no banco das memórias (versões de teste anteriores), se ele responder. */
// cada conta com login tem a sua família neste navegador; sem login, é a da demonstração ("minha")
const chaveFamilia = () => (sessao.idUsuario ? `u${sessao.idUsuario}` : "minha");

export async function lerFamilia() {
  const db = await abrirFamilia();
  const f = await pedirEm(db, "familia", "readonly", (s) => s.get(chaveFamilia()));
  if (f || sessao.idUsuario) return f || null; // conta nova não herda a família das versões de teste
  try {
    // procura rápido: se o banco das memórias estiver preso, não segura a família por causa disso
    const antigo = await Promise.race([abrir(), new Promise((_, nao) => setTimeout(() => nao(new Error("demorou")), 1500))]);
    const nos = await pedirEm(antigo, "rascunhos", "readonly", (s) => s.get("familia"));
    if (nos?.pessoas) return nos;
    if (antigo.objectStoreNames.contains("familia")) return await pedirEm(antigo, "familia", "readonly", (s) => s.get("minha"));
  } catch { /* banco das memórias preso: começa pela família de demonstração */ }
  return null;
}
export const gravarFamilia = async (f) => pedirEm(await abrirFamilia(), "familia", "readwrite", (s) => s.put({ chave: chaveFamilia(), pessoas: f.pessoas, lacos: f.lacos, versao: f.versao }));
export const salvarMemoria = (m) => pedir("memorias", "readwrite", (s) => s.put({ ...m, conta: dono() }));
export const lerRascunho = (chave) => pedir("rascunhos", "readonly", (s) => s.get(chave)).then((r) => (meu(r) ? r : undefined));
export const salvarRascunho = (chave, m, passo) => pedir("rascunhos", "readwrite", (s) => s.put({ chave, m, passo, em: Date.now(), conta: dono() }));
export const apagarRascunho = (chave) => pedir("rascunhos", "readwrite", (s) => s.delete(chave));
// ---- arquivos guardados no SERVIDOR (conta com login): id "srv-arq-<número>" ----
// O conteúdo não fica no navegador: a tela usa o endereço protegido /api/arquivos/<número>, que confere
// a sessão a cada pedido. Aqui só lembramos o que o servidor contou de cada um (tamanho, se tem miniatura).
export const ehDoServidor = (id) => typeof id === "string" && id.startsWith("srv-arq-");
export const numeroNoServidor = (id) => Number(id.slice("srv-arq-".length));
const dadosDoServidor = new Map();
/** Guarda o que o servidor contou do arquivo: { tipo, largura, altura, temMiniatura }. */
export const lembrarDoServidor = (id, dados) => dadosDoServidor.set(id, { id, ...dados });
const enderecoNoServidor = (id, mini) => `/api/arquivos/${numeroNoServidor(id)}${mini ? "?mini=1" : ""}`;

/** O arquivo guardado. Do servidor: só os dados dele (largura, altura...), sem o conteúdo. */
export const lerArquivo = (id) =>
  ehDoServidor(id) ? Promise.resolve(dadosDoServidor.get(id) || { id }) : pedir("arquivos", "readonly", (s) => s.get(id));

/** O conteúdo (Blob) de um arquivo, esteja no navegador ou no servidor. */
export async function conteudoDoArquivo(id, mini = false) {
  if (!ehDoServidor(id)) {
    const a = await lerArquivo(id);
    return a ? (mini ? a.mini || a.blob : a.blob) : null;
  }
  const r = await fetch(enderecoNoServidor(id, mini), { credentials: "same-origin" });
  return r.ok ? r.blob() : null;
}
const gravarArquivo = (a) => pedir("arquivos", "readwrite", (s) => s.put(a));

export async function apagarMemoria(id) {
  await pedir("memorias", "readwrite", (s) => s.delete(id));
  await apagarRascunho(`editar-${id}`);
  await limparArquivos();
}

/** Ids de arquivos de uma memória (fotos, anexos, capa). */
export const arquivosDe = (m) => (m.itens || []).map((it) => it.arq);

/**
 * Apaga arquivos que nenhuma memória nem rascunho usa mais (fotos tiradas, rascunhos descartados).
 * Olha TODAS as contas deste navegador: o arquivo de uma conta nunca é apagado pela faxina de outra.
 */
export async function limparArquivos() {
  const [ms, rs, ids, familias] = await Promise.all([
    todasMemorias(),
    todosRascunhos(),
    pedir("arquivos", "readonly", (s) => s.getAllKeys()),
    abrirFamilia().then((db) => pedirEm(db, "familia", "readonly", (s) => s.getAll())).catch(() => null),
  ]);
  if (!familias) return; // sem saber quais fotos as famílias usam, melhor não apagar nada
  const usados = new Set([...ms, ...rs.map((r) => r.m)].flatMap(arquivosDe));
  familias.forEach((f) => (f.pessoas || []).forEach((p) => p.fotoArq && usados.add(p.fotoArq))); // fotos dos familiares
  const sobras = ids.filter((id) => !usados.has(id));
  if (sobras.length) await pedir("arquivos", "readwrite", (s) => sobras.forEach((id) => s.delete(id)));
  sobras.forEach(esquecerURL);
}

/** Pede ao navegador para não apagar estes dados quando faltar espaço (ele decide se aceita). */
export const pedirPermanencia = () => navigator.storage?.persist?.().catch(() => {});

export const novoId = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---- preparar arquivos ----

function carregarImagem(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error("imagem"));
    img.src = URL.createObjectURL(arquivo);
  });
}

function redimensionar(img, lado, qualidade) {
  const f = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.naturalWidth * f);
  cv.height = Math.round(img.naturalHeight * f);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise((ok) => cv.toBlob(ok, "image/jpeg", qualidade));
}

/** Foto: guarda uma versão de até 1600 px (boa para ver em tela cheia) e uma miniatura de 480 px. */
export async function prepararFoto(arquivo) {
  const img = await carregarImagem(arquivo);
  try {
    const [blob, mini] = await Promise.all([redimensionar(img, 1600, 0.86), redimensionar(img, 480, 0.8)]);
    const a = { id: novoId("arq"), tipo: "foto", blob, mini, largura: img.naturalWidth, altura: img.naturalHeight, nome: arquivo.name };
    await gravarArquivo(a);
    return a;
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

export const ehCheio = (e) => e?.name === "QuotaExceededError" || e?.message === "espaço";

// ---- endereços para mostrar os arquivos na tela ----
// As miniaturas ficam na memória enquanto a página está aberta (são pequenas e aparecem muito).
const miniaturas = new Map();
function esquecerURL(id) {
  const u = miniaturas.get(id);
  if (u) { URL.revokeObjectURL(u); miniaturas.delete(id); }
}

export async function urlDoArquivo(id, mini) {
  if (ehDoServidor(id)) {
    const d = dadosDoServidor.get(id);
    return { url: enderecoNoServidor(id, mini), fica: true, servidor: true };
  }
  if (mini && miniaturas.has(id)) return { url: miniaturas.get(id), fica: true };
  const a = await lerArquivo(id);
  if (!a) return null;
  const b = mini ? a.mini || (a.tipo === "foto" ? a.blob : null) : a.blob;
  if (!b) return null;
  const url = URL.createObjectURL(b);
  if (mini) miniaturas.set(id, url);
  return { url, fica: mini, arquivo: a };
}

// ---- datas ----
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Data, do jeito que a pessoa sabe: o dia exato, mês e ano, só o ano, a década, um período, ou "não sei".
 * modo: "dia" | "mes" | "ano" | "decada" | "periodo" | "naosei" (dados antigos, sem modo, são deduzidos).
 */
export const modoData = (d) => d?.modo || (d?.naoSei ? "naosei" : d?.decada ? "decada" : d?.anoFim ? "periodo" : d?.dia ? "dia" : d?.mes ? "mes" : d?.ano ? "ano" : "");

/** "15 de agosto de 2010", "agosto de 2010", "Por volta de 1980", "1980 a 1985", "Anos 1970"... ("" se não tem data). */
export function textoData(d) {
  if (!d) return "";
  if (modoData(d) === "decada") return d.decada ? `Anos ${d.decada}` : "";
  if (!(d.ano || d.mes)) return "";
  let t = [d.dia && d.mes ? Number(d.dia) : null, d.mes ? MESES[Number(d.mes) - 1] : null, d.ano].filter(Boolean).join(" de ");
  if (d.ano && d.anoFim && d.anoFim !== d.ano) t = `${t} a ${d.anoFim}`;
  return d.aprox ? `Por volta de ${t}` : t;
}

export const dataVazia = () => ({ modo: "", dia: "", mes: "", ano: "", anoFim: "", decada: "", aprox: false, naoSei: false });

/**
 * Etiquetas de tempo: o que a pessoa lembra quando não sabe a data ("Infância", "Natal"...).
 * Ficam em m.etiquetas (e it.etiquetas numa foto), separadas da data: nunca viram um ano.
 */
export const ETIQUETAS_TEMPO = [
  ["Fases da vida", [["infancia", "Infância"], ["adolescencia", "Adolescência"], ["juventude", "Juventude"], ["adulta", "Vida adulta"], ["terceira-idade", "Terceira idade"]]],
  ["Momentos e períodos", [["escola", "Época da escola"], ["trabalho", "Início da vida profissional"], ["filhos-pequenos", "Quando meus filhos eram pequenos"],
    ["meus-pais", "Época dos meus pais"], ["antigamente", "Antigamente"], ["fase-especial", "Uma fase especial da vida"]]],
  ["Ocasiões", [["aniversario", "Aniversário"], ["casamento", "Casamento"], ["natal", "Natal"], ["viagem", "Viagem"], ["reuniao", "Reunião de família"],
    ["formatura", "Formatura"], ["festa", "Festa"], ["momento-especial", "Outro momento especial"]]],
];
const NOME_ETIQUETA = Object.fromEntries(ETIQUETAS_TEMPO.flatMap(([, l]) => l));
export const nomeEtiqueta = (k) => NOME_ETIQUETA[k] || k;

/** Quando, juntando data e etiquetas: "Anos 1970 · Infância · Natal" ("" se a pessoa não disse nada). */
export function textoQuando(o) {
  const partes = [textoData(o?.data), ...(o?.etiquetas || []).map(nomeEtiqueta)].filter(Boolean);
  if (partes.length) return partes.join(" · ");
  return modoData(o?.data) === "naosei" ? "Não sei quando" : "";
}

/** Data de quando a memória foi guardada (não é a data do acontecimento). */
export const textoRegistro = (iso) => {
  const d = new Date(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

// ---- tipos de memória ----
export const TIPOS = {
  foto: { nome: "Fotografia", um: "uma fotografia", icone: "foto", desc: "Uma foto e a história por trás dela." },
  album: { nome: "Álbum de fotografias", um: "um álbum", icone: "album", desc: "Muitas fotos de um mesmo dia, lugar ou época. Você conta uma vez só." },
};

/** Só foto e álbum fazem parte do projeto (o que estiver de outro tipo neste aparelho, de versões antigas, não aparece). */
export const tipoValido = (m) => Boolean(m && TIPOS[m.tipo]);

export const novaMemoria = (tipo) => ({
  id: novoId("mem"), tipo, titulo: "", descricao: "", data: dataVazia(), lugar: "", pessoas: [], itens: [], capa: null, extra: {},
});

// legenda, data, lugar e observacao valem só para este arquivo; vazios = valem os do álbum
export const novoItem = (a) => ({ arq: a.id, tipo: a.tipo, legenda: "", data: null, lugar: "", observacao: "", marcas: [] });

const todosRascunhos = () => pedir("rascunhos", "readonly", (s) => s.getAll()).then((rs) => rs.filter((r) => r.m));
export const listarRascunhos = () => todosRascunhos().then((rs) => rs.filter((r) => meu(r) && tipoValido(r.m)));

/** As fotos de um álbum (ou de uma lembrança com várias fotos), na ordem em que a pessoa deixou. */
export const fotosDe = (m) => m.itens.filter((it) => it.tipo === "foto" && !it.anexo);
/**
 * A chave de uma foto dentro da memória: liga comentários e reações a ela.
 * Girar a foto troca o arquivo (arq), por isso a foto guarda a chave de origem em it.id.
 */
export const chaveDaFoto = (it) => it.id || it.arq;

/** Arquivo que representa a memória (capa do álbum ou a foto). */
export const capaDe = (m) => m.capa || m.itens.find((it) => it.tipo === "foto")?.arq || null;

/** "Álbum · 50 fotos", "Fotografia"... */
export function resumo(m) {
  const fotos = m.itens.filter((it) => it.tipo === "foto").length;
  if (m.tipo === "album") return `Álbum · ${fotos} ${fotos === 1 ? "foto" : "fotos"}`;
  if (m.tipo === "foto") return fotos > 1 ? `Fotografia · ${fotos} fotos` : "Fotografia";
  return TIPOS[m.tipo].nome;
}

/** Nome para mostrar: o título que a pessoa deu ou, se ela não escreveu, um nome simples (ela completa depois). */
export function tituloDe(m) {
  if (m.titulo?.trim()) return m.titulo.trim();
  const fotos = m.itens.filter((it) => it.tipo === "foto" && !it.anexo).length;
  return {
    foto: fotos > 1 ? `Lembrança com ${fotos} fotos` : "Uma fotografia",
    album: `Álbum com ${fotos} ${fotos === 1 ? "foto" : "fotos"}`,
  }[m.tipo] || "Uma memória";
}

/** Cada memória começada tem o seu rascunho (dá para ter várias começadas ao mesmo tempo). */
export const novaChave = () => novoId("novo");

/** Gira a foto 90° no sentido do relógio (foto e miniatura). Devolve o arquivo novo. */
export async function girarFoto(id) {
  // foto do servidor: baixa, gira aqui e vira um arquivo novo do navegador (vai para o servidor ao guardar)
  const a = ehDoServidor(id)
    ? await (async () => {
        const blob = await conteudoDoArquivo(id);
        if (!blob) throw new Error("A foto não está disponível.");
        const d = dadosDoServidor.get(id) || {};
        return { tipo: "foto", blob, mini: null, largura: d.largura, altura: d.altura, nome: "foto.jpg" };
      })()
    : await lerArquivo(id);
  const girar = async (blob, qualidade) => {
    const img = await carregarImagem(blob);
    try {
      const cv = document.createElement("canvas");
      cv.width = img.naturalHeight; cv.height = img.naturalWidth;
      const c = cv.getContext("2d");
      c.translate(cv.width, 0);
      c.rotate(Math.PI / 2);
      c.drawImage(img, 0, 0);
      return await new Promise((ok) => cv.toBlob(ok, "image/jpeg", qualidade));
    } finally {
      URL.revokeObjectURL(img.src);
    }
  };
  const [blob, mini] = await Promise.all([girar(a.blob, 0.86), girar(a.mini || a.blob, 0.8)]);
  const novo = { ...a, id: novoId("arq"), blob, mini, largura: a.altura, altura: a.largura };
  await gravarArquivo(novo);
  return novo;
}
