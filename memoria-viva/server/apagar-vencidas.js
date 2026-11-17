// npm run db:apagar-vencidas
//   Apaga AGORA as contas cujo prazo de 30 dias para desistir já acabou. O servidor já faz isso sozinho
//   (ao ligar e a cada hora); este comando é para rodar na mão, sem esperar.
//   Só apaga quem pediu E cujo prazo acabou: nenhuma outra conta é tocada.
import { lerConfig } from "./config.js";
import { criarPool } from "./db.js";
import { apagarVencidas } from "./servicos/apagarConta.js";

let pool;
try {
  pool = criarPool(lerConfig().banco);
  const { apagadas, falhas } = await apagarVencidas(pool);
  console.log(`✔ Contas apagadas: ${apagadas}.${falhas ? ` Falharam: ${falhas} (veja o erro acima).` : ""}`);
  if (falhas) process.exitCode = 1;
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
