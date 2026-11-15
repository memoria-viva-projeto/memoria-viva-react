// Rotas de conta:
//   POST /api/auth/cadastro   cria conta + família e já entra
//   POST /api/auth/entrar     confere e-mail e senha e entra
//   GET  /api/auth/sessao     quem está logado (401 se ninguém)
//   POST /api/auth/sair       encerra a sessão
// A rota só traduz HTTP ↔ regras: valida o corpo, chama o serviço, põe ou tira o cookie.
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { ErroApi } from "../erros.js";
import { COOKIE, exigirLogin, opcoesCookie } from "../middleware/sessao.js";
import * as auth from "../servicos/auth.js";
import { Cadastro, Entrar } from "../validacao/auth.js";

export function rotasAuth(pool, config, { limiteTentativas = 10 } = {}) {
  const r = Router();

  // No máximo N tentativas de entrar/cadastrar a cada 15 minutos por endereço: impede testar senhas em massa.
  const limite = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limiteTentativas,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new ErroApi(429, "MUITAS_TENTATIVAS", "Muitas tentativas seguidas. Espere 15 minutos e tente de novo.")),
  });

  r.post("/cadastro", limite, async (req, res) => {
    const dados = Cadastro.parse(req.body ?? {});
    const { token, conta } = await auth.cadastrar(pool, config, dados);
    res.cookie(COOKIE, token, opcoesCookie(config));
    res.status(201).json(conta);
  });

  r.post("/entrar", limite, async (req, res) => {
    const dados = Entrar.parse(req.body ?? {});
    const { token, conta } = await auth.entrar(pool, config, dados);
    res.cookie(COOKIE, token, opcoesCookie(config));
    res.json(conta);
  });

  r.get("/sessao", exigirLogin, async (req, res) => {
    const conta = await auth.resumo(pool, req.sessao.idUsuario);
    if (!conta) throw new ErroApi(401, "NAO_AUTENTICADO", "Entre na sua conta para continuar.");
    res.json(conta);
  });

  // Sair funciona mesmo sem sessão (não há o que encerrar): sempre 204, sempre limpa o cookie.
  r.post("/sair", async (req, res) => {
    await auth.sair(pool, req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { ...opcoesCookie(config), maxAge: undefined });
    res.status(204).end();
  });

  return r;
}
