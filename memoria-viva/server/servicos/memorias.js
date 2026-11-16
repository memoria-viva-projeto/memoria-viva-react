// Regras das memórias: criar, listar e abrir.
// Quem pode o quê está em dados/memorias.js (REGRA DE ACESSO): por enquanto, só a dona do acervo.
import { emTransacao } from "../db.js";
import { ErroApi, naoEncontrado } from "../erros.js";
import * as memorias from "../dados/memorias.js";
import { dataDe } from "./datas.js";

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
    memorias: await completas(pool, pagina), // cada memória já vem inteira: a tela não precisa abrir uma por uma
    // para pedir a próxima página: ?antesDe=<este número>
    proxima: temMais ? pagina[pagina.length - 1].id_memoria : null,
  };
}

export async function abrir(pool, { idUsuario, idMemoria }) {
  const m = await memorias.buscarSeDona(pool, { idMemoria, idUsuario });
  if (!m) throw memoriaNaoEncontrada();
  return (await completas(pool, [m]))[0];
}

/** Linhas do banco → memórias no formato da API (mesmo formato no abrir e no listar). */
async function completas(db, linhas) {
  const extra = await memorias.complementos(db, linhas);
  return linhas.map((m) => ({
    id: m.id_memoria,
    idFamilia: m.id_familia,
    tipo: m.tipo,
    titulo: m.titulo,
    descricao: m.descricao,
    data: dataDe(m),
    lugar: m.lugar,
    status: m.status,
    etiquetas: extra.get(m.id_memoria).etiquetas,
    pessoas: extra.get(m.id_memoria).pessoas,
    enviadaPor: { idPessoa: m.autor_id, nome: m.autor_nome ?? m.autor_nome_completo },
    criadaEm: m.criada_em,
    confirmadaEm: m.confirmada_em,
    atualizadaEm: m.atualizada_em,
    detalhes: extra.get(m.id_memoria).detalhes,
  }));
}

/**
 * Edita uma memória: a tela manda a memória inteira e ela substitui a anterior.
 * O tipo não muda (uma receita não vira música) e o que já foi confirmado não volta a rascunho.
 */
export async function atualizar(pool, { idUsuario, idMemoria, dados }) {
  await emTransacao(pool, async (conn) => {
    if (!(await memorias.buscarSeDona(conn, { idMemoria, idUsuario }))) throw memoriaNaoEncontrada();
    const atual = await memorias.travar(conn, idMemoria);
    if (!atual) throw memoriaNaoEncontrada();
    if (dados.tipo !== atual.tipo) {
      throw new ErroApi(400, "DADOS_INVALIDOS", "Confira os campos destacados.", { tipo: "Não dá para mudar o tipo de uma memória já guardada." });
    }
    if (atual.status === "confirmada" && dados.status === "rascunho") {
      throw new ErroApi(400, "DADOS_INVALIDOS", "Confira os campos destacados.", { status: "Uma memória confirmada não volta a ser rascunho." });
    }
    const idData = dados.data ? await memorias.criarData(conn, dados.data) : null;
    await memorias.atualizarMemoria(conn, idMemoria, { ...dados, idData });
    await memorias.apagarData(conn, atual.id_data); // a data antiga era só desta memória
    await memorias.limparConteudo(conn, idMemoria);
    await memorias.criarEtiquetas(conn, idMemoria, dados.etiquetas);
    await memorias.criarPessoas(conn, idMemoria, dados.pessoas);
    if (dados.detalhes) await memorias.criarDetalhes(conn, idMemoria, dados.tipo, dados.detalhes);
  });
  return abrir(pool, { idUsuario, idMemoria });
}

/** Apaga uma memória do acervo. Só a dona; para os outros é como se ela não existisse (404). */
export async function apagar(pool, { idUsuario, idMemoria }) {
  await emTransacao(pool, async (conn) => {
    // a checagem vai dentro da transação, junto com o apagar
    if (!(await memorias.buscarSeDona(conn, { idMemoria, idUsuario }))) throw memoriaNaoEncontrada();
    await memorias.apagarMemoria(conn, idMemoria);
  });
}
