// npm run db:migrar        → cria o banco (se não existir) e aplica as migrações pendentes
// npm run db:marcar-base   → para um banco que alguém já criou com o script base: só anota a base como aplicada
import { lerConfig } from "./config.js";
import { migrar } from "./migracoes.js";

const marcarBase = process.argv.includes("--marcar-base");

try {
  const config = lerConfig();
  console.log(`Banco: ${config.banco.database} em ${config.banco.host}:${config.banco.port}`);
  await migrar(config.banco, { marcarBase });
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exitCode = 1;
}
