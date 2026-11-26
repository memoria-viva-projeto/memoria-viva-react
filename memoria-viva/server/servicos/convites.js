// Regras do código de convite da família (decisões aprovadas):
//   - cada família tem UM código fixo (ex.: MV-7K3P-Q9XD); quem tiver o código entra;
//   - só a dona gera, troca (o antigo para de valer na hora) ou desliga o código;
//   - vale o limite de membros do plano da dona (a dona conta; Grátis = 1 = ninguém mais entra);
//   - quem entra vira uma pessoa nova da árvore (papel familiar) e só VÊ o acervo e a árvore,
//     mudando apenas o próprio perfil (a regra está em dados/memorias.js e dados/pessoas.js).
import { randomInt } from "node:crypto";
import { emTransacao } from "../db.js";
import { ErroApi, naoEncontrado } from "../erros.js";
import * as convites from "../dados/convites.js";
import * as memorias from "../dados/memorias.js";
import * as usuarios from "../dados/usuarios.js";
import { erroFamiliaCheia, erroSemConvite } from "./planos.js";

// sem 0/O, 1/I/L: letras que se confundem ao ditar ou copiar à mão. 31^8 ≈ 850 bilhões de códigos.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const familiaNaoEncontrada = () => naoEncontrado("Não encontramos esta família na sua conta.");

export function novoCodigo() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return `MV-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** "mv 7k3p q9xd", "7K3PQ9XD", "MV-7K3P-Q9XD" → "MV-7K3P-Q9XD". Formato impossível → null. */
export function normalizar(texto) {
  let s = String(texto || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (s.length === 10 && s.startsWith("MV")) s = s.slice(2);
  if (s.length !== 8) return null;
  return `MV-${s.slice(0, 4)}-${s.slice(4)}`;
}

const MSG_CODIGO = "Não encontramos esse código. Confira com quem te convidou (ele é parecido com MV-7K3P-Q9XD).";
const codigoInvalido = () => new ErroApi(400, "CODIGO_INVALIDO", MSG_CODIGO, { codigo: MSG_CODIGO });
const podeConvidar = (limite) => limite == null || limite > 1;

async function exigirDona(db, { idFamilia, idUsuario }) {
  if (!(await memorias.idDonaDaFamilia(db, { idFamilia, idUsuario }))) throw familiaNaoEncontrada();
}

/** O que a dona vê: o código, quantos já entraram e quantos cabem. */
export async function ver(pool, { idUsuario, idFamilia }) {
  await exigirDona(pool, { idFamilia, idUsuario });
  const { codigo, criadoEm } = await convites.codigoDa(pool, idFamilia);
  const { limite, plano } = await convites.limiteDaFamilia(pool, idFamilia);
  return { codigo, criadoEm, membros: await convites.contarMembros(pool, idFamilia), limite, plano, podeConvidar: podeConvidar(limite) };
}

/** Gera um código (ou troca o atual: o antigo para de valer na hora). */
export async function gerar(pool, { idUsuario, idFamilia }) {
  await emTransacao(pool, async (conn) => {
    await exigirDona(conn, { idFamilia, idUsuario });
    const { limite } = await convites.limiteDaFamilia(conn, idFamilia);
    if (!podeConvidar(limite)) {
      throw erroSemConvite();
    }
    // a chance de sortear um código que já existe é mínima; se acontecer, sorteia de novo
    for (let tentativa = 0; ; tentativa++) {
      try {
        await convites.gravarCodigo(conn, idFamilia, novoCodigo());
        return;
      } catch (e) {
        if (e?.code !== "ER_DUP_ENTRY" || tentativa >= 4) throw e;
      }
    }
  });
  return ver(pool, { idUsuario, idFamilia });
}

/** Desliga os convites: o código atual para de valer. Quem já entrou continua. */
export async function desligar(pool, { idUsuario, idFamilia }) {
  await emTransacao(pool, async (conn) => {
    await exigirDona(conn, { idFamilia, idUsuario });
    await convites.gravarCodigo(conn, idFamilia, null);
  });
}

/** Antes de entrar: diz de qual família é o código (para a pessoa confirmar que é a certa). */
export async function conferir(pool, { codigo }) {
  const c = normalizar(codigo);
  const f = c && (await convites.familiaDoCodigo(pool, c));
  if (!f) throw codigoInvalido();
  return { familia: { nome: f.nome } };
}

/**
 * Coloca a conta na família do código. Chame dentro de uma transação (o cadastro com código usa a mesma).
 * Devolve a família no formato do resumo da conta.
 */
export async function entrarNaFamilia(conn, { codigo, idUsuario, nome, nomeCompleto }) {
  const c = normalizar(codigo);
  const f = c && (await convites.familiaDoCodigo(conn, c, { travar: true }));
  if (!f) throw codigoInvalido();
  if (await convites.jaEstaNaFamilia(conn, { idFamilia: f.id, idUsuario })) {
    throw new ErroApi(409, "JA_NA_FAMILIA", `Você já faz parte da ${f.nome}.`);
  }
  const { achou, limite } = await convites.limiteDaFamilia(conn, f.id);
  if (!achou || (limite != null && (await convites.contarMembros(conn, f.id)) >= limite)) {
    throw erroFamiliaCheia();
  }
  const idPessoa = await convites.criarMembro(conn, { idFamilia: f.id, idUsuario, nome, nomeCompleto });
  return { id: f.id, nome: f.nome, idPessoa, papel: "familiar" };
}

/** Quem já tem conta entra numa família pelo código (na árvore, com o nome da conta; depois dá para mudar no perfil). */
export async function entrar(pool, { idUsuario, codigo }) {
  const u = await usuarios.buscarResumo(pool, idUsuario);
  if (!u) throw new ErroApi(401, "NAO_AUTENTICADO", "Entre na sua conta para continuar.");
  return emTransacao(pool, (conn) =>
    entrarNaFamilia(conn, { codigo, idUsuario, nome: u.nome.split(/\s+/)[0].slice(0, 80), nomeCompleto: u.nome }));
}
