// Regras da árvore da família: pessoas e laços.
// Quem pode: só a dona da família (a mesma regra das memórias). Para os outros, tudo responde 404.
import { emTransacao } from "../db.js";
import { ErroApi, naoEncontrado } from "../erros.js";
import * as memorias from "../dados/memorias.js";
import * as pessoas from "../dados/pessoas.js";
import { dataDe } from "./datas.js";

const familiaNaoEncontrada = () => naoEncontrado("Não encontramos esta família na sua conta.");
const pessoaNaoEncontrada = () => naoEncontrado("Não encontramos esta pessoa na sua família.");

/** Linha do banco → pessoa no formato da API. */
function pessoaDe(p, gostos = []) {
  return {
    id: p.id_pessoa,
    voce: p.papel === "dona", // a dona da conta (na tela, "Você")
    papel: p.papel,
    temConta: p.id_usuario != null, // só sim/não: a conta de outra pessoa nunca aparece
    nome: p.nome,
    nomeCompleto: p.nome_completo,
    genero: p.genero,
    nascimento: dataDe(p, "nasc_"),
    falecimento: dataDe(p, "fal_"),
    faleceu: Boolean(p.faleceu),
    origem: p.origem,
    bio: p.bio,
    cor: p.cor,
    cidadeNatal: p.cidade_natal,
    cidadeAtual: p.cidade_atual,
    profissao: p.profissao,
    capa: p.capa,
    favoritos: { comida: p.comida_favorita, musica: p.musica_favorita, lugar: p.lugar_favorito },
    gostos,
    removida: p.removida_em != null, // saiu da árvore, mas o nome continua nas memórias
    criadaEm: p.criada_em,
  };
}

const lacoDe = (l) => ({
  id: l.id_laco, tipo: l.tipo, de: l.id_de, para: l.id_para, modo: l.modo, rotulo: l.rotulo, rotuloVolta: l.rotulo_volta,
});

export async function arvore(pool, { idUsuario, idFamilia }) {
  if (!(await memorias.idDonaDaFamilia(pool, { idFamilia, idUsuario }))) throw familiaNaoEncontrada();
  const a = await pessoas.arvore(pool, idFamilia);
  const gostos = new Map();
  for (const g of a.gostos) gostos.set(g.id_pessoa, [...(gostos.get(g.id_pessoa) || []), g.gosto]);
  return { pessoas: a.pessoas.map((p) => pessoaDe(p, gostos.get(p.id_pessoa))), lacos: a.lacos.map(lacoDe) };
}

async function abrir(db, { idPessoa, idUsuario }) {
  const p = await pessoas.buscarSeDona(db, { idPessoa, idUsuario });
  return pessoaDe(p, await pessoas.gostosDe(db, idPessoa));
}

export async function criar(pool, { idUsuario, idFamilia, dados }) {
  const id = await emTransacao(pool, async (conn) => {
    if (!(await memorias.idDonaDaFamilia(conn, { idFamilia, idUsuario }))) throw familiaNaoEncontrada();
    return pessoas.criar(conn, { idFamilia, dados });
  });
  return abrir(pool, { idPessoa: id, idUsuario });
}

export async function mudar(pool, { idUsuario, idPessoa, dados }) {
  await emTransacao(pool, async (conn) => {
    const atual = await pessoas.buscarSeDona(conn, { idPessoa, idUsuario, travar: true });
    if (!atual) throw pessoaNaoEncontrada();
    await pessoas.mudar(conn, atual, dados);
  });
  return abrir(pool, { idPessoa, idUsuario });
}

export async function tirarDaArvore(pool, { idUsuario, idPessoa }) {
  await emTransacao(pool, async (conn) => {
    const atual = await pessoas.buscarSeDona(conn, { idPessoa, idUsuario, travar: true });
    if (!atual) throw pessoaNaoEncontrada();
    if (atual.papel === "dona") throw new ErroApi(409, "VOCE_FICA", "Você não pode se tirar da sua própria árvore.");
    await pessoas.tirarDaArvore(conn, idPessoa);
  });
}

export async function criarLaco(pool, { idUsuario, idFamilia, laco }) {
  const id = await emTransacao(pool, async (conn) => {
    if (!(await memorias.idDonaDaFamilia(conn, { idFamilia, idUsuario }))) throw familiaNaoEncontrada();
    // as duas pessoas precisam ser DESTA família e estar na árvore (nada de ligar gente de outra família)
    if (!(await pessoas.ambasNaFamilia(conn, { idFamilia, de: laco.de, para: laco.para }))) {
      throw new ErroApi(400, "DADOS_INVALIDOS", "Confira os campos destacados.", { para: "Escolha duas pessoas da sua árvore." });
    }
    return pessoas.criarLaco(conn, { idFamilia, l: laco });
  });
  return lacoDe(await pessoas.buscarLaco(pool, id));
}

export async function apagarLaco(pool, { idUsuario, idLaco }) {
  await emTransacao(pool, async (conn) => {
    if (!(await pessoas.buscarLacoSeDona(conn, { idLaco, idUsuario }))) throw naoEncontrado("Não encontramos este parentesco.");
    await pessoas.apagarLaco(conn, idLaco);
  });
}
