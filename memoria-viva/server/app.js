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
import { rotasPessoas } from "./rotas/pessoas.js";
import { rotasConta } from "./rotas/conta.js";
import { rotasConvites } from "./rotas/convites.js";
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
  // 1 MB: cabe a maior memória que a validação aceita (história + preparo + segredos com acentos).
  // Arquivos (fotos, vídeos) não passam por aqui.
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(carregarSessao(pool, config));

  app.use("/api/saude", rotasSaude(pool));
  app.use("/api/auth", rotasAuth(pool, config, { limiteTentativas }));
  app.use("/api/conta", rotasConta(pool, config, { limiteTentativas }));
  // a pesquisa de músicas que já existia (api/musica.js), agora também servida por este servidor
  app.get("/api/musica", (req, res) => musica(req, res, config.youtubeChave));
  app.use("/api", rotasMemorias(pool));
  app.use("/api", rotasPessoas(pool));
  app.use("/api", rotasConvites(pool, { limiteTentativas }));

  app.use("/api", (_req, _res, next) => next(naoEncontrado("Este endereço da API não existe.")));
  app.use(tratarErros);
  return app;
}
