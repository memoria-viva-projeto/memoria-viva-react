// Memórias guardadas pela própria pessoa, com os arquivos (fotos, vídeos, áudios).
// Ficam no IndexedDB deste navegador: aguentam álbuns com muitas fotos e vídeos,
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

const BANCO = "memoria-viva";
const ESPERA = 4000; // se o banco não responder nisso, a tela avisa em vez de ficar "Abrindo…" para sempre

/** Abre um banco (na versão que já existir; as lojas só são criadas no primeiro uso). */
function abrirBanco(nome, lojas) {
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

function pedirEm(db, loja, modo, fazer) {
  return new Promise((ok, erro) => {
    const t = db.transaction(loja, modo);
    const r = fazer(t.objectStore(loja));
    t.oncomplete = () => ok(r?.result);
    t.onerror = t.onabort = () => erro(t.error || r?.error);
  });
}
const pedir = async (loja, modo, fazer) => pedirEm(await abrir(), loja, modo, fazer);

export const listarMemorias = () => pedir("memorias", "readonly", (s) => s.getAll());

// ---- família: banco próprio ----
let conexaoFamilia;
function abrirFamilia() {
  conexaoFamilia ||= abrirBanco("memoria-viva-familia", [["familia", "chave"]])
    .then((db) => { db.addEventListener("versionchange", () => { conexaoFamilia = null; }); return db; })
    .catch((e) => { conexaoFamilia = null; throw e; });
  return conexaoFamilia;
}

/** A família guardada. Na primeira vez, traz a que estava no banco das memórias (versões de teste anteriores), se ele responder. */
export async function lerFamilia() {
  const db = await abrirFamilia();
  const f = await pedirEm(db, "familia", "readonly", (s) => s.get("minha"));
  if (f) return f;
  try {
    // procura rápido: se o banco das memórias estiver preso, não segura a família por causa disso
    const antigo = await Promise.race([abrir(), new Promise((_, nao) => setTimeout(() => nao(new Error("demorou")), 1500))]);
    const nos = await pedirEm(antigo, "rascunhos", "readonly", (s) => s.get("familia"));
    if (nos?.pessoas) return nos;
    if (antigo.objectStoreNames.contains("familia")) return await pedirEm(antigo, "familia", "readonly", (s) => s.get("minha"));
  } catch { /* banco das memórias preso: começa pela família de demonstração */ }
  return null;
}
export const gravarFamilia = async (f) => pedirEm(await abrirFamilia(), "familia", "readwrite", (s) => s.put({ chave: "minha", pessoas: f.pessoas, lacos: f.lacos, versao: f.versao }));
export const salvarMemoria = (m) => pedir("memorias", "readwrite", (s) => s.put(m));
export const lerRascunho = (chave) => pedir("rascunhos", "readonly", (s) => s.get(chave));
export const salvarRascunho = (chave, m, passo) => pedir("rascunhos", "readwrite", (s) => s.put({ chave, m, passo, em: Date.now() }));
export const apagarRascunho = (chave) => pedir("rascunhos", "readwrite", (s) => s.delete(chave));
export const lerArquivo = (id) => pedir("arquivos", "readonly", (s) => s.get(id));
const gravarArquivo = (a) => pedir("arquivos", "readwrite", (s) => s.put(a));

export async function apagarMemoria(id) {
  await pedir("memorias", "readwrite", (s) => s.delete(id));
  await apagarRascunho(`editar-${id}`);
  await limparArquivos();
}

/** Ids de arquivos de uma memória (fotos, vídeo, anexos, capa). */
export const arquivosDe = (m) => (m.itens || []).map((it) => it.arq);

/** Apaga arquivos que nenhuma memória nem rascunho usa mais (fotos tiradas, rascunhos descartados). */
export async function limparArquivos() {
  const [ms, rs, ids, fam] = await Promise.all([
    listarMemorias(),
    listarRascunhos(),
    pedir("arquivos", "readonly", (s) => s.getAllKeys()),
    lerFamilia().catch(() => ({ indisponivel: true })),
  ]);
  if (fam?.indisponivel) return; // sem saber quais fotos a família usa, melhor não apagar nada
  const usados = new Set([...ms, ...rs.map((r) => r.m)].flatMap(arquivosDe));
  (fam?.pessoas || []).forEach((p) => p.fotoArq && usados.add(p.fotoArq)); // fotos dos familiares
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

/** Primeiro quadro do vídeo, para a miniatura (se o navegador conseguir abrir). */
function quadroDoVideo(arquivo) {
  return new Promise((ok) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(arquivo);
    const fim = (r) => { URL.revokeObjectURL(url); ok(r); };
    v.muted = true; v.preload = "auto"; v.playsInline = true;
    v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => {
      const f = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(v.videoWidth * f); cv.height = Math.round(v.videoHeight * f);
      cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
      cv.toBlob((mini) => fim({ mini, largura: v.videoWidth, altura: v.videoHeight, duracao: v.duration }), "image/jpeg", 0.8);
    };
    v.onerror = () => fim({});
    setTimeout(() => fim({}), 8000);
    v.src = url;
  });
}

/** Vídeo e áudio são guardados como vieram (sem cortar nem converter). */
export async function prepararMidia(arquivo, tipo) {
  const est = await navigator.storage?.estimate?.().catch(() => null);
  if (est && est.quota - est.usage < arquivo.size * 1.1) throw new Error("espaço");
  const extra = tipo === "video" ? await quadroDoVideo(arquivo) : {};
  const a = { id: novoId("arq"), tipo, blob: arquivo, nome: arquivo.name, ...extra };
  await gravarArquivo(a);
  return a;
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
  musica: { nome: "Música", um: "uma música", icone: "musica", desc: "A canção, quem cantava e a lembrança que ela traz." },
  receita: { nome: "Receita", um: "uma receita", icone: "receita", desc: "O jeito de fazer, quem fazia e as histórias da mesa." },
  video: { nome: "Vídeo", um: "um vídeo", icone: "video", desc: "Um momento com movimento e voz." },
};

export const novaMemoria = (tipo) => ({
  id: novoId("mem"), tipo, titulo: "", descricao: "", data: dataVazia(), lugar: "", pessoas: [], itens: [], capa: null, extra: {},
});

// legenda, data, lugar e observacao valem só para este arquivo; vazios = valem os do álbum
export const novoItem = (a) => ({ arq: a.id, tipo: a.tipo, legenda: "", data: null, lugar: "", observacao: "", marcas: [] });

export const listarRascunhos = () => pedir("rascunhos", "readonly", (s) => s.getAll()).then((rs) => rs.filter((r) => r.m));

/** Arquivo que representa a memória (capa do álbum, foto, quadro do vídeo, foto do prato). */
export const capaDe = (m) => m.capa || m.itens.find((it) => it.tipo !== "audio")?.arq || null;

/** "Álbum · 50 fotos", "Música · Luiz Gonzaga"... */
export function resumo(m) {
  const fotos = m.itens.filter((it) => it.tipo === "foto").length;
  if (m.tipo === "album") return `Álbum · ${fotos} ${fotos === 1 ? "foto" : "fotos"}`;
  if (m.tipo === "foto") return fotos > 1 ? `Fotografia · ${fotos} fotos` : "Fotografia";
  if (m.tipo === "musica") return m.extra.artista ? `Música · ${m.extra.artista}` : "Música";
  return TIPOS[m.tipo].nome;
}

/** Nome para mostrar: o título que a pessoa deu ou, se ela não escreveu, um nome simples (ela completa depois). */
export function tituloDe(m) {
  if (m.titulo?.trim()) return m.titulo.trim();
  const fotos = m.itens.filter((it) => it.tipo === "foto" && !it.anexo).length;
  return {
    foto: fotos > 1 ? `Lembrança com ${fotos} fotos` : "Uma fotografia",
    album: `Álbum com ${fotos} ${fotos === 1 ? "foto" : "fotos"}`,
    musica: m.extra?.youtube?.titulo || "Uma música",
    receita: "Uma receita",
    video: m.extra?.youtube?.titulo || "Um vídeo",
  }[m.tipo];
}

/** Cada memória começada tem o seu rascunho (dá para ter várias começadas ao mesmo tempo). */
export const novaChave = () => novoId("novo");

/** Gira a foto 90° no sentido do relógio (foto e miniatura). Devolve o arquivo novo. */
export async function girarFoto(id) {
  const a = await lerArquivo(id);
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
