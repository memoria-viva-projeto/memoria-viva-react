// SQL da tabela plano (catálogo) e do plano de cada conta. Nada de cobrança aqui: não existe pagamento,
// a troca de plano é uma simulação que só muda usuario.id_plano / ciclo_plano / plano_desde.

const COLUNAS = `p.id_plano, p.nome, p.valor_mensal, p.valor_anual, p.armazenamento_gb, p.creditos_ia_mes,
                 p.limite_membros, p.ordem, p.descricao, p.recursos, p.em_breve`;

export async function idPorNome(db, nome) {
  const [linhas] = await db.execute("SELECT id_plano FROM plano WHERE nome = ?", [nome]);
  return linhas[0]?.id_plano ?? null;
}

/** O catálogo inteiro, do menor para o maior. */
export async function listar(db) {
  const [linhas] = await db.execute(`SELECT ${COLUNAS} FROM plano p ORDER BY p.ordem, p.valor_mensal, p.id_plano`);
  return linhas;
}

export async function buscar(db, idPlano) {
  const [linhas] = await db.execute(`SELECT ${COLUNAS} FROM plano p WHERE p.id_plano = ?`, [idPlano]);
  return linhas[0] || null;
}

/** O plano da conta, com o ciclo e desde quando. */
export async function daConta(db, idUsuario) {
  const [linhas] = await db.execute(
    `SELECT ${COLUNAS}, u.ciclo_plano, u.plano_desde
       FROM usuario u JOIN plano p ON p.id_plano = u.id_plano
      WHERE u.id_usuario = ?`,
    [idUsuario],
  );
  return linhas[0] || null;
}

/** Troca o plano da conta (simulação: não há cobrança). Devolve true se a conta existe. */
export async function mudarDaConta(db, { idUsuario, idPlano, ciclo }) {
  const [r] = await db.execute(
    "UPDATE usuario SET id_plano = ?, ciclo_plano = ?, plano_desde = UTC_TIMESTAMP() WHERE id_usuario = ?",
    [idPlano, ciclo, idUsuario],
  );
  return r.affectedRows > 0;
}

/**
 * Os acervos de que a conta participa e de quem é o plano que vale em cada um.
 * O limite de um acervo (espaço e pessoas) é sempre o do plano da DONA.
 */
export async function acervosDaConta(db, idUsuario) {
  const [linhas] = await db.execute(
    `SELECT f.id_familia, f.nome, eu.papel,
            dona.id_usuario AS id_dona, dona.nome AS nome_dona, pl.nome AS plano_dona
       FROM pessoa eu
       JOIN familia f      ON f.id_familia = eu.id_familia
       JOIN pessoa dona    ON dona.id_familia = f.id_familia AND dona.papel = 'dona' AND dona.removida_em IS NULL
       JOIN usuario dona_u ON dona_u.id_usuario = dona.id_usuario
       JOIN plano pl       ON pl.id_plano = dona_u.id_plano
      WHERE eu.id_usuario = ? AND eu.removida_em IS NULL
      ORDER BY eu.papel = 'dona' DESC, f.id_familia`,
    [idUsuario],
  );
  return linhas;
}
