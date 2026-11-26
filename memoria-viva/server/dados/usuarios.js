// SQL da tabela usuario (a conta de login). Só consultas: as regras ficam em servicos/.
// `db` pode ser o pool ou uma conexão de transação.

/** Para o login: precisa do hash para conferir a senha. Esse hash NUNCA sai do servidor. */
export async function buscarParaLogin(db, email) {
  const [linhas] = await db.execute(
    "SELECT id_usuario, senha_hash, status, apagar_em FROM usuario WHERE email = ?",
    [email],
  );
  return linhas[0] || null;
}

/** Para conferir a senha de quem já está logado (ex.: antes de apagar a conta). O hash NUNCA sai do servidor. */
export async function buscarSenha(db, idUsuario) {
  const [linhas] = await db.execute("SELECT senha_hash FROM usuario WHERE id_usuario = ?", [idUsuario]);
  return linhas[0]?.senha_hash || null;
}

/** Marca a conta para ser apagada daqui a `dias` dias. Devolve a data marcada (UTC). */
export async function marcarParaApagar(db, idUsuario, dias) {
  await db.execute("UPDATE usuario SET apagar_em = UTC_TIMESTAMP() + INTERVAL ? DAY WHERE id_usuario = ?", [dias, idUsuario]);
  const [[u]] = await db.execute("SELECT apagar_em FROM usuario WHERE id_usuario = ?", [idUsuario]);
  return u.apagar_em;
}

/** Desiste do pedido: a conta volta ao normal. */
export async function desmarcarApagar(db, idUsuario) {
  await db.execute("UPDATE usuario SET apagar_em = NULL WHERE id_usuario = ?", [idUsuario]);
}

/** Contas cujo prazo para desistir já acabou. */
export async function listarParaApagar(db) {
  const [linhas] = await db.execute("SELECT id_usuario FROM usuario WHERE apagar_em IS NOT NULL AND apagar_em <= UTC_TIMESTAMP()");
  return linhas.map((l) => l.id_usuario);
}

export async function criar(db, { nome, email, senhaHash, idPlano, ciclo = null }) {
  const [r] = await db.execute(
    "INSERT INTO usuario (nome, email, senha_hash, id_plano, ciclo_plano, plano_desde) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())",
    [nome, email, senhaHash, idPlano, ciclo],
  );
  return r.insertId;
}

/** O que a própria pessoa pode ver da conta dela. Repare: sem senha_hash. */
export async function buscarResumo(db, idUsuario) {
  const [linhas] = await db.execute(
    `SELECT u.id_usuario, u.nome, u.email, u.status, u.tamanho_texto, u.tema, u.alto_contraste, u.menos_movimento,
            p.id_plano, p.nome AS plano_nome, p.limite_membros, u.ciclo_plano
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
