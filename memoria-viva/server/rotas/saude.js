// GET /api/saude — "o servidor está de pé e fala com o banco?"
// Útil para conferir a instalação e, no futuro, para a hospedagem saber se o servidor está vivo.
import { Router } from "express";

export function rotasSaude(pool) {
  const r = Router();
  r.get("/", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, banco: "conectado" });
    } catch (e) {
      console.error(`[saude] banco indisponível: ${e?.code || e?.name}`);
      res.status(503).json({ ok: false, banco: "sem conexão" });
    }
  });
  return r;
}
