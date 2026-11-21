// SQL da tabela arquivo (os dados de cada foto; o conteúdo fica no armazenamento, em subpasta/nome).
//
// QUEM PODE VER UM ARQUIVO (mesma regra das memórias, conferida aqui dentro do SQL):
//   - a dona do acervo dono do arquivo (inclusive os que ela acabou de enviar e ainda não usou);
//   - quem pode ver ALGUMA memória que usa o arquivo (como item ou como capa): membro da família vê as
//     confirmadas, não os rascunhos.
// Saber o número do arquivo não dá acesso a nada: sem uma dessas ligações, a resposta é 404.

const SQL_PODE_VER = `(
    EXISTS (SELECT 1 FROM pessoa dona
             WHERE dona.id_familia = a.id_familia AND dona.papel = 'dona' AND dona.removida_em IS NULL AND dona.id_usuario = ?)
    OR EXISTS (SELECT 1 FROM memoria m
                 JOIN pessoa eu ON eu.id_familia = m.id_familia AND eu.removida_em IS NULL AND eu.id_usuario = ?
                                AND (eu.papel = 'dona' OR m.status <> 'rascunho')
                WHERE m.id_capa = a.id_arquivo
                   OR EXISTS (SELECT 1 FROM item_memoria it WHERE it.id_memoria = m.id_memoria AND it.id_arquivo = a.id_arquivo))
  )`;

// "em uso" = alguma memória (item ou capa) ou alguma pessoa da árvore (foto) aponta para ele
const SQL_EM_USO = `(
    EXISTS (SELECT 1 FROM item_memoria it WHERE it.id_arquivo = a.id_arquivo)
    OR EXISTS (SELECT 1 FROM memoria m WHERE m.id_capa = a.id_arquivo)
    OR EXISTS (SELECT 1 FROM pessoa p WHERE p.id_foto = a.id_arquivo)
  )`;

const COLUNAS = `a.id_arquivo, a.id_familia, a.tipo, a.subpasta, a.nome_arquivo, a.nome_miniatura, a.mime, a.tamanho_bytes, a.tamanho_miniatura,
                 a.largura, a.altura, a.nome_original, a.enviado_por, a.criado_em`;

/** O arquivo, só se a conta puder vê-lo. Senão, null. */
export async function buscarSePodeVer(db, { idArquivo, idUsuario }) {
  const [l] = await db.execute(`SELECT ${COLUNAS} FROM arquivo a WHERE a.id_arquivo = ? AND ${SQL_PODE_VER}`, [idArquivo, idUsuario, idUsuario]);
  return l[0] || null;
}

/** Arquivos de uma família (para conferir os itens de uma memória antes de gravar). Só os ids pedidos. */
export async function daFamilia(db, idFamilia, ids) {
  if (!ids.length) return [];
  const [l] = await db.query(
    `SELECT ${COLUNAS} FROM arquivo a WHERE a.id_familia = ? AND a.id_arquivo IN (${ids.map(() => "?").join(", ")})`,
    [idFamilia, ...ids],
  );
  return l;
}

/** O arquivo, se a conta for dona do acervo dele (para trocar a miniatura ou descartar). travar: até o fim da transação. */
export async function buscarSeDona(db, { idArquivo, idUsuario, travar = false }) {
  const [l] = await db.execute(
    `SELECT ${COLUNAS} FROM arquivo a
       JOIN pessoa dona ON dona.id_familia = a.id_familia AND dona.papel = 'dona' AND dona.removida_em IS NULL AND dona.id_usuario = ?
      WHERE a.id_arquivo = ? ${travar ? "FOR UPDATE OF a" : ""}`,
    [idUsuario, idArquivo],
  );
  return l[0] || null;
}

export async function emUso(db, idArquivo) {
  const [l] = await db.execute(`SELECT 1 FROM arquivo a WHERE a.id_arquivo = ? AND ${SQL_EM_USO}`, [idArquivo]);
  return l.length > 0;
}

/** Trava a linha da família: dois envios ao mesmo tempo esperam a vez para conferir o espaço do plano. */
export async function travarFamilia(db, idFamilia) {
  await db.execute("SELECT id_familia FROM familia WHERE id_familia = ? FOR UPDATE", [idFamilia]);
}

/** Espaço usado pelo acervo (arquivos + miniaturas), em bytes, e o limite do plano da dona (null = sem dona ativa). */
export async function espaco(db, idFamilia) {
  const [[u]] = await db.execute(
    "SELECT COALESCE(SUM(COALESCE(tamanho_bytes, 0) + COALESCE(tamanho_miniatura, 0)), 0) AS usado FROM arquivo WHERE id_familia = ?",
    [idFamilia],
  );
  const [[p]] = await db.execute(
    `SELECT pl.armazenamento_gb
       FROM pessoa dona JOIN usuario us ON us.id_usuario = dona.id_usuario JOIN plano pl ON pl.id_plano = us.id_plano
      WHERE dona.id_familia = ? AND dona.papel = 'dona' AND dona.removida_em IS NULL LIMIT 1`,
    [idFamilia],
  );
  return { usado: Number(u.usado), limite: p ? Math.floor(Number(p.armazenamento_gb) * 1024 ** 3) : null };
}

export async function criar(db, a) {
  const [r] = await db.execute(
    `INSERT INTO arquivo (id_familia, tipo, subpasta, nome_arquivo, mime, tamanho_bytes, largura, altura, nome_original, enviado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [a.idFamilia, a.tipo, a.subpasta, a.nome, a.mime, a.tamanho, a.largura, a.altura, a.nomeOriginal, a.enviadoPor],
  );
  return r.insertId;
}

/** A miniatura fica na mesma subpasta do arquivo: só o nome dela é guardado. */
export async function trocarMiniatura(db, idArquivo, { nome, tamanho }) {
  await db.execute("UPDATE arquivo SET nome_miniatura = ?, tamanho_miniatura = ? WHERE id_arquivo = ?", [nome, tamanho, idArquivo]);
}

/** { subpasta, nome } do arquivo e da miniatura (o que existir), para apagar do armazenamento. */
export const locaisDe = (a) =>
  [a.nome_arquivo && { subpasta: a.subpasta, nome: a.nome_arquivo }, a.nome_miniatura && { subpasta: a.subpasta, nome: a.nome_miniatura }].filter(Boolean);

/** Apaga as linhas destes arquivos que NÃO estão em uso. Devolve os { subpasta, nome } (arquivo e miniatura) para apagar do armazenamento. */
export async function apagarSemUso(db, ids) {
  if (!ids.length) return [];
  const [l] = await db.query(
    `SELECT a.id_arquivo, a.subpasta, a.nome_arquivo, a.nome_miniatura FROM arquivo a
      WHERE a.id_arquivo IN (${ids.map(() => "?").join(", ")}) AND NOT ${SQL_EM_USO} FOR UPDATE`,
    ids,
  );
  if (!l.length) return [];
  await db.query(`DELETE FROM arquivo WHERE id_arquivo IN (${l.map(() => "?").join(", ")})`, l.map((a) => a.id_arquivo));
  return l.flatMap(locaisDe);
}

/** Faxina: arquivos enviados há mais de `horas` horas que nenhuma memória nem pessoa usa (envio abandonado). */
export async function sobras(db, horas) {
  const [l] = await db.execute(
    `SELECT a.id_arquivo FROM arquivo a WHERE a.criado_em < UTC_TIMESTAMP() - INTERVAL ? HOUR AND NOT ${SQL_EM_USO} LIMIT 500`,
    [horas],
  );
  return l.map((a) => a.id_arquivo);
}

/** Todos os "subpasta/nome" que o banco conhece (para a faxina saber o que no armazenamento não tem dono). */
export async function todosOsLocais(db) {
  const [l] = await db.query("SELECT subpasta, nome_arquivo, nome_miniatura FROM arquivo");
  return new Set(l.flatMap(locaisDe).map((x) => `${x.subpasta}/${x.nome}`));
}
