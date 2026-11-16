// Regras de cadastro, login, sessão e saída. Aqui não há SQL (fica em dados/) nem HTTP (fica em rotas/).
import { emTransacao } from "../db.js";
import { ErroApi } from "../erros.js";
import * as usuarios from "../dados/usuarios.js";
import * as familias from "../dados/familias.js";
import * as planos from "../dados/planos.js";
import * as sessoes from "../dados/sessoes.js";
import { conferir, conferirFalso, gerarHash } from "./senha.js";
import { hashToken, novoToken } from "./token.js";

// Decisão aprovada: toda conta nova começa no plano Gratuito. Trocar de plano é outra etapa.
const PLANO_INICIAL = "Gratuito";

const credenciaisInvalidas = () =>
  new ErroApi(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha não conferem. Confira e tente de novo.");

/**
 * Cria a conta, a família e a pessoa "dona" numa transação só, e já abre a sessão.
 * Devolve o token (vai para o cookie) e o resumo da conta.
 */
export async function cadastrar(pool, config, dados) {
  const senhaHash = await gerarHash(dados.senha); // antes da transação: é lento e não precisa do banco

  let idUsuario;
  try {
    idUsuario = await emTransacao(pool, async (conn) => {
      const idPlano = await planos.idPorNome(conn, PLANO_INICIAL);
      if (!idPlano) throw new Error(`Plano "${PLANO_INICIAL}" não encontrado na tabela plano.`);

      const id = await usuarios.criar(conn, { nome: dados.nome, email: dados.email, senhaHash, idPlano });
      const idFamilia = await familias.criarFamilia(conn, { nome: dados.familia, criadoPor: id });
      await familias.criarPessoaDona(conn, {
        idFamilia,
        idUsuario: id,
        nome: dados.nome.split(/\s+/)[0].slice(0, 80), // "como chamam": o primeiro nome (dá para mudar no perfil)
        nomeCompleto: dados.nome,
      });
      return id;
    });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      throw new ErroApi(409, "EMAIL_EM_USO", "Já existe uma conta com este e-mail. Entre com ela ou use outro e-mail.", {
        email: "Já existe uma conta com este e-mail.",
      });
    }
    throw e;
  }

  const token = await abrirSessao(pool, config, idUsuario);
  return { token, conta: await resumo(pool, idUsuario) };
}

export async function entrar(pool, config, { email, senha }) {
  const u = await usuarios.buscarParaLogin(pool, email);
  if (!u) {
    await conferirFalso(senha);
    throw credenciaisInvalidas();
  }
  if (!(await conferir(u.senha_hash, senha))) throw credenciaisInvalidas();
  if (u.status !== "ativo") {
    throw new ErroApi(403, "CONTA_INDISPONIVEL", "Esta conta está desativada. Fale com o suporte para reativar.");
  }

  await sessoes.apagarVencidas(pool, u.id_usuario);
  const token = await abrirSessao(pool, config, u.id_usuario);
  return { token, conta: await resumo(pool, u.id_usuario) };
}

/** Confere o código do cookie. Devolve { idSessao, idUsuario } ou null. Renova a validade com o uso. */
export async function sessaoDoToken(pool, config, token) {
  if (!token || typeof token !== "string" || token.length > 100) return null;
  const s = await sessoes.buscarValida(pool, hashToken(token));
  if (!s) return null;
  if (s.renovar) await sessoes.renovar(pool, { idSessao: s.id_sessao, dias: config.sessaoDias });
  return { idSessao: s.id_sessao, idUsuario: s.id_usuario, renovada: Boolean(s.renovar) };
}

export async function sair(pool, token) {
  if (token && typeof token === "string") await sessoes.apagarPorHash(pool, hashToken(token));
}

/** O que a conta logada vê sobre si mesma. Nunca inclui a senha nem o hash. */
export async function resumo(pool, idUsuario) {
  const u = await usuarios.buscarResumo(pool, idUsuario);
  if (!u) return null;
  const fams = await familias.listarDoUsuario(pool, idUsuario);
  return {
    usuario: {
      id: u.id_usuario,
      nome: u.nome,
      email: u.email,
      plano: { id: u.id_plano, nome: u.plano_nome },
      ajustes: {
        tamanhoTexto: u.tamanho_texto,
        tema: u.tema,
        altoContraste: Boolean(u.alto_contraste),
        menosMovimento: Boolean(u.menos_movimento),
      },
    },
    familias: fams.map((f) => ({ id: f.id_familia, nome: f.nome, idPessoa: f.id_pessoa, papel: f.papel })),
  };
}

async function abrirSessao(pool, config, idUsuario) {
  const token = novoToken();
  await sessoes.criar(pool, { idUsuario, tokenHash: hashToken(token), dias: config.sessaoDias });
  return token;
}
