// SQL da tabela plano (catálogo). Nada de cobrança aqui: só ler qual é o plano.

export async function idPorNome(db, nome) {
  const [linhas] = await db.execute("SELECT id_plano FROM plano WHERE nome = ?", [nome]);
  return linhas[0]?.id_plano ?? null;
}
