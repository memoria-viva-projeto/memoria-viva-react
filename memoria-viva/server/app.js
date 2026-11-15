// Monta o servidor Express: middlewares, rotas e tratamento de erros.
// Não abre porta nenhuma (isso é o index.js): assim os testes usam o app direto, sem servidor rodando.
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import musica from "../api/musica.js";
import { naoEncontrado, tratarErros } from "./erros.js";
import { carregarSessao } from "./middleware/sessao.js";
import { rotasAuth } from "./rotas/auth.js";
import { rotasMemorias } from "./rotas/memorias.js";
import { rotasSaude } from "./rotas/saude.js";

export function criarApp({ pool, config, limiteTentativas } = {}) {
  const app = express();
  app.disable("x-powered-by"); // não anuncia qual servidor é

  // Log de cada requisição: método, caminho, status e tempo. Sem corpo, sem query, sem cookies.
  if (config.ambiente !== "test") {
    app.use((req, res, next) => {
      const inicio = process.hrtime.bigint();
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
        console.log(`${req.method} ${req.baseUrl}${req.path} ${res.statusCode} ${ms.toFixed(0)}ms`);
      });
      next();
    });
  }

  // CORS: só estes endereços podem chamar a API a partir do navegador, levando o cookie junto.
  // (Com o proxy do Vite, a tela e a API ficam no mesmo endereço; isto vale para chamadas diretas.)
  app.use(cors({ origin: config.corsOrigens, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(carregarSessao(pool, config));

  app.use("/api/saude", rotasSaude(pool));
  app.use("/api/auth", rotasAuth(pool, config, { limiteTentativas }));
  // a pesquisa de músicas que já existia (api/musica.js), agora também servida por este servidor
  app.get("/api/musica", (req, res) => musica(req, res, config.youtubeChave));
  app.use("/api", rotasMemorias(pool));

  app.use("/api", (_req, _res, next) => next(naoEncontrado("Este endereço da API não existe.")));
  app.use(tratarErros);
  return app;
}
