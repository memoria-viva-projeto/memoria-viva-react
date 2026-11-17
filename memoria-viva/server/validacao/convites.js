// O código de convite que chega na tela. O formato é conferido no serviço (normalizar): aqui só o básico.
import { z } from "zod";

export const codigo = z
  .string({ error: "Escreva o código da família." })
  .trim()
  .min(1, "Escreva o código da família.")
  .max(40, "Este código é longo demais. Confira com quem te convidou.");

export const Codigo = z.object({ codigo }).strict();
