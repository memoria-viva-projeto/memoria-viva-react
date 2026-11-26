// Regras dos dados que chegam na escolha de plano (troca simulada e cadastro).
// Se o plano existe e se o ciclo vale para ele, quem confere é servicos/planos.js (precisa do banco).
import { z } from "zod";

export const idPlano = z.coerce
  .number({ error: "Escolha um plano." })
  .int("Escolha um plano da lista.")
  .positive("Escolha um plano da lista.");

export const ciclo = z.enum(["mensal", "anual"], { error: "Escolha mensal ou anual." });

export const MudarPlano = z.object({
  idPlano,
  ciclo: ciclo.optional(), // pago sem ciclo = mensal; Grátis ignora
});
