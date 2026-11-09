// Conversar · respostas de DEMONSTRAÇÃO, montadas só com o que está no acervo.
// Nada aqui inventa relato, salva, muda ou confirma memória: só lê.
// Para a IA de verdade, troque o miolo de `responder` por uma chamada ao servidor
// (como api/musica.js), mantendo a mesma entrada e a mesma saída: { texto, fontes, estado }.

import { CONTA, pessoa } from "../../dados/conta.js";
import { capaDe, textoQuando, tituloDe } from "./guardados.js";
import { pessoasDe } from "./pessoas.jsx";
import { ROTAS } from "./rotas.jsx";

/** "Conversar sobre esta foto", "... este álbum"... */
export const SOBRE = { foto: "esta foto", album: "este álbum", musica: "esta música", receita: "esta receita", video: "este vídeo", conselho: "este conselho" };

// ---- o acervo num formato só (memórias da demonstração + as guardadas neste aparelho) ----
const lista = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : x?.texto || "")).join(", ") : typeof v === "string" ? v : "");

export function montarAcervo(memorias, guardadas) {
  const demo = memorias.map((m) => ({
    id: m.id, titulo: m.titulo, tipo: m.tipo, quando: m.quando || "", ano: m.ano || null, lugar: m.lugar || "",
    pessoas: m.pessoas || [], historia: m.texto || m.frase || "", receita: m.receita || "", campos: {},
    busca: [m.texto, m.frase, m.receita, m.legenda, m.guardadoPara].filter(Boolean).join(" "),
    status: m.status, enviadaPor: m.origem.tipo === "familia" ? m.origem.por : null,
    sugestao: m.status === "aguardando" ? m.sugestaoIA : null,
    foto: m.foto, alt: m.alt, para: `${ROTAS.historia}#mem-${m.id}`,
  }));
  const minhas = guardadas.map((m) => {
    const x = m.extra || {};
    return {
      id: m.id, titulo: tituloDe(m), tipo: m.tipo, quando: textoQuando(m), ano: Number(m.data?.ano) || null, lugar: m.lugar || "",
      pessoas: pessoasDe(m), historia: m.descricao || x.lembranca || x.porque || x.contexto || "",
      receita: m.tipo === "receita" ? tituloDe(m) : "",
      // o que a pessoa escreveu no editor de música, receita ou vídeo
      campos: { artista: x.artista || "", quemOuvia: x.quemOuvia || "", momento: x.momento || "", porque: x.porque || "", lembranca: x.lembranca || "",
        quemFazia: x.quem || "", ocasioes: x.ocasioes || "", segredos: x.segredos || "", ingredientes: lista(x.ingredientes), contexto: x.contexto || "" },
      busca: [m.descricao, x.artista, x.porque, x.lembranca, x.quemOuvia, x.momento, x.contexto, x.quem, x.ocasioes, x.segredos, lista(x.ingredientes), lista(x.preparo)].filter(Boolean).join(" "),
      status: "confirmada", guardada: true, enviadaPor: null, sugestao: null,
      arq: capaDe(m), para: `${ROTAS.memoria}/${m.id}`,
    };
  });
  return [...minhas, ...demo];
}

// ---- texto ----
const norm = (t = "") => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PARADAS = new Set("a o as os um uma uns umas de da do das dos e em no na nos nas para por com sem que qual quais quem quando onde como meu minha meus minhas seu sua eu voce me mim ele ela isso esse essa este esta tem foi era sao sobre mais muito tudo algum alguma alguem guardei guardou guardada guardadas memoria memorias lembranca lembrancas foto fotos acervo".split(" "));
const palavras = (t) => norm(t).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !PARADAS.has(p));
const juntar = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs[xs.length - 1]}`);
const nomes = (refs) => juntar(refs.map((r) => pessoa(r).nome));
// "Por volta de 1990" no meio da frase: "por volta de 1990"
const noMeio = (t = "") => (/^(Por volta|Anos|Não sei)/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
// "seu marido", "sua filha"
const seuSua = (rel) => `${/a$/.test(rel.split(" ")[0]) ? "sua" : "seu"} ${rel}`;

// com "?" ou começando como pergunta (o ditado não escreve o "?")
// "Quando eu era menina..." e "Porque me lembra..." são relato, não pergunta.
const ehPergunta = (t) => {
  if (/\?\s*$/.test(t)) return true;
  const q = norm(t).trim();
  if (/^(quando|onde|o que) (eu|a gente|nos|ela|ele|era|eles|elas|minha|meu)\b/.test(q)) return false;
  return /^(quem|quando|onde|qual|quais|o que|quant[oa]s?|por que|como (foi|se chama)|existe|me (conta|conte|fala|fale|mostra|mostre|diga|diz)|mostra|cade|voce sabe)\b/.test(q);
};

// sobre o que a pergunta é (pode ser mais de um)
function assuntos(q) {
  const cantor = /quem (canta|cantava|cantou|gravou)|cantor|cantora|artista|interprete/.test(q);
  const quemOuvia = /quem (ouvia|escutava)/.test(q);
  const quemFazia = /quem (fazia|faz|fez|cozinhava|ensinou|inventou)/.test(q);
  return {
    cantor, quemOuvia, quemFazia,
    momento: /\bepoca\b|\bmomento\b|\bfase\b|quando (tocava|ouvia)/.test(q),
    porque: /importante|especial/.test(q),
    ocasioes: /ocasi|quando (era|e) feit|quando (fazia|fazem)|festa/.test(q),
    ingredientes: /ingrediente|\bleva\b|o que vai/.test(q),
    segredos: /segredo/.test(q),
    quem: !cantor && !quemOuvia && !quemFazia && /\bquem\b|pessoas|aparece|estava|estavam|marcad/.test(q),
    quando: /\bquando\b|\bano\b|\bdata\b|\bdecada\b|\bepoca\b|\bidade\b/.test(q),
    onde: /\bonde\b|\blugar\b|\bcidade\b/.test(q),
    historia: /historia|aconteceu|\bconta\b|\bconte\b|contou|lembra/.test(q),
    quemEnviou: /enviou|mandou|quem (guardou|postou)/.test(q),
  };
}

const TIPO_PALAVRAS = [
  ["receita", /receita|bolo|comida|cozinha|doce|prato/], ["musica", /musica|cancao|cantava|cantar/],
  ["conselho", /conselho/], ["video", /video/], ["album", /album/],
];

/** Pontua cada memória pela pergunta (ano, década, tipo, pessoa, lugar, palavras). */
function buscar(q, itens) {
  const anos = (q.match(/\b(1[89]\d\d|20\d\d)\b/g) || []).map(Number);
  const dec = q.match(/\b(?:anos|decada de)\s*(\d{2,4})\b/);
  const decada = dec ? (dec[1].length === 2 ? 1900 + Number(dec[1]) : Number(dec[1])) : null;
  const tipos = TIPO_PALAVRAS.filter(([, re]) => re.test(q)).map(([t]) => t);
  const ps = palavras(q);
  const gente = CONTA.familia.filter((p) => p.id !== CONTA.pessoa.id && ps.some((w) => palavras(p.nome).includes(w) || norm(p.relacao).split(" ").includes(w)));

  return itens.map((m) => {
    let s = 0;
    if (m.ano && anos.includes(m.ano)) s += 5;
    if (m.ano && decada && m.ano >= decada && m.ano < decada + 10) s += 4;
    if (tipos.includes(m.tipo)) s += 4;
    if (gente.some((p) => m.pessoas.includes(p.id) || m.enviadaPor === p.id)) s += 4;
    const lugar = palavras(m.lugar), titulo = palavras(m.titulo), resto = palavras(m.busca);
    ps.forEach((w) => { if (lugar.includes(w)) s += 3; else if (titulo.includes(w)) s += 2; else if (resto.includes(w)) s += 1; });
    return { m, s };
  }).filter((r) => r.s >= 2).sort((a, b) => b.s - a.s).map((r) => r.m);
}

// ---- frases ----
export function situacao(m) {
  if (m.status === "aguardando") return { texto: "Esperando sua confirmação", confirmada: false };
  return { texto: m.enviadaPor ? "Confirmada por você" : m.guardada ? "Guardada por você" : "Contada por você", confirmada: true };
}

function fraseStatus(m) {
  if (m.status !== "aguardando") return "";
  return m.enviadaPor
    ? ` Atenção: ${pessoa(m.enviadaPor).nome} enviou esta memória, e ela ainda espera a sua confirmação.`
    : " Atenção: esta memória ainda espera a sua confirmação.";
}

const linha = (m) => `“${m.titulo}”${m.quando ? `, ${noMeio(m.quando)}` : ""}${m.lugar ? `, em ${m.lugar}` : ""}${m.status === "aguardando" ? " (esperando sua confirmação)" : ""}`;

// frase inteira de "não está guardado" ({t} = título entre aspas)
const naoGuardado = (frase, m) => `${frase.replace("{t}", `“${m.titulo}”`)} Se você lembrar, pode me contar.`;

/** O que só música, receita e vídeo têm (respostas com os campos do editor). */
function doTipo(m, a) {
  const c = m.campos || {};
  const partes = [];
  if (m.tipo === "musica") {
    if (a.cantor) partes.push(c.artista ? `“${m.titulo}” é de ${c.artista}.` : naoGuardado("Não está guardado quem canta {t}.", m));
    if (a.quemOuvia) partes.push(c.quemOuvia ? `Quem costumava ouvir: ${c.quemOuvia}.` : naoGuardado("Não está guardado quem costumava ouvir {t}.", m));
    if (a.momento) partes.push(c.momento ? `O momento da vida: ${c.momento}.` : naoGuardado("Não está guardado em que época da vida {t} tocava.", m));
    if (a.porque) partes.push(c.porque ? `Por que é importante: ${c.porque}` : naoGuardado("Ainda não está guardado por que {t} é especial para você.", m));
    if (a.historia && c.lembranca) partes.push(`A lembrança que ela traz: ${c.lembranca}`);
  }
  if (m.tipo === "receita") {
    if (a.quemFazia) partes.push(c.quemFazia ? `Quem fazia: ${c.quemFazia}.` : naoGuardado("Não está guardado quem fazia {t}.", m));
    if (a.ocasioes) partes.push(c.ocasioes ? `Era feita em: ${c.ocasioes}.` : naoGuardado("Não está guardado quando {t} era feita.", m));
    if (a.ingredientes) partes.push(c.ingredientes ? `Ingredientes: ${c.ingredientes}.` : naoGuardado("Os ingredientes de {t} ainda não estão guardados.", m));
    if (a.segredos) partes.push(c.segredos ? `O segredo guardado: ${c.segredos}` : naoGuardado("Nenhum segredo de {t} está guardado ainda.", m));
  }
  if (m.tipo === "video" && a.historia && c.contexto) partes.push(`O que acontecia: ${c.contexto}`);
  return partes;
}

function sobreUma(m, a) {
  const partes = doTipo(m, a);
  const doTipoRespondeu = partes.length > 0;
  if (a.quem) {
    partes.push(m.pessoas.length ? `Em “${m.titulo}”, ${m.pessoas.length > 1 ? "aparecem" : "aparece"} ${nomes(m.pessoas)}.`
      : `Ainda não marcaram ninguém em “${m.titulo}”. Se você lembra quem estava, pode me contar.`);
  }
  if (a.quando) {
    if (m.sugestao?.campo === "data") partes.push(`A data “${noMeio(m.quando)}” é um palpite da IA, ainda sem a sua confirmação. O palpite foi: “${m.sugestao.texto}”`);
    else partes.push(m.quando ? `“${m.titulo}” é de ${noMeio(m.quando)}.` : `Não está guardado quando foi “${m.titulo}”.`);
  }
  if (a.onde) partes.push(m.lugar ? `Foi em ${m.lugar}.` : `Não está guardado onde foi “${m.titulo}”.`);
  if (a.historia && !doTipoRespondeu) partes.push(m.historia ? `O que está guardado: “${m.historia}”` : `Ninguém contou a história de “${m.titulo}” ainda. Se quiser, me conte o que você lembra.`);
  if (a.quemEnviou) partes.push(m.enviadaPor ? `Quem enviou foi ${pessoa(m.enviadaPor).nome}.` : "Foi você que guardou.");
  if (!partes.length) {
    partes.push(`${linha(m).replace(" (esperando sua confirmação)", "")}.`);
    if (m.receita && m.receita !== m.titulo) partes.push(`Receita: ${m.receita}.`);
    if (m.campos.artista) partes.push(`Música de ${m.campos.artista}.`);
    if (m.campos.quemFazia) partes.push(`Quem fazia: ${m.campos.quemFazia}.`);
    if (m.pessoas.length) partes.push(`${m.pessoas.length > 1 ? "Aparecem" : "Aparece"}: ${nomes(m.pessoas)}.`);
  }
  return partes.join(" ") + fraseStatus(m);
}

const NAO_SEI = "Não encontrei isso no seu acervo. Eu só respondo com o que está guardado aqui. Se alguém da família souber, vale perguntar e guardar depois.";

/** Responde a uma pergunta, só com o acervo. */
function responderPergunta(texto, sobre, itens) {
  const q = norm(texto);
  const a = assuntos(q);
  const achadas = buscar(q, itens);

  // quantas memórias
  if (/\bquant[oa]s\b/.test(q) && /memoria|lembranca|foto|receita|musica|video|album|conselho/.test(q)) {
    const tipo = TIPO_PALAVRAS.find(([, re]) => re.test(q))?.[0] || (/\bfotos?\b/.test(q) ? "foto" : null);
    const conta = tipo ? itens.filter((m) => m.tipo === tipo) : itens;
    const espera = conta.filter((m) => m.status === "aguardando").length;
    const n = conta.length;
    const nome = { foto: ["foto", "fotos"], receita: ["receita", "receitas"], musica: ["música", "músicas"], video: ["vídeo", "vídeos"], album: ["álbum", "álbuns"], conselho: ["conselho", "conselhos"] }[tipo] || ["lembrança", "lembranças"];
    if (!n) return { texto: `Não há nenhuma ${nome[0] === "álbum" || nome[0] === "vídeo" || nome[0] === "conselho" ? "memória desse tipo" : nome[0]} no seu acervo ainda.`, fontes: [] };
    return {
      texto: `No seu acervo há ${n} ${nome[n === 1 ? 0 : 1]}.` + (espera ? ` ${espera === 1 ? "Uma ainda espera" : `${espera} ainda esperam`} a sua confirmação.` : n > 1 ? " Todas confirmadas." : " Está confirmada."),
      fontes: conta.slice(0, 3).map((m) => m.id),
    };
  }

  // o que espera confirmação
  if (/esperando|pendente|confirmar|confirmacao|conferir/.test(q)) {
    const espera = itens.filter((m) => m.status === "aguardando");
    if (!espera.length) return { texto: "Nada está esperando a sua confirmação agora. Está tudo em dia.", fontes: [] };
    return { texto: `${espera.length === 1 ? "Esta memória espera" : "Estas memórias esperam"} a sua confirmação: ${espera.map(linha).map((l) => l.replace(" (esperando sua confirmação)", "")).join("; ")}. Nada vale sem você conferir.`, fontes: espera.map((m) => m.id) };
  }

  // quem é alguém da família
  const quemE = q.match(/quem (?:e|era|sao) (?:o |a |os |as |meu |minha |meus |minhas )?(.+?)\??$/);
  if (quemE) {
    const alvo = palavras(quemE[1]);
    const ps = CONTA.familia.filter((p) => p.id !== CONTA.pessoa.id && alvo.some((w) => palavras(p.nome).includes(w) || norm(p.relacao).split(" ").includes(w)));
    if (ps.length) {
      return {
        texto: ps.map((p) => (p.relacao ? `${p.nome} é ${seuSua(p.relacao)}.` : `${p.nome} está na sua família, mas o parentesco não está guardado.`)).join(" "),
        fontes: [], pessoas: ps.map((p) => p.id),
      };
    }
  }

  // pergunta sobre a memória da conversa (a não ser que fale claramente de outra)
  if (sobre && (!achadas.length || achadas[0].id === sobre.id)) {
    return { texto: sobreUma(sobre, a), fontes: [sobre.id] };
  }

  if (!achadas.length) return { texto: NAO_SEI, fontes: [] };
  const top = achadas.slice(0, 3);
  if (top.length === 1 || a.quem || a.quando || a.onde || a.historia || a.quemEnviou) {
    if (top.length === 1) return { texto: sobreUma(top[0], a), fontes: [top[0].id] };
    return { texto: top.map((m) => sobreUma(m, a)).join("\n\n"), fontes: top.map((m) => m.id) };
  }
  return { texto: `Encontrei no seu acervo: ${top.map(linha).join("; ")}.${achadas.length > 3 ? ` E mais ${achadas.length - 3}.` : ""}`, fontes: top.map((m) => m.id) };
}

// ---- ajudar a contar: uma pergunta por vez ----
const GERAIS = [
  "De quando é essa lembrança, mais ou menos?",
  "Quem estava com você?",
  "Onde foi?",
  "O que você sentiu nesse dia?",
  "Tem alguém da família que precisa conhecer essa história?",
];
const OBRIGADA = ["Obrigada por me contar.", "Que bom lembrar disso.", "Entendi."];

// o que a pessoa já disse e responde a pergunta antes de ela ser feita
const DISSE = {
  onde: /\b(no|na|em|do|da) (radio|vitrola|toca-discos|casa|igreja|baile|festa|carro|cozinha|sala|sitio|fazenda|escola|praca)\b|\bradio\b|\bvitrola\b/,
  quem: /\b(meu|minha|meus|minhas) (pai|mae|pais|marido|esposo|irma|irmao|irmas|irmaos|avo|vo|vovo|tia|tio|filha|filho|filhas|filhos|amiga|amigo|madrinha|padrinho|sogra|sogro)\b|\bdona \w+|\bseu \w+ (fazia|cantava|ouvia)/,
  epoca: /\b(19|20)\d\d\b|\banos \d0\b|quando eu era|\binfancia\b|\bjuventude\b|\bmocinha\b|\bmenina\b|\bcrianca\b|\bnamorando\b|\bsolteira\b|\brecem.casad/,
  ocasiao: /\bnatal\b|\bpascoa\b|aniversario|\bdomingo|\bfesta|junina|ano novo|casamento|\bsempre que\b|\btodo (dia|domingo|sabado|ano)\b/,
  cheiro: /\bcheiro|\bcheirava|\baroma/,
  segredo: /\bsegredo|\bo truque\b|\bo ponto\b/,
  sentiu: /\bsenti\b|\bsaudade|\bemocion|\bchorei|\bfeliz|\balegria/,
  filmando: /\bfilmou\b|\bfilmando\b|\bgravou\b|\bgravando\b/,
};

// [pergunta, o campo que, se já preenchido, faz pular a pergunta, o que a pessoa já disse e também faz pular]
const POR_TIPO = {
  musica: [
    ["Onde você ouvia essa música?", null, DISSE.onde],
    ["Quem costumava cantar ou ouvir com você?", "quemOuvia", DISSE.quem],
    ["Em que época da vida ela tocava mais?", "momento", DISSE.epoca],
    ["Que lembrança vem quando você escuta essa música?", "lembranca"],
    ["Por que essa música é especial para você?", "porque"],
    ["Tem algum trecho da letra que você sabe de cor?"],
    ["Tem alguém da família que precisa ouvir essa música com você?"],
  ],
  receita: [
    ["Quem fazia essa receita?", "quemFazia", DISSE.quem],
    ["Em que ocasiões ela aparecia na mesa?", "ocasioes", DISSE.ocasiao],
    ["Quem ensinou essa receita para você?"],
    ["Que cheiro vem à memória quando você pensa nela?", null, DISSE.cheiro],
    ["Tem algum segredo que só a família sabe?", "segredos", DISSE.segredo],
    ["Quem da família mais gostava dela?"],
    ["Tem alguém que você quer que aprenda a fazer?"],
  ],
  video: [
    ["O que estava acontecendo nesse vídeo?", "contexto", DISSE.ocasiao],
    ["Quem aparece ou fala no vídeo?", "pessoas", DISSE.quem],
    ["Quem estava filmando?", null, DISSE.filmando],
    ["Onde ele foi gravado?", "lugar", DISSE.onde],
    ["O que você sentiu ao ver esse momento de novo?", null, DISSE.sentiu],
    ["De que parte do vídeo você mais gosta?"],
  ],
};
const preenchido = (sobre, campo) => (campo === "pessoas" ? sobre.pessoas.length > 0 : campo === "lugar" ? !!sobre.lugar : !!sobre.campos?.[campo]);

/**
 * Perguntas que fazem sentido para esta memória: sem repetir o que já está guardado
 * nem o que a pessoa já contou nesta conversa (ditos).
 */
export function perguntasPara(sobre, ditos = "") {
  if (!sobre) return GERAIS;
  if (POR_TIPO[sobre.tipo]) {
    const ja = norm(ditos);
    return POR_TIPO[sobre.tipo].filter(([, campo, disse]) => !(campo && preenchido(sobre, campo)) && !(disse && disse.test(ja))).map(([p]) => p);
  }
  const comFoto = sobre.tipo === "foto" || sobre.tipo === "album";
  return [...CONTA.perguntas, "Tem mais alguma coisa desse dia que você quer que a família saiba?"].filter((p) => {
    if (!comFoto && /foto/.test(p)) return false;
    if (sobre.lugar && /^Onde/.test(p)) return false;
    if (sobre.pessoas.length && /^Quem estava/.test(p)) return false;
    return true;
  });
}

function continuarContando(conversa, sobre) {
  const feitas = conversa.perguntadas || [];
  const ditos = conversa.mensagens.filter((m) => m.de === "voce").map((m) => m.texto).join(" \n ");
  const proxima = perguntasPara(sobre, ditos).find((p) => !feitas.includes(p));
  const nVoce = conversa.mensagens.filter((m) => m.de === "voce").length;
  let texto = OBRIGADA[(nVoce - 1) % OBRIGADA.length];
  if (!conversa.avisou) texto += " O que você conta fica só nesta conversa: nada muda nas suas memórias sem você decidir.";
  texto += proxima ? ` ${proxima}` : " Já fiz todas as perguntas que eu tinha. Pode continuar contando, ou me perguntar algo sobre o seu acervo.";
  return { texto, fontes: [], estado: { avisou: true, perguntadas: proxima ? [...feitas, proxima] : feitas } };
}

/**
 * A resposta da IA (aqui, local e fundamentada no acervo).
 * Entrada: a conversa (com a última mensagem da pessoa), a memória do assunto e o acervo.
 * Saída: { texto, fontes: [ids de memória], estado: o que muda na conversa (perguntas já feitas...) }.
 */
export async function responder({ conversa, sobre, itens }) {
  const ultima = [...conversa.mensagens].reverse().find((m) => m.de === "voce");
  if (!ultima) return { texto: "", fontes: [] };
  // a IA acabou de perguntar: o que vem é resposta (a não ser que termine com "?")
  const antes = conversa.mensagens[conversa.mensagens.lastIndexOf(ultima) - 1];
  const respondendo = antes?.de === "ia" && /\?\s*$/.test(antes.texto) && !/\?\s*$/.test(ultima.texto);
  if (!respondendo && ehPergunta(ultima.texto)) return responderPergunta(ultima.texto, sobre, itens);
  return continuarContando(conversa, sobre);
}

/** Primeira mensagem de cada conversa. */
export function abertura(sobre, perguntaDoDia, nome) {
  if (sobre && perguntaDoDia) {
    return { texto: `Vamos conversar sobre “${sobre.titulo}”${sobre.quando ? `, ${noMeio(sobre.quando)}` : ""}. ${perguntaDoDia}`, fontes: [sobre.id], estado: { perguntadas: [perguntaDoDia] } };
  }
  if (sobre) {
    return {
      texto: `Vamos conversar sobre “${sobre.titulo}”${sobre.campos.artista ? `, de ${sobre.campos.artista}` : ""}${sobre.quando ? `, ${noMeio(sobre.quando)}` : ""}.${fraseStatus(sobre)} Você pode me contar o que lembra, ou perguntar o que está guardado sobre ${SOBRE[sobre.tipo] || "esta memória"}.`,
      fontes: [sobre.id], estado: { perguntadas: [] },
    };
  }
  return {
    texto: `Oi, ${nome}! Eu respondo perguntas sobre o que está guardado no seu acervo, sempre mostrando de onde tirei, e ajudo você a contar uma lembrança. Experimente perguntar: “Quais receitas eu guardei?” ou “O que está esperando minha confirmação?”`,
    fontes: [], estado: { perguntadas: [] },
  };
}

// ---- guardar a conversa neste navegador (uma por memória, e uma geral) ----
const CHAVE = "mv-conversas-v1";
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; } };

export const lerConversa = (chave) => ler()[chave] || null;

/** Devolve false quando o navegador não deixou guardar. */
export function salvarConversa(chave, c) {
  const todas = ler();
  if (c) todas[chave] = c; else delete todas[chave];
  try { localStorage.setItem(CHAVE, JSON.stringify(todas)); return true; } catch { return false; }
}
