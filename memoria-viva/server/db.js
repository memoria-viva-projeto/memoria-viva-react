// Conexão com o MySQL.
// Um "pool" mantém algumas conexões abertas e empresta uma para cada consulta: é mais rápido
// do que abrir e fechar uma conexão a cada requisição.
//
// Regra de ouro: valores do usuário SEMPRE vão como parâmetro (o "?"), nunca colados no texto do SQL.
//   certo:  db.execute("SELECT * FROM usuario WHERE email = ?", [email])
//   errado: db.execute(`SELECT * FROM usuario WHERE email = '${email}'`)   ← injeção de SQL
import mysql from "mysql2/promise";

export function criarPool(banco) {
  const pool = mysql.createPool({
    ...banco,
    charset: "utf8mb4",
    connectionLimit: 10,
    waitForConnections: true,
    dateStrings: false,
    timezone: "Z", // datas lidas e gravadas como UTC
  });
  // Cada conexão nova fala em UTC: assim o DEFAULT CURRENT_TIMESTAMP das tabelas (criada_em...)
  // fica no mesmo fuso que o UTC_TIMESTAMP() usado nas sessões, qualquer que seja o fuso do computador.
  pool.pool.on("connection", (conn) => conn.query("SET time_zone = '+00:00'"));
  return pool;
}

/**
 * Roda `fn` dentro de uma transação: ou tudo dá certo (commit), ou nada fica gravado (rollback).
 * Usado, por exemplo, no cadastro, que cria conta + família + pessoa de uma vez.
 */
export async function emTransacao(pool, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(conn);
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
