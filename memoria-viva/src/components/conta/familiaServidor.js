// Família da conta com login, guardada no SERVIDOR (pessoas e laços).
// A tela continua trabalhando com a família inteira ({ pessoas, lacos }); aqui ela é comparada com a
// última versão confirmada pelo servidor e só as diferenças viram chamadas à API
// (adicionar, mudar ou tirar pessoa; criar ou desfazer laço).
//
// Ids na tela: pessoa do servidor = "p<número>"; a dona = EU (o "você" de sempre); laço = "l<número>".
// Pessoa criada agora na tela ainda tem id "pes-…" até o servidor responder; depois, idAtual() traduz.
// Fica só neste navegador (por conta): foto do familiar, "outras informações" e o que a tela marca para
// compartilhar (isso depende de decisões do grupo e do envio de arquivos).
import { api } from "../../api.js";
import { CONTA, sessao } from "../../dados/conta.js";
import { modoData } from "./guardados.js";

const EU = CONTA.pessoa.id;
const SO_AQUI = ["foto", "fotoArq", "outras", "compartilhado"];

let confirmada = null; // a família como o servidor tem agora (formato da tela)
let idDona = null; // id da dona no servidor
const novosIds = new Map(); // "pes-…" → "p<número>"
let fila = Promise.resolve(); // uma gravação por vez, na ordem em que aconteceram

/** Id que a tela deve usar agora (o de uma pessoa recém-criada muda quando o servidor responde). */
export const idAtual = (id) => novosIds.get(id) || id;

const numero = (idTela) => (idTela === EU ? idDona : Number(String(idAtual(idTela)).slice(1)));
const texto = (v) => (v == null ? "" : String(v));

// ---------- servidor → tela ----------

function dataDaApi(d) {
  if (!d) return null;
  return { modo: d.modo, dia: texto(d.dia), mes: texto(d.mes), ano: texto(d.ano), anoFim: texto(d.anoFim), decada: texto(d.decada), aprox: Boolean(d.aprox), naoSei: d.modo === "naosei" };
}

/** Abre a família da conta. `local` = a cópia deste navegador (de onde vêm as fotos e o que só fica aqui). */
export async function carregarDoServidor(local) {
  const a = await api(`/familias/${sessao.idFamilia}/arvore`);
  const daqui = new Map((local?.pessoas || []).map((p) => [p.id, p]));
  idDona = a.pessoas.find((p) => p.voce)?.id ?? null;
  const idDe = (n) => (n === idDona ? EU : `p${n}`);
  const pessoas = a.pessoas.filter((p) => !p.voce).map((p) => {
    const id = idDe(p.id);
    const aqui = daqui.get(id) || {};
    return {
      id, nome: texto(p.nome), nomeCompleto: texto(p.nomeCompleto), genero: p.genero || "",
      nascimento: dataDaApi(p.nascimento), falecimento: dataDaApi(p.falecimento), faleceu: p.faleceu,
      origem: texto(p.origem), bio: texto(p.bio), cor: p.cor || "linho", removida: p.removida, criadaEm: p.criadaEm,
      conta: { estado: p.temConta ? "vinculada" : "sem-conta", contaId: null },
      outras: "", compartilhado: [],
      ...Object.fromEntries(SO_AQUI.filter((k) => aqui[k] !== undefined).map((k) => [k, aqui[k]])),
    };
  });
  const lacos = a.lacos.map((l) => ({
    id: `l${l.id}`, tipo: l.tipo, de: idDe(l.de), para: idDe(l.para), modo: l.modo || "", rotulo: texto(l.rotulo), rotuloVolta: texto(l.rotuloVolta),
  }));
  confirmada = { pessoas, lacos };
  return { pessoas, lacos, versao: local?.versao || 2 };
}

// ---------- tela → servidor ----------

function dataParaServidor(d) {
  const modo = d && modoData(d);
  if (!modo) return null;
  return { modo, dia: d.dia, mes: d.mes, ano: d.ano, anoFim: d.anoFim, decada: d.decada, aprox: Boolean(d.aprox) };
}

const corpo = (p) => ({
  nome: p.nome || "", nomeCompleto: p.nomeCompleto || "", genero: p.genero || "",
  nascimento: dataParaServidor(p.nascimento), falecimento: dataParaServidor(p.falecimento), faleceu: Boolean(p.faleceu),
  origem: p.origem || "", bio: p.bio || "", cor: p.cor || null,
});
const chaveLaco = (l) => [numero(l.de), numero(l.para), l.tipo, l.modo || "", l.rotulo || "", l.rotuloVolta || ""].join("|");
const ignorar404 = (e) => { if (e?.status !== 404) throw e; }; // já não existia (ex.: saiu junto com a pessoa)

async function gravar(f) {
  if (!confirmada) throw new Error("A família ainda não foi aberta do servidor.");
  const antes = new Map(confirmada.pessoas.map((p) => [p.id, p]));

  // 1. pessoas: novas, mudadas e tiradas da árvore
  for (const p of f.pessoas) {
    const id = idAtual(p.id);
    const velha = antes.get(id);
    if (!velha) {
      if (p.removida) continue; // criada e tirada antes de chegar ao servidor
      const r = await api(`/familias/${sessao.idFamilia}/pessoas`, { corpo: corpo(p) });
      novosIds.set(p.id, `p${r.id}`);
    } else if (p.removida && !velha.removida) {
      await api(`/pessoas/${numero(id)}`, { metodo: "DELETE" }).catch(ignorar404);
    } else if (!p.removida && JSON.stringify(corpo(p)) !== JSON.stringify(corpo(velha))) {
      await api(`/pessoas/${numero(id)}`, { metodo: "PATCH", corpo: corpo(p) });
    }
  }
  const pessoas = f.pessoas.map((p) => ({ ...p, id: idAtual(p.id) }));

  // 2. laços: desfaz os que sumiram, cria os novos (criar substitui o que houver entre as duas pessoas)
  const agora = new Set(f.lacos.map(chaveLaco));
  for (const l of confirmada.lacos) {
    if (!agora.has(chaveLaco(l))) await api(`/lacos/${l.id.slice(1)}`, { metodo: "DELETE" }).catch(ignorar404);
  }
  const jaTinha = new Map(confirmada.lacos.map((l) => [chaveLaco(l), l]));
  const lacos = [];
  for (const l of f.lacos) {
    const igual = jaTinha.get(chaveLaco(l));
    if (igual) { lacos.push({ ...l, id: igual.id, de: idAtual(l.de), para: idAtual(l.para) }); continue; }
    const r = await api(`/familias/${sessao.idFamilia}/lacos`, {
      corpo: { tipo: l.tipo, de: numero(l.de), para: numero(l.para), modo: l.modo || "", rotulo: l.rotulo || "", rotuloVolta: l.rotuloVolta || "" },
    });
    lacos.push({ ...l, id: `l${r.id}`, de: idAtual(l.de), para: idAtual(l.para) });
  }

  confirmada = { pessoas, lacos };
  return { ...f, pessoas, lacos };
}

/**
 * Guarda a família no servidor e devolve a família com os ids definitivos.
 * As gravações entram numa fila: uma termina antes de a próxima começar.
 */
export function salvarNoServidor(f) {
  const vez = fila.then(() => gravar(f)).catch(async (erro) => {
    // falhou no meio: parte pode ter sido gravada. Relê do servidor (a versão verdadeira) para a tela
    // mostrar o que ficou e a próxima gravação não repetir nada.
    erro.familia = await carregarDoServidor(f).catch(() => null);
    throw erro;
  });
  fila = vez.catch(() => {});
  return vez;
}
