// Rotas do código de convite da família (todas exigem login):
//   GET    /api/familias/:idFamilia/convite   o código, quantos entraram e o limite do plano (só a dona)
//   POST   /api/familias/:idFamilia/convite   gera ou troca o código; o antigo para de valer (só a dona)
//   DELETE /api/familias/:idFamilia/convite   desliga os convites (só a dona)
//   POST   /api/convites/conferir             { codigo } → de qual família é (antes de entrar)
//   POST   /api/convites/entrar               { codigo } → entra na família como membro
// Conferir e entrar têm limite de tentativas, como o login: ninguém fica chutando códigos.
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { ErroApi, naoEncontrado } from "../erros.js";
import { exigirLogin } from "../middleware/sessao.js";
import * as servico from "../servicos/convites.js";
import { Codigo } from "../validacao/convites.js";
import { Id } from "../validacao/memorias.js";

const FAMILIA = "Não encontramos esta família na sua conta.";
const idDa = (valor) => {
  const r = Id.safeParse(valor);
  if (!r.success) throw naoEncontrado(FAMILIA);
  return r.data;
};

export function rotasConvites(pool, { limiteTentativas = 10 } = {}) {
  const r = Router();
  const limite = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: limiteTentativas,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new ErroApi(429, "MUITAS_TENTATIVAS", "Muitas tentativas seguidas. Espere 15 minutos e tente de novo.")),
  });

  r.get("/familias/:idFamilia/convite", exigirLogin, async (req, res) => {
    res.json(await servico.ver(pool, { idUsuario: req.sessao.idUsuario, idFamilia: idDa(req.params.idFamilia) }));
  });

  r.post("/familias/:idFamilia/convite", exigirLogin, async (req, res) => {
    res.json(await servico.gerar(pool, { idUsuario: req.sessao.idUsuario, idFamilia: idDa(req.params.idFamilia) }));
  });

  r.delete("/familias/:idFamilia/convite", exigirLogin, async (req, res) => {
    await servico.desligar(pool, { idUsuario: req.sessao.idUsuario, idFamilia: idDa(req.params.idFamilia) });
    res.status(204).end();
  });

  // sem login: quem está se cadastrando confere o código antes de criar a conta
  r.post("/convites/conferir", limite, async (req, res) => {
    const { codigo } = Codigo.parse(req.body ?? {});
    res.json(await servico.conferir(pool, { codigo }));
  });

  r.post("/convites/entrar", exigirLogin, limite, async (req, res) => {
    const { codigo } = Codigo.parse(req.body ?? {});
    res.status(201).json(await servico.entrar(pool, { idUsuario: req.sessao.idUsuario, codigo }));
  });

  return r;
}
