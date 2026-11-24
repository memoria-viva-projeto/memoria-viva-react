// npm run db:verificar — só OLHA o MySQL configurado no .env.local e diz o que encontrou.
// Não altera nada. Mostra nomes de tabelas e quantidades de linhas, nunca o conteúdo delas.
import { lerConfig } from "./config.js";
import { conectarServidor, tabelasDaBase } from "./migracoes.js";

const config = (() => {
  try {
    return lerConfig();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
const nome = config.banco.database;
const base = await tabelasDaBase();

let conn;
try {
  conn = await conectarServidor(config.banco);
} catch (e) {
  console.error(`✖ Não consegui entrar no MySQL em ${config.banco.host}:${config.banco.port} (${e.code || e.message}).`);
  console.error("  Confira DB_USUARIO, DB_SENHA e se o serviço MySQL80 está rodando.");
  process.exit(1);
}

try {
  console.log(`MySQL ${(await conn.query("SELECT VERSION() AS v"))[0][0].v} em ${config.banco.host}:${config.banco.port}\n`);

  // 1. Em quais bancos existem tabelas com nomes do Memória Viva? (o script original não tinha USE,
  //    então as tabelas podem ter ido parar em outro banco)
  const [onde] = await conn.query(
    `SELECT table_schema AS banco, COUNT(*) AS n FROM information_schema.tables
      WHERE table_name IN (?) AND table_schema NOT IN ('mysql','sys','information_schema','performance_schema')
      GROUP BY table_schema ORDER BY n DESC`,
    [base],
  );
  console.log("Bancos com tabelas do Memória Viva:");
  if (!onde.length) console.log("  nenhum");
  onde.forEach((o) => console.log(`  ${o.banco}: ${o.n} de ${base.length} tabelas da base${o.banco === nome ? "   ← o do .env.local" : ""}`));

  // 2. O banco configurado
  const [existe] = await conn.query("SELECT 1 FROM information_schema.schemata WHERE schema_name = ?", [nome]);
  console.log(`\nBanco configurado (DB_NOME): ${nome}`);
  if (!existe.length) {
    console.log("  não existe.\n\nConclusão: pode criar do zero com  npm run db:migrar");
    process.exit(0);
  }

  const [tabs] = await conn.query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name",
    [nome],
  );
  const nomes = tabs.map((r) => r.t);
  let totalLinhas = 0;
  console.log(`  ${nomes.length} tabelas:`);
  for (const t of nomes) {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${nome}\`.\`${t}\``);
    if (t !== "plano" && t !== "migracao_aplicada") totalLinhas += Number(n);
    console.log(`    ${t.padEnd(22)} ${String(n).padStart(6)} linhas`);
  }

  const faltam = base.filter((t) => !nomes.includes(t));
  const [col] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = 'usuario' AND column_name = 'id_plano'",
    [nome],
  );
  let regs = [];
  if (nomes.includes("migracao_aplicada")) [regs] = await conn.query(`SELECT nome FROM \`${nome}\`.migracao_aplicada ORDER BY nome`);

  console.log("\nConclusão:");
  if (nomes.length === 0) console.log("  O banco existe, mas está vazio. Pode rodar  npm run db:migrar");
  else if (regs.length) console.log(`  Já usa migrações (${regs.map((r) => r.nome).join(", ")}). Rode  npm run db:migrar  para aplicar o que faltar.`);
  else if (!faltam.length && col.length) {
    console.log(`  Tem o esquema base completo, criado sem migrações. Há ${totalLinhas} linhas de dados (fora o catálogo de planos).`);
    console.log("  Se for isso mesmo, rode  npm run db:marcar-base  e depois  npm run db:migrar  (nada é apagado).");
  } else {
    if (faltam.length) console.log(`  Faltam tabelas da base: ${faltam.join(", ")}.`);
    if (!col.length && nomes.includes("usuario")) console.log("  usuario não tem id_plano: parece a versão antiga do esquema, sem planos.");
    console.log("  NÃO rode db:marcar-base. Mostre esta saída para preparar uma migração de ajuste.");
  }
} finally {
  await conn.end();
}
