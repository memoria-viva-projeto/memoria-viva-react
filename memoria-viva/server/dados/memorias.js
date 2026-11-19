// SQL das memórias.
import { dataDe } from "../servicos/datas.js";
//
// REGRA DE ACESSO (aprovada):
//   - a DONA do acervo vê, guarda, muda e apaga as memórias dele;
//   - um MEMBRO (quem entrou na família pelo código de convite) só VÊ, e não vê os rascunhos da dona.
//   "dona"   = pessoa com papel 'dona' na família, ligada à conta logada e não removida da árvore.
//   "membro" = qualquer pessoa da família ligada à conta logada e não removida (a dona também é membro).
// Compartilhamento, parentesco, marcação em foto e plano NÃO dão acesso. A checagem está aqui,
// dentro do próprio SQL (o JOIN com a dona ou com "eu"), para que nenhuma rota leia uma memória sem passar por ela.

const SQL_DONA = "dona.papel = 'dona' AND dona.removida_em IS NULL AND dona.id_usuario = ?";
const SQL_MEMBRO = "eu.removida_em IS NULL AND eu.id_usuario = ?";

/** id_pessoa da conta como dona desta família, ou null (não é dona / família não existe). */
export async function idDonaDaFamilia(db, { idFamilia, idUsuario }) {
  const [l] = await db.execute(
    `SELECT dona.id_pessoa FROM pessoa dona WHERE dona.id_familia = ? AND ${SQL_DONA} LIMIT 1`,
    [idFamilia, idUsuario],
  );
  return l[0]?.id_pessoa ?? null;
}

/** O lugar da conta nesta família: { idPessoa, papel }, ou null (não é da família / família não existe). */
export async function papelNaFamilia(db, { idFamilia, idUsuario }) {
  const [l] = await db.execute(
    `SELECT eu.id_pessoa, eu.papel FROM pessoa eu WHERE eu.id_familia = ? AND ${SQL_MEMBRO}
      ORDER BY eu.papel = 'dona' DESC LIMIT 1`,
    [idFamilia, idUsuario],
  );
  return l[0] ? { idPessoa: l[0].id_pessoa, papel: l[0].papel } : null;
}

// colunas de uma memória (as mesmas para abrir uma e para listar várias)
const COLUNAS = `m.id_memoria, m.id_familia, m.tipo, m.titulo, m.descricao, m.lugar, m.status,
            m.criada_em, m.confirmada_em, m.atualizada_em, m.id_capa, m.versao,
            autor.id_pessoa AS autor_id, autor.nome AS autor_nome, autor.nome_completo AS autor_nome_completo,
            d.modo, d.dia, d.mes, d.ano, d.ano_fim, d.aprox`;

/** A memória, só se a conta for dona do acervo dela. Senão, null (para quem pergunta, é como se não existisse). */
export async function buscarSeDona(db, { idMemoria, idUsuario }) {
  const [l] = await db.execute(
    `SELECT ${COLUNAS}
       FROM memoria m
       JOIN pessoa dona  ON dona.id_familia = m.id_familia AND ${SQL_DONA}
       JOIN pessoa autor ON autor.id_pessoa = m.enviada_por
       LEFT JOIN data_flexivel d ON d.id_data = m.id_data
      WHERE m.id_memoria = ?`,
    [idUsuario, idMemoria],
  );
  return l[0] || null;
}

/**
 * A memória, se a conta for da família dela (dona ou membro). Membro não vê rascunho. Senão, null.
 * Só para LER: para mudar ou apagar, use buscarSeDona.
 */
export async function buscarSeMembro(db, { idMemoria, idUsuario }) {
  const [l] = await db.execute(
    `SELECT ${COLUNAS}
       FROM memoria m
       JOIN pessoa eu    ON eu.id_familia = m.id_familia AND ${SQL_MEMBRO} AND (eu.papel = 'dona' OR m.status <> 'rascunho')
       JOIN pessoa autor ON autor.id_pessoa = m.enviada_por
       LEFT JOIN data_flexivel d ON d.id_data = m.id_data
      WHERE m.id_memoria = ?
      LIMIT 1`,
    [idUsuario, idMemoria],
  );
  return l[0] || null;
}

/**
 * Lista do acervo, mais nova primeiro. Chame só depois de conferir que a conta é da família (papelNaFamilia).
 * comRascunhos: só para a dona.
 */
export async function listarDaFamilia(db, { idFamilia, limite, antesDe, comRascunhos = true }) {
  // LIMIT com número já validado (1 a 100); o resto vai como parâmetro
  const [l] = await db.query(
    `SELECT ${COLUNAS}
       FROM memoria m
       JOIN pessoa autor ON autor.id_pessoa = m.enviada_por
       LEFT JOIN data_flexivel d ON d.id_data = m.id_data
      WHERE m.id_familia = ? ${comRascunhos ? "" : "AND m.status <> 'rascunho'"} ${antesDe ? "AND m.id_memoria < ?" : ""}
      ORDER BY m.id_memoria DESC
      LIMIT ${Number(limite) + 1}`,
    antesDe ? [idFamilia, antesDe] : [idFamilia],
  );
  return l;
}

// ---------- linha da vida ----------
//
// ORDEM (aprovada): pelo COMEÇO do que a pessoa lembra.
//   dia exato → o dia; só mês → o mês; só ano → o ano; década → o primeiro ano; período → o ano em que começa.
//   Empate no mesmo ponto: o mais preciso primeiro (dia, mês, ano, "por volta de", período, década); depois, a ordem
//   em que foram guardadas (id). Memória sem data própria usa a data mais antiga das fotos dela, se houver.
//   Sem nenhuma data (ou "não sei", ou sem ano): grupo "Sem data", no fim, na ordem em que foram guardadas.
// A chave de ordem é calculada aqui, na consulta: nenhuma data inventada é gravada nem mostrada.
//   chave = (ano·10000 + mês·100 + dia)·10 + precisão    (ex.: 12/06/1957 → 195706120; década de 1970 → 197000005)

const chaveDe = (d) => `(CASE WHEN ${d}.id_data IS NULL OR ${d}.modo = 'naosei' OR ${d}.ano IS NULL THEN NULL ELSE
    (${d}.ano * 10000 + IF(${d}.modo IN ('dia', 'mes'), COALESCE(${d}.mes, 0) * 100, 0) + IF(${d}.modo = 'dia', COALESCE(${d}.dia, 0), 0)) * 10
    + CASE ${d}.modo WHEN 'dia' THEN IF(${d}.dia IS NULL, IF(${d}.mes IS NULL, 2, 1), 0)
                     WHEN 'mes' THEN IF(${d}.mes IS NULL, 2, 1)
                     WHEN 'ano' THEN IF(${d}.aprox, 3, 2)
                     WHEN 'periodo' THEN 4
                     ELSE 5 END
  END)`;

const ORDEM = `COALESCE(${chaveDe("d")}, (SELECT MIN(${chaveDe("di")}) FROM item_memoria it
                 JOIN data_flexivel di ON di.id_data = it.id_data WHERE it.id_memoria = m.id_memoria AND it.tipo <> 'youtube'))`;

// a data (da memória ou de uma foto dela) cobre um ano / uma década / um intervalo? (mesma regra dos filtros da tela)
const ANOS_CERTOS = (d) => `${d}.modo IN ('dia', 'mes', 'ano', 'periodo') AND ${d}.ano IS NOT NULL`;
const FIM = (d) => `IF(${d}.modo = 'periodo', COALESCE(${d}.ano_fim, ${d}.ano), ${d}.ano)`;
const cobre = {
  ano: (d) => `(${ANOS_CERTOS(d)} AND ${d}.ano <= ? AND ${FIM(d)} >= ?)`,
  decada: (d) => `((${ANOS_CERTOS(d)} AND ${d}.ano <= ? + 9 AND ${FIM(d)} >= ?) OR (${d}.modo = 'decada' AND ${d}.ano = ?))`,
  intervalo: (d) => `((${ANOS_CERTOS(d)} AND ${d}.ano <= ? AND ${FIM(d)} >= ?) OR (${d}.modo = 'decada' AND ${d}.ano <= ? AND ${d}.ano + 9 >= ?))`,
};
// na memória OU em alguma foto dela
const naMemoriaOuNasFotos = (cond, params) => ({
  sql: `(${cond("d")} OR EXISTS (SELECT 1 FROM item_memoria it JOIN data_flexivel di ON di.id_data = it.id_data
                                   WHERE it.id_memoria = m.id_memoria AND ${cond("di")}))`,
  params: [...params, ...params],
});

function filtrosDaLinha(f) {
  const partes = [];
  const params = [];
  const juntar = ({ sql, params: p }) => { partes.push(sql); params.push(...p); };
  if (f.tipo) juntar({ sql: "m.tipo = ?", params: [f.tipo] });
  if (f.ano) juntar(naMemoriaOuNasFotos(cobre.ano, [f.ano, f.ano]));
  if (f.decada) juntar(naMemoriaOuNasFotos(cobre.decada, [f.decada, f.decada, f.decada]));
  if (f.de != null || f.ate != null) {
    const de = f.de ?? 0, ate = f.ate ?? 9999;
    juntar(naMemoriaOuNasFotos(cobre.intervalo, [ate, de, ate, de]));
  }
  for (const e of f.etiqueta || []) { // várias etiquetas: valem juntas (ex.: Juventude + Natal)
    juntar({
      sql: `(EXISTS (SELECT 1 FROM memoria_etiqueta e WHERE e.id_memoria = m.id_memoria AND e.etiqueta = ?)
             OR EXISTS (SELECT 1 FROM item_memoria it JOIN item_etiqueta ie ON ie.id_item = it.id_item WHERE it.id_memoria = m.id_memoria AND ie.etiqueta = ?))`,
      params: [e, e],
    });
  }
  if (f.pessoa) {
    juntar({
      sql: `(EXISTS (SELECT 1 FROM memoria_pessoa mp WHERE mp.id_memoria = m.id_memoria AND mp.nome_livre = ?)
             OR EXISTS (SELECT 1 FROM item_memoria it JOIN marcacao mc ON mc.id_item = it.id_item WHERE it.id_memoria = m.id_memoria AND mc.nome_livre = ?))`,
      params: [f.pessoa, f.pessoa],
    });
  }
  return { sql: partes.map((p) => ` AND ${p}`).join(""), params };
}

/**
 * Uma página da linha da vida de uma família. Só memórias CONFIRMADAS (rascunho não entra, nem para a dona).
 * Chame só depois de conferir que a conta é da família (papelNaFamilia): a regra de acesso vem ANTES da contagem
 * e da página. depois: { grupo, ordem, id } da última memória da página anterior.
 * Devolve { linhas (memórias completas da página, já na ordem), total, proxima }.
 */
export async function linhaDaFamilia(db, { idFamilia, limite, depois, filtros }) {
  const f = filtrosDaLinha(filtros);
  const base = `FROM memoria m LEFT JOIN data_flexivel d ON d.id_data = m.id_data
                WHERE m.id_familia = ? AND m.status = 'confirmada'${f.sql}`;
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${base}`, [idFamilia, ...f.params]);
  const [chaves] = await db.query(
    `SELECT t.id_memoria, t.grupo, t.ordem FROM (
       SELECT x.id_memoria, IF(x.o IS NULL, 1, 0) AS grupo, COALESCE(x.o, 0) AS ordem
         FROM (SELECT m.id_memoria, ${ORDEM} AS o ${base}) x
     ) t
     ${depois ? "WHERE (t.grupo, t.ordem, t.id_memoria) > (?, ?, ?)" : ""}
     ORDER BY t.grupo, t.ordem, t.id_memoria
     LIMIT ${Number(limite) + 1}`,
    [idFamilia, ...f.params, ...(depois ? [depois.grupo, depois.ordem, depois.id] : [])],
  );
  const temMais = chaves.length > limite;
  const pagina = chaves.slice(0, limite);
  if (!pagina.length) return { linhas: [], total: Number(total), proxima: null };
  const [linhas] = await db.query(
    `SELECT ${COLUNAS} FROM memoria m
       JOIN pessoa autor ON autor.id_pessoa = m.enviada_por
       LEFT JOIN data_flexivel d ON d.id_data = m.id_data
      WHERE m.id_memoria IN (${pagina.map(() => "?").join(", ")})`,
    pagina.map((c) => c.id_memoria),
  );
  const porId = new Map(linhas.map((l) => [l.id_memoria, l]));
  const ultima = pagina[pagina.length - 1];
  return {
    // anoNaLinha: o ano em que a memória entra na linha (o da data dela ou o da foto mais antiga); null = sem data
    linhas: pagina
      .map((c) => ({ ...porId.get(c.id_memoria), semData: c.grupo === 1, anoNaLinha: c.grupo === 1 ? null : Math.floor(Number(c.ordem) / 100000) }))
      .filter((l) => l.id_memoria),
    total: Number(total),
    proxima: temMais ? `${ultima.grupo}.${ultima.ordem}.${ultima.id_memoria}` : null,
  };
}

/**
 * Etiquetas, pessoas e detalhes de várias memórias de uma vez: uma consulta por tabela, não uma por memória
 * (com 100 memórias, são 8 consultas em vez de mais de 300).
 * Devolve Map(id_memoria → { etiquetas, pessoas, detalhes }). Chame só com memórias já liberadas pela regra de acesso.
 */
export async function complementos(db, linhas) {
  const resultado = new Map(linhas.map((m) => [m.id_memoria, { etiquetas: [], pessoas: [], detalhes: null, itens: [] }]));
  if (!linhas.length) return resultado;
  const ids = linhas.map((m) => m.id_memoria);
  const doTipo = (t) => linhas.filter((m) => m.tipo === t).map((m) => m.id_memoria);
  // "?, ?, ?" para a lista de ids (os valores vão como parâmetros)
  const em = async (sql, lista) => (lista.length ? (await db.query(sql.replace("(?)", `(${lista.map(() => "?").join(", ")})`), lista))[0] : []);

  for (const r of await em("SELECT id_memoria, etiqueta FROM memoria_etiqueta WHERE id_memoria IN (?) ORDER BY etiqueta", ids)) {
    resultado.get(r.id_memoria).etiquetas.push(r.etiqueta);
  }
  for (const r of await em("SELECT id_memoria, nome_livre FROM memoria_pessoa WHERE id_memoria IN (?) ORDER BY id_memoria_pessoa", ids)) {
    if (r.nome_livre) resultado.get(r.id_memoria).pessoas.push(r.nome_livre);
  }

  const receitas = doTipo("receita");
  for (const id of receitas) resultado.get(id).detalhes = { quemFazia: null, ocasioes: null, preparo: null, segredos: null, ingredientes: [] };
  for (const r of await em("SELECT id_memoria, quem_fazia, ocasioes, preparo, segredos FROM receita WHERE id_memoria IN (?)", receitas)) {
    Object.assign(resultado.get(r.id_memoria).detalhes, { quemFazia: r.quem_fazia, ocasioes: r.ocasioes, preparo: r.preparo, segredos: r.segredos });
  }
  for (const r of await em("SELECT id_memoria, texto FROM ingrediente WHERE id_memoria IN (?) ORDER BY ordem, id_ingrediente", receitas)) {
    resultado.get(r.id_memoria).detalhes.ingredientes.push(r.texto);
  }

  const musicas = doTipo("musica");
  for (const id of musicas) resultado.get(id).detalhes = { artista: null, porque: null, lembranca: null, quemOuvia: null, momento: null, youtube: null };
  for (const r of await em("SELECT id_memoria, artista, porque, lembranca, quem_ouvia, momento FROM musica WHERE id_memoria IN (?)", musicas)) {
    Object.assign(resultado.get(r.id_memoria).detalhes, { artista: r.artista, porque: r.porque, lembranca: r.lembranca, quemOuvia: r.quem_ouvia, momento: r.momento });
  }
  const yts = await em(
    "SELECT id_memoria, youtube_id, youtube_titulo, youtube_canal FROM item_memoria WHERE tipo = 'youtube' AND id_memoria IN (?) ORDER BY ordem DESC, id_item DESC",
    musicas,
  );
  for (const r of yts) resultado.get(r.id_memoria).detalhes.youtube = { id: r.youtube_id, titulo: r.youtube_titulo, canal: r.youtube_canal }; // fica o primeiro

  const videos = doTipo("video");
  for (const id of videos) resultado.get(id).detalhes = { contexto: null, youtube: null };
  for (const r of await em("SELECT id_memoria, contexto FROM video WHERE id_memoria IN (?)", videos)) resultado.get(r.id_memoria).detalhes.contexto = r.contexto;
  const ytsVideo = await em(
    "SELECT id_memoria, youtube_id, youtube_titulo, youtube_canal FROM item_memoria WHERE tipo = 'youtube' AND id_memoria IN (?) ORDER BY ordem DESC, id_item DESC",
    videos,
  );
  for (const r of ytsVideo) resultado.get(r.id_memoria).detalhes.youtube = { id: r.youtube_id, titulo: r.youtube_titulo, canal: r.youtube_canal };

  // fotos, vídeos e áudios enviados (em ordem), com o que se sabe de cada arquivo, as marcações e as etiquetas
  for (const m of resultado.values()) m.itens = [];
  const itens = await em(
    `SELECT it.id_item, it.id_memoria, it.tipo, it.anexo, it.id_arquivo, it.legenda, it.lugar, it.observacao,
            d.modo, d.dia, d.mes, d.ano, d.ano_fim, d.aprox,
            a.mime, a.largura, a.altura, a.duracao_seg, a.tamanho_bytes, a.chave_miniatura
       FROM item_memoria it
       LEFT JOIN arquivo a ON a.id_arquivo = it.id_arquivo
       LEFT JOIN data_flexivel d ON d.id_data = it.id_data
      WHERE it.tipo <> 'youtube' AND it.id_memoria IN (?)
      ORDER BY it.id_memoria, it.ordem, it.id_item`,
    ids,
  );
  const porItem = new Map();
  for (const r of itens) {
    const it = {
      id: r.id_item,
      idArquivo: r.id_arquivo,
      tipo: r.tipo,
      anexo: Boolean(r.anexo),
      legenda: r.legenda,
      data: dataDe(r),
      lugar: r.lugar,
      observacao: r.observacao,
      etiquetas: [],
      marcas: [],
      // dados do arquivo (null se ele sumiu: a tela mostra "arquivo indisponível")
      arquivo: r.mime ? { mime: r.mime, largura: r.largura, altura: r.altura, duracao: r.duracao_seg, tamanho: Number(r.tamanho_bytes), temMiniatura: Boolean(r.chave_miniatura) } : null,
    };
    porItem.set(r.id_item, it);
    resultado.get(r.id_memoria).itens.push(it);
  }
  const idsItens = [...porItem.keys()];
  for (const r of await em("SELECT id_item, etiqueta FROM item_etiqueta WHERE id_item IN (?) ORDER BY etiqueta", idsItens)) {
    porItem.get(r.id_item).etiquetas.push(r.etiqueta);
  }
  for (const r of await em("SELECT id_item, nome_livre, pos_x, pos_y FROM marcacao WHERE id_item IN (?) ORDER BY id_marcacao", idsItens)) {
    if (r.nome_livre) porItem.get(r.id_item).marcas.push({ nome: r.nome_livre, x: r.pos_x == null ? null : Number(r.pos_x), y: r.pos_y == null ? null : Number(r.pos_y) });
  }

  const conselhos = doTipo("conselho");
  for (const id of conselhos) resultado.get(id).detalhes = { frase: null, guardadoPara: null };
  for (const r of await em("SELECT id_memoria, frase, guardado_para FROM conselho WHERE id_memoria IN (?)", conselhos)) {
    Object.assign(resultado.get(r.id_memoria).detalhes, { frase: r.frase, guardadoPara: r.guardado_para });
  }
  return resultado; // foto e álbum: detalhes null (o conteúdo deles são os itens)
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
    `INSERT INTO memoria (id_familia, tipo, titulo, descricao, id_data, lugar, id_capa, enviada_por, status, confirmada_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${m.status === "confirmada" ? "UTC_TIMESTAMP()" : "NULL"})`,
    [m.idFamilia, m.tipo, m.titulo, m.descricao, m.idData, m.lugar, m.capa ?? null, m.enviadaPor, m.status],
  );
  return r.insertId;
}

export async function criarEtiquetas(db, idMemoria, lista) {
  for (const e of lista) await db.execute("INSERT INTO memoria_etiqueta (id_memoria, etiqueta) VALUES (?, ?)", [idMemoria, e]);
}

export async function criarPessoas(db, idMemoria, nomes) {
  for (const nome of nomes) await db.execute("INSERT INTO memoria_pessoa (id_memoria, nome_livre) VALUES (?, ?)", [idMemoria, nome]);
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
    if (d.youtube) {
      await db.execute(
        "INSERT INTO item_memoria (id_memoria, tipo, youtube_id, youtube_titulo, youtube_canal, ordem) VALUES (?, 'youtube', ?, ?, ?, 0)",
        [idMemoria, d.youtube.id, d.youtube.titulo, d.youtube.canal],
      );
    }
  } else if (tipo === "video") {
    await db.execute("INSERT INTO video (id_memoria, contexto) VALUES (?, ?)", [idMemoria, d.contexto]);
    if (d.youtube) {
      await db.execute(
        "INSERT INTO item_memoria (id_memoria, tipo, youtube_id, youtube_titulo, youtube_canal, ordem) VALUES (?, 'youtube', ?, ?, ?, 0)",
        [idMemoria, d.youtube.id, d.youtube.titulo, d.youtube.canal],
      );
    }
  } else if (tipo === "conselho") {
    await db.execute("INSERT INTO conselho (id_memoria, frase, guardado_para) VALUES (?, ?, ?)", [idMemoria, d.frase, d.guardadoPara]);
  }
}

/**
 * Apaga a memória e tudo o que pertence a ela (itens, pessoas, etiquetas, detalhes, comentários,
 * reações, compartilhamentos, palpites da IA e as datas dela). Não dá para desfazer.
 * Chame só dentro de uma transação e depois de conferir que a conta é dona (servicos/memorias.js).
 */
export async function apagarMemoria(db, idMemoria) {
  const [[m]] = await db.execute("SELECT id_data, id_capa FROM memoria WHERE id_memoria = ? FOR UPDATE", [idMemoria]);
  if (!m) return null;
  const [datasItens] = await db.execute("SELECT id_data FROM item_memoria WHERE id_memoria = ? AND id_data IS NOT NULL", [idMemoria]);
  const datas = [m.id_data, ...datasItens.map((d) => d.id_data)].filter(Boolean);
  const arquivos = await arquivosDaMemoria(db, idMemoria, m.id_capa);

  // primeiro o que aponta para os itens, depois os itens, depois o resto (ordem das chaves estrangeiras)
  await db.execute("DELETE FROM sugestao_ia WHERE id_memoria = ?", [idMemoria]);
  await db.execute("DELETE mc FROM marcacao mc JOIN item_memoria it ON it.id_item = mc.id_item WHERE it.id_memoria = ?", [idMemoria]);
  await db.execute("DELETE ie FROM item_etiqueta ie JOIN item_memoria it ON it.id_item = ie.id_item WHERE it.id_memoria = ?", [idMemoria]);
  for (const tabela of [
    "item_memoria", "memoria_pessoa", "memoria_etiqueta", "ingrediente", "receita", "musica", "video", "conselho",
    "comentario", "reacao", "compartilhamento", "memoria",
  ]) {
    await db.execute(`DELETE FROM ${tabela} WHERE id_memoria = ?`, [idMemoria]); // nome da tabela vem da lista fixa acima
  }
  for (const id of datas) await db.execute("DELETE FROM data_flexivel WHERE id_data = ?", [id]);
  return arquivos; // os arquivos que eram desta memória (quem chama apaga os que não são usados por mais nada)
}

/** Ids dos arquivos de uma memória (itens e capa). */
export async function arquivosDaMemoria(db, idMemoria, idCapa = null) {
  const [l] = await db.execute("SELECT id_arquivo FROM item_memoria WHERE id_memoria = ? AND id_arquivo IS NOT NULL", [idMemoria]);
  return [...new Set([...l.map((x) => x.id_arquivo), idCapa].filter(Boolean))];
}

/** Grava os itens (fotos, vídeos, áudios) na ordem em que vieram. Os arquivos já foram conferidos (servicos/memorias.js). */
export async function criarItens(db, idMemoria, itens) {
  for (const [ordem, it] of itens.entries()) {
    const idData = it.data ? await criarData(db, it.data) : null;
    const [r] = await db.execute(
      `INSERT INTO item_memoria (id_memoria, tipo, anexo, id_arquivo, ordem, legenda, id_data, lugar, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idMemoria, it.tipo, it.anexo, it.idArquivo, ordem, it.legenda, idData, it.lugar, it.observacao],
    );
    for (const e of it.etiquetas) await db.execute("INSERT INTO item_etiqueta (id_item, etiqueta) VALUES (?, ?)", [r.insertId, e]);
    for (const k of it.marcas) {
      await db.execute("INSERT INTO marcacao (id_item, nome_livre, pos_x, pos_y) VALUES (?, ?, ?, ?)", [r.insertId, k.nome, k.x, k.y]);
    }
  }
}

/** Tira os itens com arquivo (não o link do YouTube), com marcações, etiquetas, datas e palpites ligados a eles. */
export async function limparItens(db, idMemoria) {
  const [datas] = await db.execute("SELECT id_data FROM item_memoria WHERE id_memoria = ? AND tipo <> 'youtube' AND id_data IS NOT NULL", [idMemoria]);
  const doItem = "JOIN item_memoria it ON it.id_item = x.id_item WHERE it.id_memoria = ? AND it.tipo <> 'youtube'";
  await db.execute(`DELETE x FROM sugestao_ia x ${doItem}`, [idMemoria]);
  await db.execute(`DELETE x FROM marcacao x ${doItem}`, [idMemoria]);
  await db.execute(`DELETE x FROM item_etiqueta x ${doItem}`, [idMemoria]);
  await db.execute("DELETE FROM item_memoria WHERE id_memoria = ? AND tipo <> 'youtube'", [idMemoria]);
  for (const d of datas) await db.execute("DELETE FROM data_flexivel WHERE id_data = ?", [d.id_data]);
}

// ---------- edição (dentro de transação, depois de conferir a dona) ----------

/** Trava a memória até o fim da transação e devolve tipo, status e data atuais. */
export async function travar(db, idMemoria) {
  const [[m]] = await db.execute("SELECT id_memoria, id_familia, tipo, status, id_data, id_capa, versao FROM memoria WHERE id_memoria = ? FOR UPDATE", [idMemoria]);
  return m || null;
}

/**
 * Troca os campos principais e sobe a versão. confirmada_em: guarda a primeira confirmação.
 * capa: undefined = fica a atual; null = sem capa; número = esse arquivo.
 */
export async function atualizarMemoria(db, idMemoria, m) {
  const comCapa = m.capa !== undefined;
  await db.execute(
    `UPDATE memoria SET titulo = ?, descricao = ?, id_data = ?, lugar = ?, status = ?,
            confirmada_em = IF(? = 'confirmada', COALESCE(confirmada_em, UTC_TIMESTAMP()), NULL),
            ${comCapa ? "id_capa = ?," : ""}
            atualizada_em = UTC_TIMESTAMP(), versao = versao + 1
      WHERE id_memoria = ?`,
    [m.titulo, m.descricao, m.idData, m.lugar, m.status, m.status, ...(comCapa ? [m.capa] : []), idMemoria],
  );
}

/**
 * Tira etiquetas, pessoas e detalhes, para gravar os novos (a edição manda a memória inteira).
 * Dos itens, só o link do YouTube sai: fotos, vídeos e áudios (quando existirem) não são tocados aqui.
 */
export async function limparConteudo(db, idMemoria) {
  await db.execute(
    "DELETE s FROM sugestao_ia s JOIN item_memoria it ON it.id_item = s.id_item WHERE it.id_memoria = ? AND it.tipo = 'youtube'",
    [idMemoria],
  );
  await db.execute("DELETE FROM item_memoria WHERE id_memoria = ? AND tipo = 'youtube'", [idMemoria]);
  for (const tabela of ["memoria_etiqueta", "memoria_pessoa", "ingrediente", "receita", "musica", "video", "conselho"]) {
    await db.execute(`DELETE FROM ${tabela} WHERE id_memoria = ?`, [idMemoria]); // nome da tabela vem da lista fixa acima
  }
}

export async function apagarData(db, idData) {
  if (idData) await db.execute("DELETE FROM data_flexivel WHERE id_data = ?", [idData]);
}
