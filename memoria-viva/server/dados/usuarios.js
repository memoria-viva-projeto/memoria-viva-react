// SQL da tabela usuario (a conta de login). Só consultas: as regras ficam em servicos/.
// `db` pode ser o pool ou uma conexão de transação.

/** Para o login: precisa do hash para conferir a senha. Esse hash NUNCA sai do servidor. */
export async function buscarParaLogin(db, email) {
  const [linhas] = await db.execute(
    "SELECT id_usuario, senha_hash, status FROM usuario WHERE email = ?",
    [email],
  );
  return linhas[0] || null;
}

export async function criar(db, { nome, email, senhaHash, idPlano }) {
  const [r] = await db.execute(
    "INSERT INTO usuario (nome, email, senha_hash, id_plano) VALUES (?, ?, ?, ?)",
    [nome, email, senhaHash, idPlano],
  );
  return r.insertId;
}

/** O que a própria pessoa pode ver da conta dela. Repare: sem senha_hash. */
export async function buscarResumo(db, idUsuario) {
  const [linhas] = await db.execute(
    `SELECT u.id_usuario, u.nome, u.email, u.status, u.tamanho_texto, u.tema, u.alto_contraste, u.menos_movimento,
            p.id_plano, p.nome AS plano_nome
       FROM usuario u
       JOIN plano p ON p.id_plano = u.id_plano
      WHERE u.id_usuario = ?`,
    [idUsuario],
  );
  return linhas[0] || null;
}

/** Ajustes de acessibilidade da conta (só os campos que vieram). */
export async function mudarAjustes(db, idUsuario, a) {
  const COLUNA = { tamanhoTexto: "tamanho_texto", tema: "tema", altoContraste: "alto_contraste", menosMovimento: "menos_movimento" };
  const cols = Object.keys(COLUNA).filter((k) => k in a);
  if (!cols.length) return;
  await db.execute(`UPDATE usuario SET ${cols.map((k) => `${COLUNA[k]} = ?`).join(", ")} WHERE id_usuario = ?`, [
    ...cols.map((k) => a[k]),
    idUsuario,
  ]);
}
