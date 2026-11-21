// Regras para apagar a própria conta (decisões aprovadas):
//   - a pessoa confirma com a senha; a conta fica marcada e é apagada de vez depois de 30 dias;
//   - ao pedir, ela sai de todos os aparelhos e não consegue mais entrar: só pode desistir (com e-mail e senha);
//   - nesses 30 dias, quem entrou na família dela pelo código continua vendo o acervo (dá tempo de guardar o que quiser),
//     mas o código da família não aceita ninguém novo;
//   - vencido o prazo, some a conta e as famílias em que ela é dona; nas famílias de outras pessoas,
//     ela continua na árvore, sem conta (ver dados/apagarConta.js).
import { emTransacao } from "../db.js";
import { ErroApi } from "../erros.js";
import * as apagar from "../dados/apagarConta.js";
import * as sessoes from "../dados/sessoes.js";
import * as usuarios from "../dados/usuarios.js";
import { conferir, conferirFalso } from "./senha.js";

export const PRAZO_DIAS = 30;

const SENHA_ERRADA = "A senha não confere. Confira e tente de novo.";
const credenciaisInvalidas = () =>
  new ErroApi(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha não conferem. Confira e tente de novo.");

/** O que vai sumir, para a tela avisar antes. */
export async function resumo(pool, idUsuario) {
  return { prazoDias: PRAZO_DIAS, ...(await apagar.resumoParaApagar(pool, idUsuario)) };
}

/** Pede para apagar: confere a senha, marca a data e encerra todas as sessões. */
export async function pedir(pool, { idUsuario, senha }) {
  const hash = await usuarios.buscarSenha(pool, idUsuario);
  if (!hash) throw new ErroApi(401, "NAO_AUTENTICADO", "Entre na sua conta para continuar.");
  if (!(await conferir(hash, senha))) throw new ErroApi(400, "SENHA_ERRADA", SENHA_ERRADA, { senha: SENHA_ERRADA });
  return emTransacao(pool, async (conn) => {
    const apagarEm = await usuarios.marcarParaApagar(conn, idUsuario, PRAZO_DIAS);
    await sessoes.apagarTodasDa(conn, idUsuario);
    return { apagarEm };
  });
}

/**
 * Desiste do pedido (com e-mail e senha, porque a pessoa não consegue mais entrar).
 * Devolve o id da conta; quem chama abre a sessão em seguida.
 */
export async function desistir(pool, { email, senha }) {
  const u = await usuarios.buscarParaLogin(pool, email);
  if (!u) {
    await conferirFalso(senha);
    throw credenciaisInvalidas();
  }
  if (!(await conferir(u.senha_hash, senha))) throw credenciaisInvalidas();
  if (u.apagar_em) await usuarios.desmarcarApagar(pool, u.id_usuario);
  return u.id_usuario;
}

/**
 * Apaga de vez as contas cujo prazo acabou. Cada conta numa transação própria: se uma falhar,
 * ela fica para a próxima rodada e as outras seguem. Devolve { apagadas, falhas }.
 */
export async function apagarVencidas(pool, armazenamento) {
  let apagadas = 0;
  let falhas = 0;
  for (const id of await usuarios.listarParaApagar(pool)) {
    try {
      const r = await emTransacao(pool, (conn) => apagar.apagarDeVez(conn, id));
      if (r) {
        apagadas++;
        // fotos: depois que o banco confirmou (sem armazenamento aqui, a faxina apaga depois)
        if (armazenamento) for (const l of r.locais) await armazenamento.apagar(l).catch(() => {});
      }
    } catch (e) {
      falhas++;
      // no log, só o tipo do erro: nunca dados da conta
      console.error(`Apagar conta vencida falhou (${e?.code || e?.name || "Erro"}); tento de novo na próxima rodada.`);
    }
  }
  return { apagadas, falhas };
}
