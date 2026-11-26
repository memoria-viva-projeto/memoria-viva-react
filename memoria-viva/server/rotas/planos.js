// Catálogo de planos (público: a tela de cadastro mostra os planos antes do login).
//   GET /api/planos   os planos, do menor para o maior, com preço, limites e textos
// O plano da própria conta e a troca simulada ficam em rotas/conta.js (exigem login).
import { Router } from "express";
import * as planos from "../servicos/planos.js";

export function rotasPlanos(pool) {
  const r = Router();
  r.get("/", async (_req, res) => {
    res.json(await planos.listar(pool));
  });
  return r;
}
