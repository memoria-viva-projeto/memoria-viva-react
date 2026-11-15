// Cadastro, login, sessão e saída contra o MySQL de teste.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { hashToken } from "../servicos/token.js";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";

describe.skipIf(!inject("temBanco"))("contas (com banco)", () => {
  let app, pool, config;
  beforeAll(() => ({ app, pool, config } = contexto()));
  afterAll(() => pool?.end());

  const cadastrar = async (extra) => {
    const dados = novaPessoa(extra);
    const r = await request(app).post("/api/auth/cadastro").send(dados);
    return { dados, r, token: cookieSessao(r) };
  };

  it("saúde: conectado", async () => {
    const r = await request(app).get("/api/saude");
    expect(r.body).toEqual({ ok: true, banco: "conectado" });
  });

  describe("cadastro", () => {
    it("cria conta, família e pessoa dona, no plano Gratuito, e já entra", async () => {
      const { dados, r, token } = await cadastrar();
      expect(r.status).toBe(201);
      expect(r.body.usuario).toMatchObject({ nome: dados.nome, email: dados.email, plano: { nome: "Gratuito" } });
      expect(r.body.familias).toHaveLength(1);
      expect(r.body.familias[0]).toMatchObject({ nome: dados.familia, papel: "dona" });
      expect(token).toBeTruthy();

      const cookie = r.headers["set-cookie"].find((c) => c.startsWith("mv_sessao="));
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it("nunca devolve a senha nem o hash", async () => {
      const { dados, r } = await cadastrar();
      const texto = JSON.stringify(r.body);
      expect(texto).not.toContain(dados.senha);
      expect(texto).not.toMatch(/senha|hash|argon2/i);
    });

    it("guarda a senha como Argon2id e a sessão só como hash", async () => {
      const { dados, token } = await cadastrar();
      const [[u]] = await pool.execute("SELECT id_usuario, senha_hash FROM usuario WHERE email = ?", [dados.email]);
      expect(u.senha_hash.startsWith("$argon2id$")).toBe(true);
      const [sess] = await pool.execute("SELECT token_hash FROM sessao WHERE id_usuario = ?", [u.id_usuario]);
      expect(sess).toHaveLength(1);
      expect(sess[0].token_hash).toBe(hashToken(token));
      expect(sess[0].token_hash).not.toBe(token);
    });

    it("e-mail repetido → 409, mesmo com maiúsculas, sem criar nada a mais", async () => {
      const { dados } = await cadastrar();
      const [[{ antes }]] = await pool.query("SELECT COUNT(*) AS antes FROM familia");
      const r = await request(app).post("/api/auth/cadastro").send({ ...novaPessoa(), email: dados.email.toUpperCase() });
      expect(r.status).toBe(409);
      expect(r.body.erro.codigo).toBe("EMAIL_EM_USO");
      expect(cookieSessao(r)).toBeNull();
      const [[{ depois }]] = await pool.query("SELECT COUNT(*) AS depois FROM familia");
      expect(depois).toBe(antes); // a transação desfez tudo
    });

    it("dados inválidos → 400 e nada gravado", async () => {
      const email = `invalido.${Date.now()}@exemplo.com`;
      const r = await request(app).post("/api/auth/cadastro").send({ ...novaPessoa(), email, senha: "semnumero" });
      expect(r.status).toBe(400);
      expect(r.body.erro.campos.senha).toMatch(/número/);
      const [linhas] = await pool.execute("SELECT 1 FROM usuario WHERE email = ?", [email]);
      expect(linhas).toHaveLength(0);
    });
  });

  describe("entrar", () => {
    it("com e-mail e senha certos", async () => {
      const { dados } = await cadastrar();
      const r = await request(app).post("/api/auth/entrar").send({ email: ` ${dados.email.toUpperCase()} `, senha: dados.senha });
      expect(r.status).toBe(200);
      expect(r.body.usuario.email).toBe(dados.email);
      expect(cookieSessao(r)).toBeTruthy();
    });

    it("senha errada e e-mail inexistente dão a MESMA resposta", async () => {
      const { dados } = await cadastrar();
      const errada = await request(app).post("/api/auth/entrar").send({ email: dados.email, senha: "outra123" });
      const naoExiste = await request(app).post("/api/auth/entrar").send({ email: "ninguem@exemplo.com", senha: "outra123" });
      expect(errada.status).toBe(401);
      expect(naoExiste.status).toBe(401);
      expect(errada.body).toEqual(naoExiste.body);
      expect(cookieSessao(errada)).toBeNull();
    });

    it("conta bloqueada não entra e perde a sessão aberta", async () => {
      const { dados, token } = await cadastrar();
      await pool.execute("UPDATE usuario SET status = 'bloqueado' WHERE email = ?", [dados.email]);
      expect((await comCookie(app, token).get("/api/auth/sessao")).status).toBe(401);
      const r = await request(app).post("/api/auth/entrar").send({ email: dados.email, senha: dados.senha });
      expect(r.status).toBe(403);
      expect(r.body.erro.codigo).toBe("CONTA_INDISPONIVEL");
    });
  });

  describe("sessão", () => {
    it("sem cookie → 401; com cookie inventado → 401", async () => {
      expect((await request(app).get("/api/auth/sessao")).status).toBe(401);
      expect((await comCookie(app, "inventado-123").get("/api/auth/sessao")).status).toBe(401);
    });

    it("cada sessão só enxerga a própria conta", async () => {
      const a = await cadastrar({ nome: "Helena" });
      const b = await cadastrar({ nome: "Clara" });
      const ra = await comCookie(app, a.token).get("/api/auth/sessao");
      const rb = await comCookie(app, b.token).get("/api/auth/sessao");
      expect(ra.body.usuario.email).toBe(a.dados.email);
      expect(rb.body.usuario.email).toBe(b.dados.email);
      expect(JSON.stringify(ra.body)).not.toContain(b.dados.email);
      expect(ra.body.familias[0].id).not.toBe(rb.body.familias[0].id);
    });

    it("sessão vencida → 401", async () => {
      const { token } = await cadastrar();
      await pool.execute("UPDATE sessao SET expira_em = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE token_hash = ?", [hashToken(token)]);
      const r = await comCookie(app, token).get("/api/auth/sessao");
      expect(r.status).toBe(401);
    });

    it("usar a sessão renova a validade", async () => {
      const { token } = await cadastrar();
      await pool.execute(
        "UPDATE sessao SET ultimo_uso_em = UTC_TIMESTAMP() - INTERVAL 2 HOUR, expira_em = UTC_TIMESTAMP() + INTERVAL 1 DAY WHERE token_hash = ?",
        [hashToken(token)],
      );
      expect((await comCookie(app, token).get("/api/auth/sessao")).status).toBe(200);
      const [[s]] = await pool.execute(
        "SELECT TIMESTAMPDIFF(DAY, UTC_TIMESTAMP(), expira_em) AS dias FROM sessao WHERE token_hash = ?",
        [hashToken(token)],
      );
      expect(s.dias).toBeGreaterThanOrEqual(config.sessaoDias - 1);
    });
  });

  describe("sair", () => {
    it("encerra a sessão: o mesmo código não vale mais", async () => {
      const { token } = await cadastrar();
      const r = await comCookie(app, token).post("/api/auth/sair");
      expect(r.status).toBe(204);
      expect(r.headers["set-cookie"].join(";")).toMatch(/mv_sessao=;/);
      const depois = await comCookie(app, token).get("/api/auth/sessao");
      expect(depois.status).toBe(401);
      const [linhas] = await pool.execute("SELECT 1 FROM sessao WHERE token_hash = ?", [hashToken(token)]);
      expect(linhas).toHaveLength(0);
    });

    it("sair sem estar logado também responde 204", async () => {
      expect((await request(app).post("/api/auth/sair")).status).toBe(204);
    });

    it("sair num aparelho não derruba a sessão de outro", async () => {
      const { dados, token: celular } = await cadastrar();
      const pc = cookieSessao(await request(app).post("/api/auth/entrar").send({ email: dados.email, senha: dados.senha }));
      await comCookie(app, celular).post("/api/auth/sair");
      expect((await comCookie(app, pc).get("/api/auth/sessao")).status).toBe(200);
    });
  });
});
