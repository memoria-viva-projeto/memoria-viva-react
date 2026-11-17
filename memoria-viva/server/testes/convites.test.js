// Código de convite da família e o que cada um pode fazer depois de entrar.
// Cenário: Helena (dona, plano Família), Clara (entra pelo código), Beto (de fora).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";
import { normalizar, novoCodigo } from "../servicos/convites.js";

describe("formato do código (sem banco)", () => {
  it("gera MV-XXXX-XXXX sem letras que se confundem", () => {
    for (let i = 0; i < 50; i++) expect(novoCodigo()).toMatch(/^MV-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
  it("aceita o código digitado de vários jeitos", () => {
    expect(normalizar("mv-7k3p-q9xd")).toBe("MV-7K3P-Q9XD");
    expect(normalizar(" 7K3P Q9XD ")).toBe("MV-7K3P-Q9XD");
    expect(normalizar("MV7K3PQ9XD")).toBe("MV-7K3P-Q9XD");
    expect(normalizar("MV-4821")).toBeNull();
    expect(normalizar("")).toBeNull();
  });
});

describe.skipIf(!inject("temBanco"))("convite da família (com banco)", () => {
  let app, pool;
  let helena, clara, beto;

  const cadastrar = async (nome, extra = {}) => {
    const r = await request(app).post("/api/auth/cadastro").send(novaPessoa({ nome, familia: `Família de ${nome}`, ...extra }));
    return { r, token: cookieSessao(r), idUsuario: r.body.usuario?.id, familias: r.body.familias, idFamilia: r.body.familias?.[0]?.id };
  };
  const como = (quem) => comCookie(app, quem.token);
  const mudarPlano = (quem, plano) =>
    pool.execute("UPDATE usuario SET id_plano = (SELECT id_plano FROM plano WHERE nome = ?) WHERE id_usuario = ?", [plano, quem.idUsuario]);
  const gerar = (quem, idFamilia = quem.idFamilia) => como(quem).post(`/api/familias/${idFamilia}/convite`);
  const entrar = (quem, codigo) => como(quem).post("/api/convites/entrar").send({ codigo });

  beforeAll(async () => {
    ({ app, pool } = contexto());
    helena = await cadastrar("Helena");
    clara = await cadastrar("Clara");
    beto = await cadastrar("Beto");
  });
  afterAll(() => pool?.end());

  describe("a dona cuida do código", () => {
    it("plano Gratuito: não gera código (o limite é só a dona)", async () => {
      const v = await como(helena).get(`/api/familias/${helena.idFamilia}/convite`);
      expect(v.status).toBe(200);
      expect(v.body).toMatchObject({ codigo: null, membros: 1, limite: 1, plano: "Gratuito", podeConvidar: false });
      const r = await gerar(helena);
      expect(r.status).toBe(409);
      expect(r.body.erro.codigo).toBe("PLANO_SEM_CONVITE");
    });

    it("plano Família: gera; trocar invalida o código antigo", async () => {
      await mudarPlano(helena, "Família");
      const r1 = await gerar(helena);
      expect(r1.status).toBe(200);
      expect(r1.body).toMatchObject({ membros: 1, limite: 5, podeConvidar: true });
      expect(r1.body.codigo).toMatch(/^MV-/);
      const r2 = await gerar(helena);
      expect(r2.body.codigo).not.toBe(r1.body.codigo);
      expect((await request(app).post("/api/convites/conferir").send({ codigo: r1.body.codigo })).status).toBe(400);
      const ok = await request(app).post("/api/convites/conferir").send({ codigo: r2.body.codigo.toLowerCase() });
      expect(ok.status).toBe(200);
      expect(ok.body).toEqual({ familia: { nome: "Família de Helena" } });
    });

    it("só a dona vê, gera e desliga o código (os outros recebem 404)", async () => {
      for (const r of [
        await como(beto).get(`/api/familias/${helena.idFamilia}/convite`),
        await gerar(beto, helena.idFamilia),
        await como(beto).delete(`/api/familias/${helena.idFamilia}/convite`),
      ]) expect(r.status).toBe(404);
    });

    it("desligar: o código para de valer", async () => {
      const { body } = await gerar(helena);
      expect((await como(helena).delete(`/api/familias/${helena.idFamilia}/convite`)).status).toBe(204);
      expect((await entrar(beto, body.codigo)).body.erro.codigo).toBe("CODIGO_INVALIDO");
      expect((await como(helena).get(`/api/familias/${helena.idFamilia}/convite`)).body.codigo).toBeNull();
    });
  });

  describe("entrar pelo código", () => {
    let codigo, idMemoria, idRascunho;

    beforeAll(async () => {
      codigo = (await gerar(helena)).body.codigo;
      const j = (b) => como(helena).post(`/api/familias/${helena.idFamilia}/memorias`).send(b);
      idMemoria = (await j({ tipo: "receita", titulo: "Bolo de fubá" })).body.id;
      idRascunho = (await j({ tipo: "receita", titulo: "Ainda escrevendo", status: "rascunho" })).body.id;
    });

    it("código errado: mensagem no campo, nada muda", async () => {
      const r = await entrar(clara, "MV-ZZZZ-ZZZZ");
      expect(r.status).toBe(400);
      expect(r.body.erro).toMatchObject({ codigo: "CODIGO_INVALIDO", campos: { codigo: expect.any(String) } });
    });

    it("conta existente entra: vira pessoa da árvore, e a família aparece na sessão", async () => {
      const r = await entrar(clara, codigo);
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ id: helena.idFamilia, nome: "Família de Helena", papel: "familiar" });
      clara.naHelena = r.body.idPessoa;
      const s = await como(clara).get("/api/auth/sessao");
      expect(s.body.familias.map((f) => f.papel)).toEqual(["dona", "familiar"]); // o acervo dela continua
      expect((await entrar(clara, codigo)).body.erro.codigo).toBe("JA_NA_FAMILIA");
    });

    it("o membro vê o acervo e a árvore, mas não os rascunhos", async () => {
      const l = await como(clara).get(`/api/familias/${helena.idFamilia}/memorias`);
      expect(l.status).toBe(200);
      expect(l.body.memorias.map((m) => m.titulo)).toEqual(["Bolo de fubá"]);
      expect((await como(clara).get(`/api/memorias/${idMemoria}`)).status).toBe(200);
      expect((await como(clara).get(`/api/memorias/${idRascunho}`)).status).toBe(404);
      // a dona continua vendo o rascunho
      expect((await como(helena).get(`/api/familias/${helena.idFamilia}/memorias`)).body.memorias).toHaveLength(2);
      const a = await como(clara).get(`/api/familias/${helena.idFamilia}/arvore`);
      expect(a.status).toBe(200);
      const voce = a.body.pessoas.filter((p) => p.voce);
      expect(voce).toHaveLength(1);
      expect(voce[0]).toMatchObject({ id: clara.naHelena, nome: "Clara", papel: "familiar", temConta: true });
      // para a Helena, "você" continua sendo ela
      expect((await como(helena).get(`/api/familias/${helena.idFamilia}/arvore`)).body.pessoas.find((p) => p.voce).papel).toBe("dona");
    });

    it("o membro muda só o próprio perfil; não guarda, não muda e não apaga memórias nem a árvore", async () => {
      const proprio = await como(clara).patch(`/api/pessoas/${clara.naHelena}`).send({ cidadeAtual: "Recife" });
      expect(proprio.status).toBe(200);
      expect(proprio.body).toMatchObject({ cidadeAtual: "Recife", voce: true });
      const tentativas = [
        await como(clara).patch(`/api/pessoas/${helena.familias[0].idPessoa}`).send({ bio: "x" }),
        await como(clara).post(`/api/familias/${helena.idFamilia}/memorias`).send({ tipo: "receita", titulo: "x" }),
        await como(clara).put(`/api/memorias/${idMemoria}`).send({ tipo: "receita", titulo: "x" }),
        await como(clara).delete(`/api/memorias/${idMemoria}`),
        await como(clara).post(`/api/familias/${helena.idFamilia}/pessoas`).send({ nome: "x" }),
        await como(clara).delete(`/api/pessoas/${clara.naHelena}`),
        await como(clara).get(`/api/familias/${helena.idFamilia}/convite`),
      ];
      expect(tentativas.map((r) => r.status)).toEqual([404, 404, 404, 404, 404, 404, 404]);
    });

    it("quem é de fora continua sem ver nada", async () => {
      expect((await como(beto).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(404);
      expect((await como(beto).get(`/api/memorias/${idMemoria}`)).status).toBe(404);
      expect((await como(beto).get(`/api/familias/${helena.idFamilia}/arvore`)).status).toBe(404);
    });

    it("cadastro com código: cria a conta, o acervo dela e entra na família", async () => {
      const d = await cadastrar("Davi Souza", { codigo });
      expect(d.r.status).toBe(201);
      expect(d.familias.map((f) => [f.nome, f.papel])).toEqual([["Família de Davi Souza", "dona"], ["Família de Helena", "familiar"]]);
    });

    it("cadastro com código errado: nada é criado", async () => {
      const dados = novaPessoa({ nome: "Eva", codigo: "MV-ZZZZ-ZZZZ" });
      const r = await request(app).post("/api/auth/cadastro").send(dados);
      expect(r.status).toBe(400);
      expect(r.body.erro.campos.codigo).toBeTruthy();
      const [l] = await pool.execute("SELECT 1 FROM usuario WHERE email = ?", [dados.email]);
      expect(l).toHaveLength(0);
    });

    it("família cheia: a 6ª conta não entra (plano Família = 5, a dona conta)", async () => {
      // agora: Helena, Clara, Davi = 3
      await cadastrar("Fábio", { codigo });
      await cadastrar("Gil", { codigo }); // 5
      const r = await entrar(beto, codigo);
      expect(r.status).toBe(409);
      expect(r.body.erro.codigo).toBe("FAMILIA_CHEIA");
      expect((await como(helena).get(`/api/familias/${helena.idFamilia}/convite`)).body.membros).toBe(5);
    });

    it("tirado da árvore pela dona: perde o acesso na hora (e libera o lugar)", async () => {
      expect((await como(helena).delete(`/api/pessoas/${clara.naHelena}`)).status).toBe(204);
      expect((await como(clara).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(404);
      expect((await como(clara).get(`/api/memorias/${idMemoria}`)).status).toBe(404);
      expect((await como(clara).patch(`/api/pessoas/${clara.naHelena}`).send({ bio: "x" })).status).toBe(404);
      expect((await como(clara).get("/api/auth/sessao")).body.familias.map((f) => f.papel)).toEqual(["dona"]);
      expect((await entrar(beto, codigo)).status).toBe(201); // o lugar dela ficou livre
    });
  });

  it("muitas tentativas de código: espera 15 minutos", async () => {
    const { app: appLimitado, pool: outro } = contexto({ limiteTentativas: 3 });
    try {
      const tentar = () => request(appLimitado).post("/api/convites/conferir").send({ codigo: "MV-ZZZZ-ZZZZ" });
      for (let i = 0; i < 3; i++) expect((await tentar()).status).toBe(400);
      const r = await tentar();
      expect(r.status).toBe(429);
      expect(r.body.erro.codigo).toBe("MUITAS_TENTATIVAS");
    } finally {
      await outro.end();
    }
  });
});
