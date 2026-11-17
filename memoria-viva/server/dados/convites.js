// SQL do código de convite da família (colunas familia.codigo_convite e familia.codigo_criado_em).
// Quem pode gerar, trocar ou desligar o código (só a dona) é conferido em servicos/convites.js.

/** Código atual da família (ou null, se os convites estão desligados). */
export async function codigoDa(db, idFamilia) {
  const [[f]] = await db.execute("SELECT codigo_convite, codigo_criado_em FROM familia WHERE id_familia = ?", [idFamilia]);
  return f ? { codigo: f.codigo_convite, criadoEm: f.codigo_criado_em } : null;
}

/** Grava um código novo (o antigo deixa de valer na hora) ou null (desliga). Lança ER_DUP_ENTRY se o código já existir. */
export async function gravarCodigo(db, idFamilia, codigo) {
  await db.execute(
    `UPDATE familia SET codigo_convite = ?, codigo_criado_em = ${codigo ? "UTC_TIMESTAMP()" : "NULL"} WHERE id_familia = ?`,
    [codigo, idFamilia],
  );
}

/**
 * A família deste código. travar: segura a linha até o fim da transação (duas pessoas entrando ao mesmo tempo esperam a vez).
 * Se a dona pediu para apagar a conta, o código não vale (ninguém entra numa família que vai ser apagada);
 * se ela desistir, volta a valer.
 */
export async function familiaDoCodigo(db, codigo, { travar = false } = {}) {
  const [[f]] = await db.execute(
    `SELECT f.id_familia, f.nome
       FROM familia f
       JOIN usuario u ON u.id_usuario = f.criado_por
      WHERE f.codigo_convite = ? AND u.apagar_em IS NULL ${travar ? "FOR UPDATE OF f" : ""}`,
    [codigo],
  );
  return f ? { id: f.id_familia, nome: f.nome } : null;
}

/**
 * Limite de membros do plano da DONA da família (plano.limite_membros; null = sem limite).
 * achou = false se a família não tem dona ativa.
 */
export async function limiteDaFamilia(db, idFamilia) {
  const [[l]] = await db.execute(
    `SELECT pl.limite_membros, pl.nome AS plano
       FROM pessoa dona
       JOIN usuario u ON u.id_usuario = dona.id_usuario
       JOIN plano pl  ON pl.id_plano = u.id_plano
      WHERE dona.id_familia = ? AND dona.papel = 'dona' AND dona.removida_em IS NULL
      LIMIT 1`,
    [idFamilia],
  );
  return l ? { achou: true, limite: l.limite_membros, plano: l.plano } : { achou: false, limite: 0, plano: null };
}

/** Quantas contas estão na família agora (a dona conta; quem foi tirado da árvore não conta). */
export async function contarMembros(db, idFamilia) {
  const [[r]] = await db.execute(
    "SELECT COUNT(*) AS n FROM pessoa WHERE id_familia = ? AND id_usuario IS NOT NULL AND removida_em IS NULL",
    [idFamilia],
  );
  return Number(r.n);
}

export async function jaEstaNaFamilia(db, { idFamilia, idUsuario }) {
  const [l] = await db.execute(
    "SELECT 1 FROM pessoa WHERE id_familia = ? AND id_usuario = ? AND removida_em IS NULL LIMIT 1",
    [idFamilia, idUsuario],
  );
  return l.length > 0;
}

/** Quem entrou pelo código vira uma pessoa nova da árvore, ligada à conta dela (papel familiar). */
export async function criarMembro(db, { idFamilia, idUsuario, nome, nomeCompleto }) {
  const [r] = await db.execute(
    "INSERT INTO pessoa (id_familia, id_usuario, papel, nome, nome_completo) VALUES (?, ?, 'familiar', ?, ?)",
    [idFamilia, idUsuario, nome, nomeCompleto],
  );
  return r.insertId;
}
