// Liga o servidor: lê a configuração, conecta no banco e abre a porta.
// Rodar: npm run api
import { criarApp } from "./app.js";
import { lerConfig } from "./config.js";
import { criarPool } from "./db.js";

let config;
try {
  config = lerConfig();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const pool = criarPool(config.banco);
const app = criarApp({ pool, config });

const servidor = app.listen(config.porta, () => {
  console.log(`API do Memória Viva em http://localhost:${config.porta} (banco: ${config.banco.database})`);
  console.log(`Confira: http://localhost:${config.porta}/api/saude`);
});

// Ctrl+C: fecha a porta e as conexões com o banco antes de sair
const desligar = () => servidor.close(() => pool.end().finally(() => process.exit(0)));
process.on("SIGINT", desligar);
process.on("SIGTERM", desligar);
