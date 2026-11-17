// SQL de familia e pessoa.
// Lembrete do modelo: usuario = conta de login; pessoa = alguém da família (com ou sem conta).
// Quem cria a conta vira uma pessoa com papel "dona" na família que ela criou.

export async function criarFamilia(db, { nome, criadoPor }) {
  const [r] = await db.execute("INSERT INTO familia (nome, criado_por) VALUES (?, ?)", [nome, criadoPor]);
  return r.insertId;
}

export async function criarPessoaDona(db, { idFamilia, idUsuario, nome, nomeCompleto }) {
  const [r] = await db.execute(
    "INSERT INTO pessoa (id_familia, id_usuario, papel, nome, nome_completo) VALUES (?, ?, 'dona', ?, ?)",
    [idFamilia, idUsuario, nome, nomeCompleto],
  );
  return r.insertId;
}

/** Famílias em que esta conta está como pessoa (e não foi tirada da árvore), com o papel dela em cada uma. */
export async function listarDoUsuario(db, idUsuario) {
  const [linhas] = await db.execute(
    `SELECT f.id_familia, f.nome, p.id_pessoa, p.papel
       FROM pessoa p
       JOIN familia f ON f.id_familia = p.id_familia
      WHERE p.id_usuario = ? AND p.removida_em IS NULL
      ORDER BY p.papel = 'dona' DESC, f.id_familia`, // o acervo da própria pessoa primeiro; depois as famílias em que entrou
    [idUsuario],
  );
  return linhas;
}
