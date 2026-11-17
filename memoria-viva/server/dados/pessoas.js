// SQL da árvore: pessoas e laços (parentescos).
// REGRA DE ACESSO (a mesma das memórias): a DONA vê e muda a árvore; o MEMBRO (entrou pelo código) vê a
// árvore e muda só a própria pessoa (o perfil dele). Toda busca por id passa por um JOIN com a dona ou
// com "eu"; quem não pode recebe null (a rota responde 404).

const SQL_DONA = "dona.papel = 'dona' AND dona.removida_em IS NULL AND dona.id_usuario = ?";

const COLUNAS_PESSOA = `p.id_pessoa, p.id_familia, p.id_usuario, p.papel, p.nome, p.nome_completo, p.genero, p.faleceu,
       p.origem, p.bio, p.cor, p.cidade_natal, p.cidade_atual, p.profissao, p.comida_favorita, p.musica_favorita,
       p.lugar_favorito, p.capa, p.removida_em, p.criada_em, p.id_nascimento, p.id_falecimento,
       n.modo AS nasc_modo, n.dia AS nasc_dia, n.mes AS nasc_mes, n.ano AS nasc_ano, n.ano_fim AS nasc_ano_fim, n.aprox AS nasc_aprox,
       f.modo AS fal_modo, f.dia AS fal_dia, f.mes AS fal_mes, f.ano AS fal_ano, f.ano_fim AS fal_ano_fim, f.aprox AS fal_aprox`;
const JUNTAR_DATAS = `LEFT JOIN data_flexivel n ON n.id_data = p.id_nascimento
       LEFT JOIN data_flexivel f ON f.id_data = p.id_falecimento`;

/** Pessoas, laços e gostos de uma família. Chame só depois de conferir que a conta é dona. */
export async function arvore(db, idFamilia) {
  const [pessoas] = await db.execute(
    `SELECT ${COLUNAS_PESSOA} FROM pessoa p ${JUNTAR_DATAS} WHERE p.id_familia = ? ORDER BY p.id_pessoa`,
    [idFamilia],
  );
  const [lacos] = await db.execute("SELECT * FROM laco WHERE id_familia = ? ORDER BY id_laco", [idFamilia]);
  const [gostos] = await db.execute(
    `SELECT g.id_pessoa, g.gosto FROM pessoa_gosto g JOIN pessoa p ON p.id_pessoa = g.id_pessoa
      WHERE p.id_familia = ? ORDER BY g.id_pessoa_gosto`,
    [idFamilia],
  );
  return { pessoas, lacos, gostos };
}

/** A pessoa, só se a conta for dona da família dela. `travar` = trava a linha até o fim da transação. */
export async function buscarSeDona(db, { idPessoa, idUsuario, travar = false }) {
  const [l] = await db.execute(
    `SELECT ${COLUNAS_PESSOA}
       FROM pessoa p
       JOIN pessoa dona ON dona.id_familia = p.id_familia AND ${SQL_DONA}
       ${JUNTAR_DATAS}
      WHERE p.id_pessoa = ? ${travar ? "FOR UPDATE OF p" : ""}`,
    [idUsuario, idPessoa],
  );
  return l[0] || null;
}

/** A pessoa, se a conta for da família dela (dona ou membro). Só para LER. */
export async function buscarSeMembro(db, { idPessoa, idUsuario }) {
  const [l] = await db.execute(
    `SELECT ${COLUNAS_PESSOA}
       FROM pessoa p
       JOIN pessoa eu ON eu.id_familia = p.id_familia AND eu.removida_em IS NULL AND eu.id_usuario = ?
       ${JUNTAR_DATAS}
      WHERE p.id_pessoa = ?
      LIMIT 1`,
    [idUsuario, idPessoa],
  );
  return l[0] || null;
}

/** A própria pessoa da conta (o perfil dela nesta família), se ainda estiver na árvore. */
export async function buscarPropria(db, { idPessoa, idUsuario, travar = false }) {
  const [l] = await db.execute(
    `SELECT ${COLUNAS_PESSOA}
       FROM pessoa p
       ${JUNTAR_DATAS}
      WHERE p.id_pessoa = ? AND p.id_usuario = ? AND p.removida_em IS NULL ${travar ? "FOR UPDATE OF p" : ""}`,
    [idPessoa, idUsuario],
  );
  return l[0] || null;
}

export async function gostosDe(db, idPessoa) {
  const [l] = await db.execute("SELECT gosto FROM pessoa_gosto WHERE id_pessoa = ? ORDER BY id_pessoa_gosto", [idPessoa]);
  return l.map((g) => g.gosto);
}

// ---------- gravação (sempre dentro de transação) ----------

// nome na tela → coluna no banco (só estes campos podem ser gravados; o resto nunca vem do cliente)
const COLUNA = {
  nome: "nome", nomeCompleto: "nome_completo", genero: "genero", faleceu: "faleceu", origem: "origem", bio: "bio", cor: "cor",
  cidadeNatal: "cidade_natal", cidadeAtual: "cidade_atual", profissao: "profissao", capa: "capa",
};
const favoritosEmColunas = (f) => ({ comida_favorita: f.comida ?? null, musica_favorita: f.musica ?? null, lugar_favorito: f.lugar ?? null });

async function gravarData(db, d) {
  if (!d) return null;
  const [r] = await db.execute(
    "INSERT INTO data_flexivel (modo, dia, mes, ano, ano_fim, aprox) VALUES (?, ?, ?, ?, ?, ?)",
    [d.modo, d.dia, d.mes, d.modo === "decada" ? d.decada : d.ano, d.anoFim, d.aprox],
  );
  return r.insertId;
}

/** Cria um familiar: sempre papel "familiar" e sem conta vinculada. Devolve o id. */
export async function criar(db, { idFamilia, dados }) {
  const valores = {
    id_familia: idFamilia,
    papel: "familiar",
    id_nascimento: await gravarData(db, dados.nascimento),
    id_falecimento: await gravarData(db, dados.falecimento),
  };
  for (const [campo, coluna] of Object.entries(COLUNA)) if (dados[campo] !== undefined) valores[coluna] = dados[campo];
  if (dados.favoritos) Object.assign(valores, favoritosEmColunas(dados.favoritos));
  const cols = Object.keys(valores); // nomes vindos só da lista fixa acima
  const [r] = await db.execute(
    `INSERT INTO pessoa (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
    cols.map((c) => valores[c]),
  );
  if (dados.gostos) await trocarGostos(db, r.insertId, dados.gostos);
  return r.insertId;
}

/** Muda só os campos que vieram. `atual` é a linha de buscarSeDona (para trocar as datas). */
export async function mudar(db, atual, dados) {
  const valores = {};
  for (const [campo, coluna] of Object.entries(COLUNA)) {
    if (campo in dados) valores[coluna] = dados[campo] ?? (campo === "faleceu" ? false : null);
  }
  if ("favoritos" in dados) Object.assign(valores, favoritosEmColunas(dados.favoritos || {}));
  const datasVelhas = [];
  for (const [campo, coluna] of [["nascimento", "id_nascimento"], ["falecimento", "id_falecimento"]]) {
    if (!(campo in dados)) continue;
    valores[coluna] = await gravarData(db, dados[campo]);
    if (atual[coluna]) datasVelhas.push(atual[coluna]);
  }
  const cols = Object.keys(valores);
  if (cols.length) {
    await db.execute(`UPDATE pessoa SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id_pessoa = ?`, [
      ...cols.map((c) => valores[c]),
      atual.id_pessoa,
    ]);
  }
  // a data antiga era só desta pessoa: sai junto
  for (const id of datasVelhas) await db.execute("DELETE FROM data_flexivel WHERE id_data = ?", [id]);
  if ("gostos" in dados) await trocarGostos(db, atual.id_pessoa, dados.gostos || []);
}

async function trocarGostos(db, idPessoa, gostos) {
  await db.execute("DELETE FROM pessoa_gosto WHERE id_pessoa = ?", [idPessoa]);
  for (const g of gostos) await db.execute("INSERT INTO pessoa_gosto (id_pessoa, gosto) VALUES (?, ?)", [idPessoa, g]);
}

/** Tira da árvore: a pessoa continua no banco (e nas memórias em que aparece); só os laços dela são desfeitos. */
export async function tirarDaArvore(db, idPessoa) {
  await db.execute("UPDATE pessoa SET removida_em = UTC_TIMESTAMP() WHERE id_pessoa = ? AND removida_em IS NULL", [idPessoa]);
  await db.execute("DELETE FROM laco WHERE id_de = ? OR id_para = ?", [idPessoa, idPessoa]);
}

// ---------- laços ----------

/** As duas pessoas são desta família e estão na árvore? Trava as duas linhas até o fim da transação. */
export async function ambasNaFamilia(db, { idFamilia, de, para }) {
  const [l] = await db.execute(
    "SELECT id_pessoa FROM pessoa WHERE id_familia = ? AND removida_em IS NULL AND id_pessoa IN (?, ?) FOR UPDATE",
    [idFamilia, de, para],
  );
  return l.length === 2;
}

/** Um laço por par de pessoas: o novo substitui o que houver entre as duas (como a tela faz). */
export async function criarLaco(db, { idFamilia, l }) {
  await db.execute("DELETE FROM laco WHERE (id_de = ? AND id_para = ?) OR (id_de = ? AND id_para = ?)", [l.de, l.para, l.para, l.de]);
  const [r] = await db.execute(
    "INSERT INTO laco (id_familia, tipo, id_de, id_para, modo, rotulo, rotulo_volta) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [idFamilia, l.tipo, l.de, l.para, l.modo, l.rotulo, l.rotuloVolta],
  );
  return r.insertId;
}

export async function buscarLaco(db, idLaco) {
  const [l] = await db.execute("SELECT * FROM laco WHERE id_laco = ?", [idLaco]);
  return l[0] || null;
}

/** O laço, só se a conta for dona da família dele. */
export async function buscarLacoSeDona(db, { idLaco, idUsuario }) {
  const [l] = await db.execute(
    `SELECT l.* FROM laco l JOIN pessoa dona ON dona.id_familia = l.id_familia AND ${SQL_DONA} WHERE l.id_laco = ?`,
    [idUsuario, idLaco],
  );
  return l[0] || null;
}

export async function apagarLaco(db, idLaco) {
  await db.execute("DELETE FROM laco WHERE id_laco = ?", [idLaco]);
}
