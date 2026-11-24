// Memórias guardadas no SERVIDOR (só na conta com login): fotos e álbuns.
//
// As telas usam o mesmo formato das memórias do navegador. Uma memória do servidor tem id "srv-<número>" e o campo
// "servidor" com o número dela no banco. Os arquivos dela têm id "srv-arq-<número>" (ver guardados.js): a tela os
// mostra pelo endereço protegido /api/arquivos/<número>.
//
// Guardar com fotos novas: enquanto a pessoa edita, as fotos ficam no rascunho DESTE navegador. Ao guardar,
// subirArquivos() envia uma por uma (com o andamento) e só depois a memória é gravada apontando para elas.
// Se algo falhar no meio, o que já subiu é descartado e o rascunho continua inteiro para tentar de novo.
import { api, enviarArquivo } from "../../api.js";
import { CONTA, pessoa, sessao } from "../../dados/conta.js";
import { dataVazia, ehDoServidor, lembrarDoServidor, lerArquivo, modoData, numeroNoServidor } from "./guardados.js";

const TIPOS_NO_SERVIDOR = ["foto", "album"];

/** Os mesmos limites do servidor (conferir antes evita esperar um envio que vai ser recusado). */
const MB = 1024 * 1024;
export const LIMITES = { foto: 20 * MB, miniatura: 2 * MB };

/** Esta memória nova vai para o servidor? (conta com login) */
export const vaiAoServidor = (tipo) => Boolean(sessao.idUsuario && sessao.idFamilia) && TIPOS_NO_SERVIDOR.includes(tipo);

// ---------- tela → servidor ----------

const nomeDe = (id) => (id === CONTA.pessoa.id ? CONTA.pessoa.nome : pessoa(id)?.nome || id);

function dataParaServidor(d) {
  const modo = modoData(d);
  if (!modo) return null;
  return { modo, dia: d.dia, mes: d.mes, ano: d.ano, anoFim: d.anoFim, decada: d.decada, aprox: Boolean(d.aprox) };
}

const itemParaServidor = (it) => ({
  idArquivo: numeroNoServidor(it.arq),
  tipo: it.tipo,
  anexo: Boolean(it.anexo),
  legenda: it.legenda || null,
  data: it.data ? dataParaServidor(it.data) : null,
  lugar: it.lugar || null,
  observacao: it.observacao || null,
  etiquetas: it.etiquetas || [],
  marcas: (it.marcas || []).map((k) => ({ nome: nomeDe(k.p), x: k.x ?? null, y: k.y ?? null })).filter((k) => k.nome),
});

/** A memória no formato da API. Só depois de subirArquivos (todos os arquivos já são do servidor). */
function corpoDa(m) {
  const corpo = {
    tipo: m.tipo,
    titulo: m.titulo,
    descricao: m.descricao,
    data: dataParaServidor(m.data || {}),
    lugar: m.lugar,
    etiquetas: m.etiquetas || [],
    pessoas: (m.pessoas || []).map(nomeDe).filter(Boolean), // por enquanto, os nomes (ligar às pessoas da árvore é a tarefa A3)
    status: "confirmada",
    itens: (m.itens || []).filter((it) => ehDoServidor(it.arq)).map(itemParaServidor),
    capa: m.capa && ehDoServidor(m.capa) ? numeroNoServidor(m.capa) : null,
  };
  if (m.versao) corpo.versao = m.versao; // edição: o servidor recusa se outra pessoa mudou depois que esta tela abriu
  return corpo;
}

/**
 * Envia para o servidor os arquivos da memória que ainda estão só neste navegador.
 * onProgresso({ feitos, total, fracao }) a cada pedaço. Devolve a memória com os arquivos trocados pelos do servidor.
 * Falhou: descarta no servidor o que já tinha subido e lança o erro (o rascunho do navegador continua igual).
 */
export async function subirArquivos(m, onProgresso = () => {}) {
  const locais = [...new Set((m.itens || []).map((it) => it.arq).filter((id) => id && !ehDoServidor(id)))];
  if (!locais.length) return m;
  const arquivos = [];
  for (const id of locais) {
    const a = await lerArquivo(id);
    if (!a?.blob) throw new Error("Uma das fotos não está mais neste aparelho. Tire ela da memória e escolha de novo.");
    const limite = LIMITES[a.tipo];
    if (!limite) throw new Error("Só fotos podem ir para a memória. Tire o arquivo diferente e tente de novo.");
    if (a.blob.size > limite) {
      throw new Error(`Uma foto passa de ${limite / MB} MB, o limite por arquivo. Escolha um menor.`);
    }
    arquivos.push(a);
  }
  const total = arquivos.reduce((s, a) => s + a.blob.size + (a.mini?.size || 0), 0) || 1;
  let antes = 0;
  const trocas = new Map();
  try {
    for (const [k, a] of arquivos.entries()) {
      const q = new URLSearchParams({ tipo: a.tipo });
      if (a.largura) q.set("largura", Math.round(a.largura));
      if (a.altura) q.set("altura", Math.round(a.altura));
      if (a.nome) q.set("nome", String(a.nome).slice(0, 255));
      const avisar = (enviados) => onProgresso({ feitos: k, total: arquivos.length, fracao: Math.min(1, (antes + enviados) / total) });
      avisar(0);
      let r = await enviarArquivo(`/familias/${sessao.idFamilia}/arquivos?${q}`, a.blob, { onProgresso: avisar });
      trocas.set(a.id, r.id);
      antes += a.blob.size;
      if (a.mini && a.mini.size <= LIMITES.miniatura) {
        r = await enviarArquivo(`/arquivos/${r.id}/miniatura`, a.mini, { metodo: "PUT", onProgresso: avisar });
        antes += a.mini.size;
      }
      lembrarDoServidor(`srv-arq-${r.id}`, r);
    }
  } catch (e) {
    // o que subiu e não vai ser usado: descarta agora (se não der, a faxina do servidor apaga em 24 h)
    for (const n of trocas.values()) api(`/arquivos/${n}`, { metodo: "DELETE" }).catch(() => {});
    throw e;
  }
  onProgresso({ feitos: arquivos.length, total: arquivos.length, fracao: 1 });
  const novo = (id) => (trocas.has(id) ? `srv-arq-${trocas.get(id)}` : id);
  return { ...m, capa: m.capa ? novo(m.capa) : m.capa, itens: m.itens.map((it) => ({ ...it, arq: novo(it.arq) })) };
}

/** Guarda a memória no acervo da conta e devolve como as telas usam. */
export async function guardarNoServidor(m) {
  return daApi(await api(`/familias/${sessao.idFamilia}/memorias`, { corpo: corpoDa(m) }));
}

/** Edita uma memória do servidor (a memória inteira substitui a anterior). */
export async function atualizarNoServidor(m) {
  return daApi(await api(`/memorias/${m.servidor}`, { metodo: "PUT", corpo: corpoDa(m) }));
}

export const apagarNoServidor = (m) => api(`/memorias/${m.servidor}`, { metodo: "DELETE" });

// ---------- servidor → tela ----------

const texto = (v) => (v == null ? "" : String(v));

function dataDaApi(d) {
  if (!d) return dataVazia();
  return { modo: d.modo, dia: texto(d.dia), mes: texto(d.mes), ano: texto(d.ano), anoFim: texto(d.anoFim), decada: texto(d.decada), aprox: Boolean(d.aprox), naoSei: d.modo === "naosei" };
}

function itemDaApi(it) {
  const arq = `srv-arq-${it.idArquivo}`;
  // o servidor conta o que sabe do arquivo (null = sumiu do armazenamento: a tela mostra "indisponível")
  lembrarDoServidor(arq, { tipo: it.tipo, ...(it.arquivo || { indisponivel: true }) });
  return {
    arq,
    tipo: it.tipo,
    ...(it.anexo ? { anexo: true } : {}),
    legenda: texto(it.legenda),
    data: it.data ? dataDaApi(it.data) : null,
    lugar: texto(it.lugar),
    observacao: texto(it.observacao),
    etiquetas: it.etiquetas || [],
    marcas: (it.marcas || []).map((k) => ({ p: k.nome, x: k.x, y: k.y })),
  };
}

export function daApi(r) {
  return {
    id: `srv-${r.id}`,
    servidor: r.id,
    versao: r.versao,
    tipo: r.tipo,
    titulo: texto(r.titulo),
    descricao: texto(r.descricao),
    data: dataDaApi(r.data),
    lugar: texto(r.lugar),
    etiquetas: r.etiquetas || [],
    pessoas: r.pessoas || [],
    itens: (r.itens || []).map(itemDaApi),
    capa: r.capa ? `srv-arq-${r.capa}` : null,
    extra: {},
    criadaEm: r.criadaEm,
    atualizadaEm: r.atualizadaEm || r.criadaEm,
    origem: { tipo: "maria" }, // contada pela dona da conta (o nome "maria" é o id interno de "você")
    autor: texto(r.enviadaPor?.nome), // quem guardou (aparece para quem vê a família de outra pessoa)
    status: r.status,
  };
}

/**
 * Todas as memórias de um acervo no servidor, no formato das telas.
 * Sem idFamilia: o acervo da própria conta. Com idFamilia: uma família em que ela entrou pelo código.
 */
export async function carregarDoServidor(idFamilia = sessao.idFamilia) {
  if (!idFamilia) return [];
  // a lista já traz cada memória completa: uma chamada a cada 100 memórias
  const todas = [];
  let antesDe = null;
  do {
    const pagina = await api(`/familias/${idFamilia}/memorias?limite=100${antesDe ? `&antesDe=${antesDe}` : ""}`);
    todas.push(...pagina.memorias.filter((m) => TIPOS_NO_SERVIDOR.includes(m.tipo)));
    antesDe = pagina.proxima;
  } while (antesDe);
  return todas.map(daApi);
}

/**
 * Uma página da linha da vida (memórias confirmadas, na ordem de quando aconteceram).
 * filtros: { tipo, ano, decada, de, ate, etiqueta, pessoa }. Devolve { memorias, total, proxima }.
 */
export async function carregarLinha({ idFamilia = sessao.idFamilia, depois = null, limite = 30, filtros = {} } = {}) {
  const q = new URLSearchParams({ limite: String(limite) });
  if (depois) q.set("depois", depois);
  for (const [k, v] of Object.entries(filtros)) {
    for (const um of [].concat(v)) if (um !== "" && um != null) q.append(k, String(um)); // listas: ?etiqueta=a&etiqueta=b
  }
  const r = await api(`/familias/${idFamilia}/linha?${q}`);
  return { ...r, memorias: r.memorias.map((m) => ({ ...daApi(m), semData: m.semData, anoNaLinha: m.anoNaLinha })) };
}
