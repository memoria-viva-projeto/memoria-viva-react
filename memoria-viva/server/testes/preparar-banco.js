// Roda uma vez antes de todos os testes: recria o banco DE TESTE do zero e aplica as migrações.
// Só mexe no banco cujo nome termina em "_teste" (DB_NOME_TESTE). O seu banco de verdade não é tocado.
// Se não houver MySQL configurado, avisa e os testes de banco são pulados (os outros rodam).
import { lerConfig } from "../config.js";
import { conectarServidor, migrar } from "../migracoes.js";

export default async function preparar({ provide }) {
  try {
    process.loadEnvFile(process.env.MV_ENV_ARQUIVO || ".env.local");
  } catch {
    /* sem arquivo */
  }
  process.env.NODE_ENV = "test";

  let config;
  try {
    config = lerConfig();
  } catch (e) {
    console.warn(`\n⚠ Testes de banco PULADOS: ${e.message.split("\n")[0]}\n`);
    provide("temBanco", false);
    return;
  }

  const nome = config.banco.database;
  if (!/_teste$/.test(nome)) throw new Error(`Por segurança, o banco de teste precisa terminar em _teste (veio "${nome}").`);

  try {
    const conn = await conectarServidor(config.banco);
    await conn.query(`DROP DATABASE IF EXISTS \`${nome}\``); // só o banco _teste
    await conn.end();
    await migrar(config.banco, { log: () => {} });
    provide("temBanco", true);
  } catch (e) {
    console.warn(`\n⚠ Testes de banco PULADOS: não consegui preparar ${nome} (${e.code || e.message}).\n`);
    provide("temBanco", false);
  }
}
