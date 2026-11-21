// Regras das memórias: criar, listar, abrir, editar, apagar e a linha da vida.
// Quem pode o quê está em dados/memorias.js (REGRA DE ACESSO): a dona faz tudo; o membro da família só vê.
//
// Arquivos (fotos): são enviados antes (servicos/arquivos.js) e entram na memória pelos itens.
//   - só entram arquivos do MESMO acervo da memória: saber o número de um arquivo de outra família não adianta;
//   - ao editar ou apagar, os arquivos que saíram da memória e não são usados por mais nada são apagados;
//   - na edição, a tela manda a versão que abriu: se a memória mudou depois, o servidor recusa (409) em vez de
//     apagar a mudança da outra pessoa sem avisar.
import { emTransacao } from "../db.js";
import { ErroApi, naoEncontrado } from "../erros.js";
import * as arquivos from "../dados/arquivos.js";
import * as memorias from "../dados/memorias.js";
import { descartarSeSobrou } from "./arquivos.js";
import { dataDe } from "./datas.js";

const familiaNaoEncontrada = () => naoEncontrado("Não encontramos esta família na sua conta.");
const memoriaNaoEncontrada = () => naoEncontrado("Não encontramos esta memória.");
const invalido = (campos) => new ErroApi(400, "DADOS_INVALIDOS", "Confira os campos destacados.", campos);

/** Os arquivos dos itens existem, são deste acervo e do tipo certo? E a capa é um deles? */
async function conferirItens(conn, { idFamilia, itens, capa }) {
  const ids = itens.map((it) => it.idArquivo);
  const achados = new Map((await arquivos.daFamilia(conn, idFamilia, ids)).map((a) => [a.id_arquivo, a]));
  for (const [k, it] of itens.entries()) {
    const a = achados.get(it.idArquivo);
    // de outra família ou inexistente: a mesma resposta (não diz o que existe)
    if (!a) throw invalido({ [`itens.${k}`]: "Este arquivo não foi encontrado no seu acervo. Envie de novo." });
    if (a.tipo !== it.tipo) throw invalido({ [`itens.${k}`]: "O tipo do item não confere com o arquivo enviado." });
  }
  if (capa != null && !ids.includes(capa)) throw invalido({ capa: "A capa precisa ser uma das fotos da memória." });
}

export async function criar(pool, { idUsuario, idFamilia, dados }) {
  const itens = dados.itens ?? [];
  const idMemoria = await emTransacao(pool, async (conn) => {
    // a checagem vai dentro da transação: se a conta deixar de ser dona no meio, nada é gravado
    const idPessoa = await memorias.idDonaDaFamilia(conn, { idFamilia, idUsuario });
    if (!idPessoa) throw familiaNaoEncontrada();
    await conferirItens(conn, { idFamilia, itens, capa: dados.capa });

    const id = await memorias.criarMemoria(conn, {
      idFamilia,
      tipo: dados.tipo,
      titulo: dados.titulo,
      descricao: dados.descricao,
      data: dados.data,
      lugar: dados.lugar,
      capa: dados.capa ?? null,
      enviadaPor: idPessoa, // nesta etapa quem envia é sempre a própria dona
      status: dados.status,
    });
    await memorias.criarEtiquetas(conn, id, dados.etiquetas);
    await memorias.criarPessoas(conn, id, dados.pessoas);
    await memorias.criarItens(conn, id, itens);
    return id;
  });
  return abrir(pool, { idUsuario, idMemoria });
}

export async function listar(pool, { idUsuario, idFamilia, limite, antesDe }) {
  const eu = await memorias.papelNaFamilia(pool, { idFamilia, idUsuario });
  if (!eu) throw familiaNaoEncontrada();
  const linhas = await memorias.listarDaFamilia(pool, { idFamilia, limite, antesDe, comRascunhos: eu.papel === "dona" });
  const temMais = linhas.length > limite;
  const pagina = linhas.slice(0, limite);
  return {
    memorias: await completas(pool, pagina), // cada memória já vem inteira: a tela não precisa abrir uma por uma
    // para pedir a próxima página: ?antesDe=<este número>
    proxima: temMais ? pagina[pagina.length - 1].id_memoria : null,
  };
}

/**
 * Linha da vida do acervo (só memórias confirmadas), em páginas. A regra de acesso vem antes de contar e paginar:
 * quem não é da família recebe 404 e não vê nem o total.
 */
export async function linha(pool, { idUsuario, idFamilia, limite, depois, filtros }) {
  const eu = await memorias.papelNaFamilia(pool, { idFamilia, idUsuario });
  if (!eu) throw familiaNaoEncontrada();
  const ponto = depois ? (([g, o, id]) => ({ grupo: Number(g), ordem: Number(o), id: Number(id) }))(depois.split(".")) : null;
  const r = await memorias.linhaDaFamilia(pool, { idFamilia, limite, depois: ponto, filtros });
  const lista = await completas(pool, r.linhas);
  return {
    memorias: lista.map((m, k) => ({ ...m, semData: r.linhas[k].semData, anoNaLinha: r.linhas[k].anoNaLinha })),
    total: r.total,
    proxima: r.proxima, // para a próxima página: ?depois=<este texto>
  };
}

export async function abrir(pool, { idUsuario, idMemoria }) {
  const m = await memorias.buscarSeMembro(pool, { idMemoria, idUsuario }); // ver: dona ou membro
  if (!m) throw memoriaNaoEncontrada();
  return (await completas(pool, [m]))[0];
}

/** Linhas do banco → memórias no formato da API (mesmo formato no abrir, no listar e na linha da vida). */
async function completas(db, linhas) {
  const extra = await memorias.complementos(db, linhas);
  return linhas.map((m) => ({
    id: m.id_memoria,
    idFamilia: m.id_familia,
    tipo: m.tipo,
    titulo: m.titulo,
    descricao: m.descricao,
    data: dataDe(m, "data_"),
    lugar: m.lugar,
    status: m.status,
    etiquetas: extra.get(m.id_memoria).etiquetas,
    pessoas: extra.get(m.id_memoria).pessoas,
    enviadaPor: { idPessoa: m.autor_id, nome: m.autor_nome ?? m.autor_nome_completo },
    criadaEm: m.criada_em,
    confirmadaEm: m.confirmada_em,
    atualizadaEm: m.atualizada_em,
    versao: m.versao,
    capa: m.id_capa,
    itens: extra.get(m.id_memoria).itens,
  }));
}

/**
 * Edita uma memória: a tela manda a memória inteira e ela substitui a anterior.
 * Exceções: itens e capa OMITIDOS ficam como estão (itens: [] tira todos; capa: null tira a capa).
 * O tipo não muda (uma foto não vira álbum) e o que já foi confirmado não volta a rascunho.
 */
export async function atualizar(pool, armazenamento, { idUsuario, idMemoria, dados }) {
  const { antes, depois } = await emTransacao(pool, async (conn) => {
    if (!(await memorias.buscarSeDona(conn, { idMemoria, idUsuario }))) throw memoriaNaoEncontrada();
    const atual = await memorias.travar(conn, idMemoria);
    if (!atual) throw memoriaNaoEncontrada();
    if (dados.versao != null && dados.versao !== atual.versao) {
      throw new ErroApi(409, "CONFLITO_EDICAO",
        "Esta memória foi mudada em outro lugar depois que você abriu. Abra de novo para ver a versão mais nova e refaça a sua mudança.");
    }
    if (dados.tipo !== atual.tipo) throw invalido({ tipo: "Não dá para mudar o tipo de uma memória já guardada." });
    if (atual.status === "confirmada" && dados.status === "rascunho") throw invalido({ status: "Uma memória confirmada não volta a ser rascunho." });

    const antes = await memorias.arquivosDaMemoria(conn, idMemoria, atual.id_capa);
    let capa = dados.capa;
    if (dados.itens !== undefined) {
      await conferirItens(conn, { idFamilia: atual.id_familia, itens: dados.itens, capa: dados.capa });
      // a capa atual saiu dos itens e nenhuma nova foi escolhida: fica sem capa
      if (capa === undefined && atual.id_capa && !dados.itens.some((it) => it.idArquivo === atual.id_capa)) capa = null;
    } else if (capa != null) {
      const atuais = await memorias.arquivosDaMemoria(conn, idMemoria);
      if (!atuais.includes(capa)) throw invalido({ capa: "A capa precisa ser uma das fotos da memória." });
    }

    await memorias.atualizarMemoria(conn, idMemoria, { ...dados, capa });
    await memorias.limparConteudo(conn, idMemoria);
    await memorias.criarEtiquetas(conn, idMemoria, dados.etiquetas);
    await memorias.criarPessoas(conn, idMemoria, dados.pessoas);
    if (dados.itens !== undefined) {
      await memorias.limparItens(conn, idMemoria);
      await memorias.criarItens(conn, idMemoria, dados.itens);
    }
    const [[m]] = await conn.execute("SELECT id_capa FROM memoria WHERE id_memoria = ?", [idMemoria]);
    return { antes, depois: await memorias.arquivosDaMemoria(conn, idMemoria, m.id_capa) };
  });
  // depois de gravar: os arquivos que saíram desta memória e não estão em mais nada são apagados
  await descartarSeSobrou(pool, armazenamento, antes.filter((id) => !depois.includes(id))).catch(() => {});
  return abrir(pool, { idUsuario, idMemoria });
}

/** Apaga uma memória do acervo, e os arquivos dela que não são usados por mais nada. Só a dona; para os outros, 404. */
export async function apagar(pool, armazenamento, { idUsuario, idMemoria }) {
  const deles = await emTransacao(pool, async (conn) => {
    // a checagem vai dentro da transação, junto com o apagar
    if (!(await memorias.buscarSeDona(conn, { idMemoria, idUsuario }))) throw memoriaNaoEncontrada();
    return (await memorias.apagarMemoria(conn, idMemoria)) || [];
  });
  // a memória já saiu do banco; se apagar do disco falhar aqui, a faxina apaga depois
  await descartarSeSobrou(pool, armazenamento, deles).catch(() => {});
}

