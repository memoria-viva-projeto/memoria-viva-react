// Rotas da própria conta (exigem login):
//   PATCH /api/conta/ajustes   ajustes de acessibilidade (tamanho do texto, aparência, contraste, movimento)
// O perfil (nome, cidades, história, gostos...) fica na pessoa "dona": PATCH /api/pessoas/:idPessoa.
import { Router } from "express";
import * as usuarios from "../dados/usuarios.js";
import { exigirLogin } from "../middleware/sessao.js";
import { resumo } from "../servicos/auth.js";
import { Ajustes } from "../validacao/auth.js";

export function rotasConta(pool) {
  const r = Router();
  r.patch("/ajustes", exigirLogin, async (req, res) => {
    const ajustes = Ajustes.parse(req.body ?? {});
    await usuarios.mudarAjustes(pool, req.sessao.idUsuario, ajustes);
    res.json((await resumo(pool, req.sessao.idUsuario)).usuario.ajustes);
  });
  return r;
}
