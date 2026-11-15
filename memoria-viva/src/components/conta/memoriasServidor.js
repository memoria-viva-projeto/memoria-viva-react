// Memórias guardadas no SERVIDOR (só na conta com login).
// Hoje vão ao servidor só receita e música: não têm arquivos. Foto, álbum e vídeo continuam no navegador
// até o servidor receber arquivos.
//
// As telas usam o mesmo formato das memórias do navegador. Uma memória do servidor tem
// id "srv-<número>" e o campo "servidor" com o número dela no banco.
import { api } from "../../api.js";
import { CONTA, pessoa, sessao } from "../../dados/conta.js";
import { dataVazia, modoData } from "./guardados.js";
import { pessoasDe } from "./pessoas.jsx";
import { listaDeIngredientes } from "./EditorReceita.jsx";
import { capaDoYoutube, youtubeDe } from "./youtube.jsx";

const TIPOS_NO_SERVIDOR = ["receita", "musica"];

/** Esta memória nova vai para o servidor? (conta com login + tipo sem arquivos) */
export const vaiAoServidor = (tipo) => Boolean(sessao.idUsuario && sessao.idFamilia) && TIPOS_NO_SERVIDOR.includes(tipo);

// ---------- tela → servidor ----------

const nomeDe = (id) => (id === CONTA.pessoa.id ? CONTA.pessoa.nome : pessoa(id).nome);

function dataParaServidor(d) {
  const modo = modoData(d);
  if (!modo) return null;
  return { modo, dia: d.dia, mes: d.mes, ano: d.ano, anoFim: d.anoFim, decada: d.decada, aprox: Boolean(d.aprox) };
}

function detalhesParaServidor(m) {
  const x = m.extra || {};
  if (m.tipo === "receita") {
    return { quemFazia: x.quem, ocasioes: x.ocasioes, preparo: x.preparo, segredos: x.segredos, ingredientes: listaDeIngredientes(x.ingredientes) };
  }
  const yt = youtubeDe(m);
  return {
    artista: x.artista, porque: x.porque, lembranca: x.lembranca, quemOuvia: x.quemOuvia, momento: x.momento,
    youtube: yt ? { id: yt, titulo: x.youtube?.titulo || null, canal: x.youtube?.canal || null } : null,
  };
}

/** Guarda a memória no acervo da conta e devolve como as telas usam. */
export async function guardarNoServidor(m) {
  const r = await api(`/familias/${sessao.idFamilia}/memorias`, {
    corpo: {
      tipo: m.tipo,
      titulo: m.titulo,
      descricao: m.descricao,
      data: dataParaServidor(m.data || {}),
      lugar: m.lugar,
      etiquetas: m.etiquetas || [],
      pessoas: pessoasDe(m).map(nomeDe).filter(Boolean), // por enquanto vão os nomes (a família fica no navegador)
      status: "confirmada",
      detalhes: detalhesParaServidor(m),
    },
  });
  return daApi(r);
}

export const apagarNoServidor = (m) => api(`/memorias/${m.servidor}`, { metodo: "DELETE" });

// ---------- servidor → tela ----------

const texto = (v) => (v == null ? "" : String(v));

function dataDaApi(d) {
  if (!d) return dataVazia();
  return { modo: d.modo, dia: texto(d.dia), mes: texto(d.mes), ano: texto(d.ano), anoFim: texto(d.anoFim), decada: texto(d.decada), aprox: Boolean(d.aprox), naoSei: d.modo === "naosei" };
}

function extraDaApi(r) {
  const d = r.detalhes || {};
  if (r.tipo === "receita") {
    return { quem: texto(d.quemFazia), ocasioes: texto(d.ocasioes), preparo: texto(d.preparo), segredos: texto(d.segredos), ingredientes: d.ingredientes || [] };
  }
  const yt = d.youtube;
  return {
    artista: texto(d.artista), porque: texto(d.porque), lembranca: texto(d.lembranca), quemOuvia: texto(d.quemOuvia), momento: texto(d.momento),
    youtube: yt ? { id: yt.id, titulo: texto(yt.titulo), canal: texto(yt.canal), capa: capaDoYoutube(yt.id) } : null,
    semLink: !yt,
  };
}

function daApi(r) {
  return {
    id: `srv-${r.id}`,
    servidor: r.id,
    tipo: r.tipo,
    titulo: texto(r.titulo),
    descricao: texto(r.descricao),
    data: dataDaApi(r.data),
    lugar: texto(r.lugar),
    etiquetas: r.etiquetas || [],
    pessoas: r.pessoas || [],
    itens: [],
    capa: null,
    extra: extraDaApi(r),
    criadaEm: r.criadaEm,
    atualizadaEm: r.atualizadaEm || r.criadaEm,
    origem: { tipo: "maria" }, // contada pela dona da conta (o nome "maria" é o id interno de "você")
    status: r.status,
  };
}

/** Todas as memórias da conta no servidor (receitas e músicas), no formato das telas. */
export async function carregarDoServidor() {
  if (!sessao.idFamilia) return [];
  const ids = [];
  let antesDe = null;
  do {
    const pagina = await api(`/familias/${sessao.idFamilia}/memorias?limite=100${antesDe ? `&antesDe=${antesDe}` : ""}`);
    ids.push(...pagina.memorias.filter((m) => TIPOS_NO_SERVIDOR.includes(m.tipo)).map((m) => m.id));
    antesDe = pagina.proxima;
  } while (antesDe);
  const completas = await Promise.all(ids.map((id) => api(`/memorias/${id}`)));
  return completas.map(daApi);
}
