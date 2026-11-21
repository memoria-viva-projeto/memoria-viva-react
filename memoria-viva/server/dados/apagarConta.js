// SQL para apagar uma conta de vez (depois dos 30 dias para desistir). Quem decide QUANDO é servicos/apagarConta.js.
//
// O que some: a conta (usuario, e as sessões junto), as famílias que ela criou (é a dona) e tudo dentro delas:
// memórias, pessoas da árvore, laços, gostos e arquivos.
// O que fica: nas famílias de OUTRAS pessoas em que ela entrou pelo código, a pessoa continua na árvore
// (é a lembrança daquela família), mas sem conta ligada: ninguém mais entra por ela.
//
// As chaves estrangeiras do banco não apagam em cascata, então a ordem importa: primeiro o que aponta,
// depois o que é apontado. Tudo roda numa transação só (quem chama abre): ou some tudo, ou nada.
import { locaisDe } from "./arquivos.js";

/** "?, ?, ?" para usar em IN (...). */
const marcas = (ids) => ids.map(() => "?").join(", ");

async function ids(db, sql, params) {
  const [linhas] = await db.execute(sql, params);
  return [...new Set(linhas.map((l) => l.id).filter((v) => v != null))];
}

/** DELETE/UPDATE "... IN (lista)", pulando quando a lista está vazia. */
async function emLista(db, sql, lista) {
  if (!lista.length) return;
  await db.execute(sql.replace("(?)", `(${marcas(lista)})`), lista);
}

/** O que a pessoa precisa saber antes de pedir: o que vai sumir e quem perde o acesso. */
export async function resumoParaApagar(db, idUsuario) {
  const [donas] = await db.execute(
    `SELECT f.id_familia, f.nome,
            (SELECT COUNT(*) FROM memoria m WHERE m.id_familia = f.id_familia) AS memorias,
            (SELECT COUNT(*) FROM pessoa p
              WHERE p.id_familia = f.id_familia AND p.id_usuario IS NOT NULL AND p.id_usuario <> ?
                AND p.removida_em IS NULL) AS membros
       FROM familia f
      WHERE f.criado_por = ?
      ORDER BY f.id_familia`,
    [idUsuario, idUsuario],
  );
  const [[outras]] = await db.execute(
    `SELECT COUNT(DISTINCT p.id_familia) AS n
       FROM pessoa p JOIN familia f ON f.id_familia = p.id_familia
      WHERE p.id_usuario = ? AND f.criado_por <> ? AND p.removida_em IS NULL`,
    [idUsuario, idUsuario],
  );
  return {
    familias: donas.map((f) => ({ nome: f.nome, memorias: Number(f.memorias), membros: Number(f.membros) })),
    outrasFamilias: Number(outras.n),
  };
}

/** Apaga a conta e tudo que é dela. Use dentro de emTransacao. */
export async function apagarDeVez(conn, idUsuario) {
  // trava a conta: se duas faxinas rodarem juntas, a segunda espera e não acha mais nada
  const [[u]] = await conn.execute("SELECT id_usuario FROM usuario WHERE id_usuario = ? FOR UPDATE", [idUsuario]);
  if (!u) return null;

  const F = await ids(conn, "SELECT id_familia AS id FROM familia WHERE criado_por = ?", [idUsuario]);
  const lista = (sql, l) => (l.length ? ids(conn, sql.replace("(?)", `(${marcas(l)})`), l) : []);

  // o que existe dentro dessas famílias
  const M = await lista("SELECT id_memoria AS id FROM memoria WHERE id_familia IN (?)", F);
  const P = await lista("SELECT id_pessoa AS id FROM pessoa WHERE id_familia IN (?)", F);
  const I = await lista("SELECT id_item AS id FROM item_memoria WHERE id_memoria IN (?)", M);

  // arquivos ficam numa tabela própria: guarda quais eram, para apagar no fim
  const A = [
    ...(await lista("SELECT id_capa AS id FROM memoria WHERE id_memoria IN (?)", M)),
    ...(await lista("SELECT id_arquivo AS id FROM item_memoria WHERE id_item IN (?)", I)),
    ...(await lista("SELECT id_foto AS id FROM pessoa WHERE id_pessoa IN (?)", P)),
  ];

  // 1. o que aponta para as memórias e para os itens
  await emLista(conn, "DELETE FROM sugestao_ia WHERE id_memoria IN (?)", M);
  await emLista(conn, "UPDATE sugestao_ia SET respondida_por = NULL WHERE respondida_por IN (?)", P);
  await emLista(conn, "DELETE FROM marcacao WHERE id_item IN (?)", I);
  await emLista(conn, "UPDATE marcacao SET id_pessoa = NULL WHERE id_pessoa IN (?)", P);
  await emLista(conn, "DELETE FROM item_etiqueta WHERE id_item IN (?)", I);
  await emLista(conn, "DELETE FROM item_memoria WHERE id_memoria IN (?)", M);
  for (const t of ["memoria_pessoa", "memoria_etiqueta", "comentario", "reacao", "compartilhamento"]) {
    await emLista(conn, `DELETE FROM ${t} WHERE id_memoria IN (?)`, M);
  }
  // comentários, reações e compartilhamentos FEITOS por pessoas dessas famílias (se houver em outro lugar)
  for (const t of ["comentario", "reacao", "compartilhamento"]) {
    await emLista(conn, `DELETE FROM ${t} WHERE id_pessoa IN (?)`, P);
  }
  await emLista(conn, "UPDATE memoria_pessoa SET id_pessoa = NULL WHERE id_pessoa IN (?)", P);

  // 2. as memórias
  await emLista(conn, "DELETE FROM memoria WHERE id_memoria IN (?)", M);

  // 3. a árvore: laços, convites antigos, gostos e pessoas
  await emLista(conn, "DELETE FROM laco WHERE id_familia IN (?)", F);
  await emLista(conn, "DELETE FROM convite WHERE id_familia IN (?)", F);
  if (P.length) {
    await conn.execute(`DELETE FROM convite WHERE id_pessoa IN (${marcas(P)}) OR convidado_por IN (${marcas(P)})`, [...P, ...P]);
  }
  await emLista(conn, "DELETE FROM pessoa_gosto WHERE id_pessoa IN (?)", P);
  await emLista(conn, "DELETE FROM pessoa WHERE id_familia IN (?)", F);

  // 4. arquivos que eram dessas memórias e pessoas
  // arquivos: os destas memórias e pessoas, os do acervo (inclusive enviados e nunca usados) e os enviados por ela
  const todosA = [...new Set([
    ...A,
    ...(await lista("SELECT id_arquivo AS id FROM arquivo WHERE id_familia IN (?)", F)),
    ...(await ids(conn, "SELECT id_arquivo AS id FROM arquivo WHERE enviado_por = ?", [idUsuario])),
  ])];
  const locais = todosA.length
    ? (await conn.query(`SELECT subpasta, nome_arquivo, nome_miniatura FROM arquivo WHERE id_arquivo IN (${marcas(todosA)})`, todosA))[0]
        .flatMap(locaisDe)
    : [];
  await emLista(conn, "DELETE FROM arquivo WHERE id_arquivo IN (?)", todosA);

  // 5. as famílias
  await emLista(conn, "DELETE FROM familia WHERE id_familia IN (?)", F);

  // 6. nas famílias de outras pessoas: continua na árvore, mas sem conta (e sem papel de conta)
  await conn.execute("UPDATE pessoa SET id_usuario = NULL, papel = NULL WHERE id_usuario = ?", [idUsuario]);

  // 7. a conta (as sessões vão junto: ON DELETE CASCADE)
  await conn.execute("DELETE FROM usuario WHERE id_usuario = ?", [idUsuario]);
  return { locais }; // os arquivos do armazenamento para apagar DEPOIS da transação (se falhar, a faxina apaga)
}
