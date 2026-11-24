// Peças comuns dos testes.
import request from "supertest";
import { criarApp } from "../app.js";
import { lerConfig } from "../config.js";
import { criarPool } from "../db.js";

/** App ligado ao banco de teste. Lembre de chamar `pool.end()` no afterAll. */
export function contexto(opcoes = {}) {
  const config = lerConfig();
  const pool = criarPool(config.banco);
  const app = criarApp({ pool, config, limiteTentativas: 1000, ...opcoes });
  return { config, pool, app };
}

let n = 0;
/** Dados de cadastro válidos, com e-mail único a cada chamada. */
export const novaPessoa = (extra = {}) => ({
  nome: "Maria de Lourdes",
  email: `maria.${Date.now()}.${++n}@exemplo.com`,
  senha: "costura1957",
  familia: "Família de Maria",
  ...extra,
});

/** Valor do cookie mv_sessao numa resposta (ou null). */
export function cookieSessao(res) {
  const c = (res.headers["set-cookie"] || []).find((x) => x.startsWith("mv_sessao="));
  return c ? decodeURIComponent(c.split(";")[0].slice("mv_sessao=".length)) : null;
}

export const comCookie = (app, token) => ({
  get: (url) => request(app).get(url).set("Cookie", `mv_sessao=${token}`),
  post: (url) => request(app).post(url).set("Cookie", `mv_sessao=${token}`),
  delete: (url) => request(app).delete(url).set("Cookie", `mv_sessao=${token}`),
  patch: (url) => request(app).patch(url).set("Cookie", `mv_sessao=${token}`),
  put: (url) => request(app).put(url).set("Cookie", `mv_sessao=${token}`),
});
