// SQL da tabela sessao. Todas as datas em UTC, calculadas pelo próprio MySQL (UTC_TIMESTAMP()),
// para não depender do fuso do computador.

export async function criar(db, { idUsuario, tokenHash, dias }) {
  await db.execute(
    `INSERT INTO sessao (id_usuario, token_hash, criada_em, ultimo_uso_em, expira_em)
     VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? DAY)`,
    [idUsuario, tokenHash, dias],
  );
}

/**
 * Sessão válida para este hash: existe, não venceu, a conta está ativa e não tem pedido para ser apagada.
 * `renovar` diz se já passou mais de 1 hora do último uso (aí a validade é estendida).
 */
export async function buscarValida(db, tokenHash) {
  const [linhas] = await db.execute(
    `SELECT s.id_sessao, s.id_usuario,
            (s.ultimo_uso_em < UTC_TIMESTAMP() - INTERVAL 1 HOUR) AS renovar
       FROM sessao s
       JOIN usuario u ON u.id_usuario = s.id_usuario
      WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP() AND u.status = 'ativo' AND u.apagar_em IS NULL`,
    [tokenHash],
  );
  return linhas[0] || null;
}

export async function renovar(db, { idSessao, dias }) {
  await db.execute(
    "UPDATE sessao SET ultimo_uso_em = UTC_TIMESTAMP(), expira_em = UTC_TIMESTAMP() + INTERVAL ? DAY WHERE id_sessao = ?",
    [dias, idSessao],
  );
}

export async function apagarPorHash(db, tokenHash) {
  await db.execute("DELETE FROM sessao WHERE token_hash = ?", [tokenHash]);
}

/** Encerra todas as sessões da conta (em todos os aparelhos). */
export async function apagarTodasDa(db, idUsuario) {
  await db.execute("DELETE FROM sessao WHERE id_usuario = ?", [idUsuario]);
}

/** Faxina: sessões vencidas desta conta não servem para nada. */
export async function apagarVencidas(db, idUsuario) {
  await db.execute("DELETE FROM sessao WHERE id_usuario = ? AND expira_em <= UTC_TIMESTAMP()", [idUsuario]);
}

/** Faxina geral: apaga as sessões vencidas de todas as contas. Devolve quantas apagou. */
export async function apagarTodasVencidas(db) {
  const [r] = await db.execute("DELETE FROM sessao WHERE expira_em <= UTC_TIMESTAMP()");
  return r.affectedRows;
}
