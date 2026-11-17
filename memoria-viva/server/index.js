// Liga o servidor: lê a configuração, conecta no banco e abre a porta.
// Rodar: npm run api
import { criarApp } from "./app.js";
import { lerConfig } from "./config.js";
import { criarPool } from "./db.js";
import { apagarTodasVencidas } from "./dados/sessoes.js";
import { apagarVencidas } from "./servicos/apagarConta.js";

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

// Faxina das sessões: uma sessão vencida já não abre nada, então a linha no banco só ocupa espaço.
// Roda ao ligar e a cada 6 horas. No log vai só a quantidade (nunca tokens ou contas).
const SEIS_HORAS = 6 * 60 * 60 * 1000;
const faxina = () =>
  apagarTodasVencidas(pool)
    .then((n) => n && console.log(`Faxina: ${n} sessões vencidas apagadas.`))
    .catch((e) => console.error(`Faxina das sessões falhou (${e.code || e.name}).`));
faxina();
setInterval(faxina, SEIS_HORAS).unref();

// Contas com pedido para apagar cujo prazo de 30 dias acabou: apaga de vez. Roda ao ligar e a cada hora.
// No log vai só a quantidade.
const UMA_HORA = 60 * 60 * 1000;
const apagarContas = () =>
  apagarVencidas(pool)
    .then(({ apagadas }) => apagadas && console.log(`Contas apagadas (prazo de 30 dias acabou): ${apagadas}.`))
    .catch((e) => console.error(`Apagar contas vencidas falhou (${e.code || e.name}).`));
apagarContas();
setInterval(apagarContas, UMA_HORA).unref();

// Ctrl+C: fecha a porta e as conexões com o banco antes de sair
const desligar = () => servidor.close(() => pool.end().finally(() => process.exit(0)));
process.on("SIGINT", desligar);
process.on("SIGTERM", desligar);
