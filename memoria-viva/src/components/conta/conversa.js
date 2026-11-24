// Conversar · respostas de DEMONSTRAÇÃO, montadas só com o que está no acervo.
// Nada aqui inventa relato, salva, muda ou confirma memória: só lê.
// Para a IA de verdade, troque o miolo de `responder` por uma chamada ao servidor,
// mantendo a mesma entrada e a mesma saída: { texto, fontes, estado }.

import { CONTA, pessoa } from "../../dados/conta.js";
import { capaDe, textoQuando, tituloDe } from "./guardados.js";
import { pessoasDe } from "./pessoas.jsx";
import { ROTAS } from "./rotas.jsx";

/** "Conversar sobre esta foto", "... este álbum"... */
export const SOBRE = { foto: "esta foto", album: "este álbum" };

// ---- o acervo num formato só (memórias da demonstração + as guardadas neste aparelho) ----

export function montarAcervo(memorias, guardadas) {
  const demo = memorias.map((m) => ({
    id: m.id, titulo: m.titulo, tipo: m.tipo, quando: m.quando || "", ano: m.ano || null, lugar: m.lugar || "",
    pessoas: m.pessoas || [], historia: m.texto || "",
    busca: [m.texto, m.legenda].filter(Boolean).join(" "),
    status: m.status, enviadaPor: m.origem.tipo === "familia" ? m.origem.por : null,
    sugestao: m.status === "aguardando" ? m.sugestaoIA : null,
    foto: m.foto, alt: m.alt, para: `${ROTAS.historia}#mem-${m.id}`,
  }));
  const minhas = guardadas.map((m) => ({
    id: m.id, titulo: tituloDe(m), tipo: m.tipo, quando: textoQuando(m), ano: Number(m.data?.ano) || null, lugar: m.lugar || "",
    pessoas: pessoasDe(m), historia: m.descricao || "",
    busca: [m.descricao].filter(Boolean).join(" "),
    status: "confirmada", guardada: true, enviadaPor: null, sugestao: null,
    arq: capaDe(m), para: `${ROTAS.memoria}/${m.id}`,
  }));
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
  return {
    quem: /\bquem\b|pessoas|aparece|estava|estavam|marcad/.test(q),
    quando: /\bquando\b|\bano\b|\bdata\b|\bdecada\b|\bepoca\b|\bidade\b/.test(q),
    onde: /\bonde\b|\blugar\b|\bcidade\b/.test(q),
    historia: /historia|aconteceu|\bconta\b|\bconte\b|contou|lembra/.test(q),
    quemEnviou: /enviou|mandou|quem (guardou|postou)/.test(q),
  };
}

const TIPO_PALAVRAS = [["album", /album/]];

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

function sobreUma(m, a) {
  const partes = [];
  if (a.quem) {
    partes.push(m.pessoas.length ? `Em “${m.titulo}”, ${m.pessoas.length > 1 ? "aparecem" : "aparece"} ${nomes(m.pessoas)}.`
      : `Ainda não marcaram ninguém em “${m.titulo}”. Se você lembra quem estava, pode me contar.`);
  }
  if (a.quando) {
    if (m.sugestao?.campo === "data") partes.push(`A data “${noMeio(m.quando)}” é um palpite da IA, ainda sem a sua confirmação. O palpite foi: “${m.sugestao.texto}”`);
    else partes.push(m.quando ? `“${m.titulo}” é de ${noMeio(m.quando)}.` : `Não está guardado quando foi “${m.titulo}”.`);
  }
  if (a.onde) partes.push(m.lugar ? `Foi em ${m.lugar}.` : `Não está guardado onde foi “${m.titulo}”.`);
  if (a.historia) partes.push(m.historia ? `O que está guardado: “${m.historia}”` : `Ninguém contou a história de “${m.titulo}” ainda. Se quiser, me conte o que você lembra.`);
  if (a.quemEnviou) partes.push(m.enviadaPor ? `Quem enviou foi ${pessoa(m.enviadaPor).nome}.` : "Foi você que guardou.");
  if (!partes.length) {
    partes.push(`${linha(m).replace(" (esperando sua confirmação)", "")}.`);
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
  if (/\bquant[oa]s\b/.test(q) && /memoria|lembranca|foto|album/.test(q)) {
    const tipo = TIPO_PALAVRAS.find(([, re]) => re.test(q))?.[0] || (/\bfotos?\b/.test(q) ? "foto" : null);
    const conta = tipo ? itens.filter((m) => m.tipo === tipo) : itens;
    const espera = conta.filter((m) => m.status === "aguardando").length;
    const n = conta.length;
    const nome = { foto: ["foto", "fotos"], album: ["álbum", "álbuns"] }[tipo] || ["lembrança", "lembranças"];
    if (!n) return { texto: `Não há nenhuma ${nome[0] === "álbum" ? "memória desse tipo" : nome[0]} no seu acervo ainda.`, fontes: [] };
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

/** Perguntas que fazem sentido para esta memória: sem repetir o que já está guardado (lugar, quem estava). */
export function perguntasPara(sobre) {
  if (!sobre) return GERAIS;
  return [...CONTA.perguntas, "Tem mais alguma coisa desse dia que você quer que a família saiba?"].filter((p) => {
    if (sobre.lugar && /^Onde/.test(p)) return false;
    if (sobre.pessoas.length && /^Quem estava/.test(p)) return false;
    return true;
  });
}

function continuarContando(conversa, sobre) {
  const feitas = conversa.perguntadas || [];
  const proxima = perguntasPara(sobre).find((p) => !feitas.includes(p));
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
      texto: `Vamos conversar sobre “${sobre.titulo}”${sobre.quando ? `, ${noMeio(sobre.quando)}` : ""}.${fraseStatus(sobre)} Você pode me contar o que lembra, ou perguntar o que está guardado sobre ${SOBRE[sobre.tipo] || "esta memória"}.`,
      fontes: [sobre.id], estado: { perguntadas: [] },
    };
  }
  return {
    texto: `Oi, ${nome}! Eu respondo perguntas sobre o que está guardado no seu acervo, sempre mostrando de onde tirei, e ajudo você a contar uma lembrança. Experimente perguntar: “Quantas fotos eu tenho?” ou “O que está esperando minha confirmação?”`,
    fontes: [], estado: { perguntadas: [] },
  };
}

// ---- guardar a conversa neste navegador (uma por memória, e uma geral) ----
const CHAVE = "mv-conversas-v1";
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { return {}; } };

export const lerConversa = (chave) => ler()[chave] || null;

/** Todas as conversas guardadas neste navegador, a mais recente primeiro. */
export const listarConversas = () =>
  Object.entries(ler()).filter(([, c]) => c?.mensagens?.length)
    .map(([chave, c]) => ({ ...c, chave }))
    .sort((a, b) => (b.atualizada || 0) - (a.atualizada || 0));

/** Atalhos de pergunta (o que a pessoa pode perguntar à IA com um toque). */
export function atalhosPara(sobre) {
  if (!sobre) return ["O que está esperando minha confirmação?", "Quantas fotos eu tenho?", "Quantos álbuns eu tenho?"];
  return ["Quem aparece aqui?", "Quando foi isso?", "Onde foi?", "Qual é a história?"];
}

/** Devolve false quando o navegador não deixou guardar. */
export function salvarConversa(chave, c) {
  const todas = ler();
  if (c) todas[chave] = c; else delete todas[chave];
  try { localStorage.setItem(CHAVE, JSON.stringify(todas)); return true; } catch { return false; }
}
