// Descobre quem está fazendo a requisição, pelo cookie.
// carregarSessao: roda em toda requisição e preenche req.sessao (ou deixa null).
// exigirLogin: coloque em toda rota protegida. Esconder um botão na tela NÃO protege nada;
// quem protege é o servidor recusar a requisição.
import { naoAutenticado } from "../erros.js";
import { sessaoDoToken } from "../servicos/auth.js";

export const COOKIE = "mv_sessao";

export function opcoesCookie(config) {
  return {
    httpOnly: true, // o JavaScript da página não consegue ler: um script malicioso não rouba a sessão
    sameSite: "lax", // outro site não consegue fazer o navegador enviar o cookie num POST
    secure: config.ambiente === "production", // em produção, só por HTTPS
    path: "/",
    maxAge: config.sessaoDias * 24 * 60 * 60 * 1000,
  };
}

export function carregarSessao(pool, config) {
  return async (req, res, next) => {
    req.sessao = null;
    const token = req.cookies?.[COOKIE];
    if (!token) return next();
    try {
      const s = await sessaoDoToken(pool, config, token);
      if (s) {
        req.sessao = s;
        if (s.renovada) res.cookie(COOKIE, token, opcoesCookie(config)); // estende o cookie junto com a sessão
      } else {
        res.clearCookie(COOKIE, { ...opcoesCookie(config), maxAge: undefined }); // código vencido ou inválido
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function exigirLogin(req, _res, next) {
  if (!req.sessao) return next(naoAutenticado());
  next();
}
