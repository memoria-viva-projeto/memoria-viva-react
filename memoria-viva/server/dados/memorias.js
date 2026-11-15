// SQL das memórias.
//
// REGRA DE ACESSO DESTA ETAPA (aprovada): só a DONA do acervo vê e cria memórias nele.
//   "dona" = pessoa com papel 'dona' na família, ligada à conta logada e não removida da árvore.
// Ajudante, familiar, compartilhamento, parentesco, marcação em foto e plano NÃO dão acesso
// enquanto essas regras não forem decididas. A checagem está aqui, dentro do próprio SQL
// (o JOIN com a dona), para que nenhuma rota consiga ler uma memória sem passar por ela.

const SQL_DONA = "dona.papel = 'dona' AND dona.removida_em IS NULL AND dona.id_usuario = ?";

/** id_pessoa da conta como dona desta família, ou null (não é dona / família não existe). */
export async function idDonaDaFamilia(db, { idFamilia, idUsuario }) {
  const [l] = await db.execute(
    `SELECT dona.id_pessoa FROM pessoa dona WHERE dona.id_familia = ? AND ${SQL_DONA} LIMIT 1`,
    [idFamilia, idUsuario],
  );
  return l[0]?.id_pessoa ?? null;
}

/** A memória, só se a conta for dona do acervo dela. Senão, null (para quem pergunta, é como se não existisse). */
export async function buscarSeDona(db, { idMemoria, idUsuario }) {
  const [l] = await db.execute(
    `SELECT m.id_memoria, m.id_familia, m.tipo, m.titulo, m.descricao, m.lugar, m.status,
            m.criada_em, m.confirmada_em, m.atualizada_em,
            autor.id_pessoa AS autor_id, autor.nome AS autor_nome, autor.nome_completo AS autor_nome_completo,
            d.modo, d.dia, d.mes, d.ano, d.ano_fim, d.aprox
       FROM memoria m
       JOIN pessoa dona  ON dona.id_familia = m.id_familia AND ${SQL_DONA}
       JOIN pessoa autor ON autor.id_pessoa = m.enviada_por
       LEFT JOIN data_flexivel d ON d.id_data = m.id_data
      WHERE m.id_memoria = ?`,
    [idUsuario, idMemoria],
  );
  return l[0] || null;
}

/** Lista do acervo, mais nova primeiro. Chame só depois de conferir que a conta é dona (idDonaDaFamilia). */
export async function listarDaFamilia(db, { idFamilia, limite, antesDe }) {
  // LIMIT com número já validado (1 a 100); o resto vai como parâmetro
  const [l] = await db.query(
    `SELECT m.id_memoria, m.tipo, m.titulo, m.lugar, m.status, m.criada_em,
            d.modo, d.dia, d.mes, d.ano, d.ano_fim, d.aprox
       FROM memoria m
       LEFT JOIN data_flexivel d ON d.id_data = m.id_data
      WHERE m.id_familia = ? ${antesDe ? "AND m.id_memoria < ?" : ""}
      ORDER BY m.id_memoria DESC
      LIMIT ${Number(limite) + 1}`,
    antesDe ? [idFamilia, antesDe] : [idFamilia],
  );
  return l;
}

export async function etiquetas(db, idMemoria) {
  const [l] = await db.execute("SELECT etiqueta FROM memoria_etiqueta WHERE id_memoria = ? ORDER BY etiqueta", [idMemoria]);
  return l.map((r) => r.etiqueta);
}

export async function detalhes(db, { idMemoria, tipo }) {
  if (tipo === "receita") {
    const [[r]] = await db.execute("SELECT quem_fazia, ocasioes, preparo, segredos FROM receita WHERE id_memoria = ?", [idMemoria]);
    const [ing] = await db.execute("SELECT texto FROM ingrediente WHERE id_memoria = ? ORDER BY ordem, id_ingrediente", [idMemoria]);
    return {
      quemFazia: r?.quem_fazia ?? null,
      ocasioes: r?.ocasioes ?? null,
      preparo: r?.preparo ?? null,
      segredos: r?.segredos ?? null,
      ingredientes: ing.map((i) => i.texto),
    };
  }
  if (tipo === "musica") {
    const [[r]] = await db.execute("SELECT artista, porque, lembranca, quem_ouvia, momento FROM musica WHERE id_memoria = ?", [idMemoria]);
    return { artista: r?.artista ?? null, porque: r?.porque ?? null, lembranca: r?.lembranca ?? null, quemOuvia: r?.quem_ouvia ?? null, momento: r?.momento ?? null };
  }
  if (tipo === "video") {
    const [[r]] = await db.execute("SELECT contexto FROM video WHERE id_memoria = ?", [idMemoria]);
    return { contexto: r?.contexto ?? null };
  }
  if (tipo === "conselho") {
    const [[r]] = await db.execute("SELECT frase, guardado_para FROM conselho WHERE id_memoria = ?", [idMemoria]);
    return { frase: r?.frase ?? null, guardadoPara: r?.guardado_para ?? null };
  }
  return null; // foto e álbum: os detalhes vêm com os arquivos, numa próxima etapa
}

// ---------- gravação (sempre dentro de uma transação, ver servicos/memorias.js) ----------

export async function criarData(db, d) {
  const [r] = await db.execute(
    "INSERT INTO data_flexivel (modo, dia, mes, ano, ano_fim, aprox) VALUES (?, ?, ?, ?, ?, ?)",
    [d.modo, d.dia, d.mes, d.modo === "decada" ? d.decada : d.ano, d.anoFim, d.aprox], // na década, o ano guarda o início (1970)
  );
  return r.insertId;
}

export async function criarMemoria(db, m) {
  const [r] = await db.execute(
    `INSERT INTO memoria (id_familia, tipo, titulo, descricao, id_data, lugar, enviada_por, status, confirmada_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${m.status === "confirmada" ? "UTC_TIMESTAMP()" : "NULL"})`,
    [m.idFamilia, m.tipo, m.titulo, m.descricao, m.idData, m.lugar, m.enviadaPor, m.status],
  );
  return r.insertId;
}

export async function criarEtiquetas(db, idMemoria, lista) {
  for (const e of lista) await db.execute("INSERT INTO memoria_etiqueta (id_memoria, etiqueta) VALUES (?, ?)", [idMemoria, e]);
}

export async function criarDetalhes(db, idMemoria, tipo, d) {
  if (tipo === "receita") {
    await db.execute("INSERT INTO receita (id_memoria, quem_fazia, ocasioes, preparo, segredos) VALUES (?, ?, ?, ?, ?)", [
      idMemoria, d.quemFazia, d.ocasioes, d.preparo, d.segredos,
    ]);
    for (const [i, texto] of d.ingredientes.entries()) {
      await db.execute("INSERT INTO ingrediente (id_memoria, ordem, texto) VALUES (?, ?, ?)", [idMemoria, i, texto]);
    }
  } else if (tipo === "musica") {
    await db.execute("INSERT INTO musica (id_memoria, artista, porque, lembranca, quem_ouvia, momento) VALUES (?, ?, ?, ?, ?, ?)", [
      idMemoria, d.artista, d.porque, d.lembranca, d.quemOuvia, d.momento,
    ]);
  } else if (tipo === "video") {
    await db.execute("INSERT INTO video (id_memoria, contexto) VALUES (?, ?)", [idMemoria, d.contexto]);
  } else if (tipo === "conselho") {
    await db.execute("INSERT INTO conselho (id_memoria, frase, guardado_para) VALUES (?, ?, ?)", [idMemoria, d.frase, d.guardadoPara]);
  }
}
