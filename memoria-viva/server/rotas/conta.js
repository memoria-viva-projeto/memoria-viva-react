// Rotas da própria conta (exigem login):
//   PATCH /api/conta/ajustes   ajustes de acessibilidade (tamanho do texto, aparência, contraste, movimento)
//   GET   /api/conta/apagar    o que vai sumir se a conta for apagada (para a tela avisar antes)
//   POST  /api/conta/apagar    { senha } → pede para apagar: a conta some de vez em 30 dias; sai de todos os aparelhos
// O perfil (nome, cidades, história, gostos...) fica na pessoa "dona": PATCH /api/pessoas/:idPessoa.
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import * as usuarios from "../dados/usuarios.js";
import { ErroApi } from "../erros.js";
import { COOKIE, exigirLogin, opcoesCookie } from "../middleware/sessao.js";
import * as apagarConta from "../servicos/apagarConta.js";
import { resumo } from "../servicos/auth.js";
import { Ajustes, ApagarConta } from "../validacao/auth.js";

export function rotasConta(pool, config, { limiteTentativas = 10 } = {}) {
  const r = Router();

  // pedir para apagar confere a senha: tem limite de tentativas, como o login
  const limite = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limiteTentativas,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new ErroApi(429, "MUITAS_TENTATIVAS", "Muitas tentativas seguidas. Espere 15 minutos e tente de novo.")),
  });

  r.patch("/ajustes", exigirLogin, async (req, res) => {
    const ajustes = Ajustes.parse(req.body ?? {});
    await usuarios.mudarAjustes(pool, req.sessao.idUsuario, ajustes);
    res.json((await resumo(pool, req.sessao.idUsuario)).usuario.ajustes);
  });

  r.get("/apagar", exigirLogin, async (req, res) => {
    res.json(await apagarConta.resumo(pool, req.sessao.idUsuario));
  });

  r.post("/apagar", exigirLogin, limite, async (req, res) => {
    const { senha } = ApagarConta.parse(req.body ?? {});
    const { apagarEm } = await apagarConta.pedir(pool, { idUsuario: req.sessao.idUsuario, senha });
    res.clearCookie(COOKIE, { ...opcoesCookie(config), maxAge: undefined }); // as sessões já foram encerradas
    res.json({ apagarEm });
  });

  return r;
}
