// Regras das memórias: criar, listar e abrir.
// Quem pode o quê está em dados/memorias.js (REGRA DE ACESSO): por enquanto, só a dona do acervo.
import { emTransacao } from "../db.js";
import { naoEncontrado } from "../erros.js";
import * as memorias from "../dados/memorias.js";

const familiaNaoEncontrada = () => naoEncontrado("Não encontramos esta família na sua conta.");
const memoriaNaoEncontrada = () => naoEncontrado("Não encontramos esta memória.");

export async function criar(pool, { idUsuario, idFamilia, dados }) {
  const idMemoria = await emTransacao(pool, async (conn) => {
    // a checagem vai dentro da transação: se a conta deixar de ser dona no meio, nada é gravado
    const idPessoa = await memorias.idDonaDaFamilia(conn, { idFamilia, idUsuario });
    if (!idPessoa) throw familiaNaoEncontrada();

    const idData = dados.data ? await memorias.criarData(conn, dados.data) : null;
    const id = await memorias.criarMemoria(conn, {
      idFamilia,
      tipo: dados.tipo,
      titulo: dados.titulo,
      descricao: dados.descricao,
      idData,
      lugar: dados.lugar,
      enviadaPor: idPessoa, // nesta etapa quem envia é sempre a própria dona
      status: dados.status,
    });
    await memorias.criarEtiquetas(conn, id, dados.etiquetas);
    await memorias.criarPessoas(conn, id, dados.pessoas);
    if (dados.detalhes) await memorias.criarDetalhes(conn, id, dados.tipo, dados.detalhes);
    return id;
  });
  return abrir(pool, { idUsuario, idMemoria });
}

export async function listar(pool, { idUsuario, idFamilia, limite, antesDe }) {
  if (!(await memorias.idDonaDaFamilia(pool, { idFamilia, idUsuario }))) throw familiaNaoEncontrada();
  const linhas = await memorias.listarDaFamilia(pool, { idFamilia, limite, antesDe });
  const temMais = linhas.length > limite;
  const pagina = linhas.slice(0, limite);
  return {
    memorias: pagina.map((m) => ({
      id: m.id_memoria,
      tipo: m.tipo,
      titulo: m.titulo,
      data: dataDe(m),
      lugar: m.lugar,
      status: m.status,
      criadaEm: m.criada_em,
    })),
    // para pedir a próxima página: ?antesDe=<este número>
    proxima: temMais ? pagina[pagina.length - 1].id_memoria : null,
  };
}

export async function abrir(pool, { idUsuario, idMemoria }) {
  const m = await memorias.buscarSeDona(pool, { idMemoria, idUsuario });
  if (!m) throw memoriaNaoEncontrada();
  return {
    id: m.id_memoria,
    idFamilia: m.id_familia,
    tipo: m.tipo,
    titulo: m.titulo,
    descricao: m.descricao,
    data: dataDe(m),
    lugar: m.lugar,
    status: m.status,
    etiquetas: await memorias.etiquetas(pool, m.id_memoria),
    pessoas: await memorias.pessoas(pool, m.id_memoria),
    enviadaPor: { idPessoa: m.autor_id, nome: m.autor_nome ?? m.autor_nome_completo },
    criadaEm: m.criada_em,
    confirmadaEm: m.confirmada_em,
    atualizadaEm: m.atualizada_em,
    detalhes: await memorias.detalhes(pool, { idMemoria: m.id_memoria, tipo: m.tipo }),
  };
}

/** Apaga uma memória do acervo. Só a dona; para os outros é como se ela não existisse (404). */
export async function apagar(pool, { idUsuario, idMemoria }) {
  await emTransacao(pool, async (conn) => {
    // a checagem vai dentro da transação, junto com o apagar
    if (!(await memorias.buscarSeDona(conn, { idMemoria, idUsuario }))) throw memoriaNaoEncontrada();
    await memorias.apagarMemoria(conn, idMemoria);
  });
}

/** data_flexivel do banco → o formato da tela ({ modo, dia, mes, ano, anoFim, decada, aprox }). */
function dataDe(l) {
  if (!l.modo) return null;
  const decada = l.modo === "decada";
  return {
    modo: l.modo,
    dia: l.dia,
    mes: l.mes,
    ano: decada ? null : l.ano,
    anoFim: l.ano_fim,
    decada: decada ? l.ano : null,
    aprox: Boolean(l.aprox),
  };
}
