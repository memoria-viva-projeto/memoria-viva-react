// Apagar a própria conta: pedido com senha, 30 dias para desistir, e depois some de vez.
// Cenário: Helena (dona, plano Família, com memórias e árvore), Clara (entra na família da Helena pelo código),
// Beto (outra conta, que não pode ser tocada).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";
import { apagarVencidas } from "../servicos/apagarConta.js";

describe.skipIf(!inject("temBanco"))("apagar a conta (com banco)", () => {
  let app, pool;

  const cadastrar = async (nome, extra = {}) => {
    const dados = novaPessoa({ nome, familia: `Família de ${nome}`, ...extra });
    const r = await request(app).post("/api/auth/cadastro").send(dados);
    const f = r.body.familias[0];
    return { ...dados, token: cookieSessao(r), idUsuario: r.body.usuario.id, idFamilia: f.id, idPessoa: f.idPessoa };
  };
  const como = (quem) => comCookie(app, quem.token);
  const entrar = (quem, senha = quem.senha) => request(app).post("/api/auth/entrar").send({ email: quem.email, senha });
  const pedir = (quem, senha = quem.senha) => como(quem).post("/api/conta/apagar").send({ senha });
  const desistir = (quem, senha = quem.senha) => request(app).post("/api/auth/desistir-apagar").send({ email: quem.email, senha });
  const contar = async (sql, params) => Number((await pool.execute(sql, params))[0][0].n);
  // "passa o tempo": põe a data de apagar no passado
  const vencer = (quem) => pool.execute("UPDATE usuario SET apagar_em = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE id_usuario = ?", [quem.idUsuario]);

  /** Uma dona com acervo de verdade: receita com ingredientes e data, música, pessoa com nascimento, laço e código. */
  async function donaComAcervo(nome) {
    const d = await cadastrar(nome);
    await pool.execute("UPDATE usuario SET id_plano = (SELECT id_plano FROM plano WHERE nome = 'Família') WHERE id_usuario = ?", [d.idUsuario]);
    const nova = (b) => como(d).post(`/api/familias/${d.idFamilia}/memorias`).send(b);
    await nova({
      tipo: "receita", titulo: "Bolo de fubá", data: { modo: "decada", decada: "1970" }, etiquetas: ["Natal"],
      pessoas: ["Vó Rosa"], detalhes: { ingredientes: ["fubá", "erva-doce"], preparo: "Misture." },
    });
    await nova({ tipo: "musica", titulo: "Asa Branca", detalhes: { artista: "Luiz Gonzaga" } });
    await nova({ tipo: "receita", titulo: "Rascunho", status: "rascunho" });
    const rosa = (await como(d).post(`/api/familias/${d.idFamilia}/pessoas`).send({ nome: "Rosa", nascimento: { modo: "ano", ano: 1931 } })).body;
    await como(d).post(`/api/familias/${d.idFamilia}/lacos`).send({ tipo: "pais", de: rosa.id, para: d.idPessoa });
    d.codigo = (await como(d).post(`/api/familias/${d.idFamilia}/convite`)).body.codigo;
    return d;
  }

  beforeAll(() => {
    ({ app, pool } = contexto());
  });
  afterAll(() => pool?.end());

  describe("pedir", () => {
    it("sem login: 401", async () => {
      expect((await request(app).get("/api/conta/apagar")).status).toBe(401);
      expect((await request(app).post("/api/conta/apagar").send({ senha: "x" })).status).toBe(401);
    });

    it("o resumo diz o que vai sumir e quem perde o acesso", async () => {
      const helena = await donaComAcervo("Helena");
      const clara = await cadastrar("Clara", { codigo: helena.codigo });
      const r = await como(helena).get("/api/conta/apagar");
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ prazoDias: 30, familias: [{ nome: "Família de Helena", memorias: 3, membros: 1 }], outrasFamilias: 0 });
      // a Clara: o acervo dela (vazio) e mais uma família em que entrou
      expect((await como(clara).get("/api/conta/apagar")).body).toEqual({
        prazoDias: 30, familias: [{ nome: "Família de Clara", memorias: 0, membros: 0 }], outrasFamilias: 1,
      });
    });

    it("senha errada: não marca nada e a sessão continua", async () => {
      const ana = await cadastrar("Ana");
      const r = await pedir(ana, "errada123");
      expect(r.status).toBe(400);
      expect(r.body.erro).toMatchObject({ codigo: "SENHA_ERRADA", campos: { senha: expect.any(String) } });
      expect((await como(ana).get("/api/auth/sessao")).status).toBe(200);
      expect(await contar("SELECT COUNT(*) AS n FROM usuario WHERE id_usuario = ? AND apagar_em IS NULL", [ana.idUsuario])).toBe(1);
    });

    it("sem senha ou com campo a mais: 400", async () => {
      const ana = await cadastrar("Ana");
      expect((await como(ana).post("/api/conta/apagar").send({})).status).toBe(400);
      expect((await como(ana).post("/api/conta/apagar").send({ senha: ana.senha, agora: true })).status).toBe(400);
    });

    it("senha certa: marca daqui a 30 dias, sai de todos os aparelhos e não entra mais", async () => {
      const ana = await cadastrar("Ana");
      const outroAparelho = cookieSessao(await entrar(ana));
      const r = await pedir(ana);
      expect(r.status).toBe(200);
      const dias = (new Date(r.body.apagarEm) - Date.now()) / 86400000;
      expect(dias).toBeGreaterThan(29.9);
      expect(dias).toBeLessThan(30.1);
      expect((r.headers["set-cookie"] || []).join()).toMatch(/mv_sessao=;/);
      // as duas sessões acabaram
      expect((await como(ana).get("/api/auth/sessao")).status).toBe(401);
      expect((await comCookie(app, outroAparelho).get("/api/auth/sessao")).status).toBe(401);
      // entrar: recusa e diz a data, para a tela oferecer desistir
      const e = await entrar(ana);
      expect(e.status).toBe(403);
      expect(e.body.erro).toMatchObject({ codigo: "CONTA_SENDO_APAGADA", dados: { apagarEm: r.body.apagarEm } });
      expect(cookieSessao(e)).toBeNull();
      // senha errada continua dando o erro de sempre (não revela que a conta vai ser apagada)
      expect((await entrar(ana, "errada123")).body.erro.codigo).toBe("CREDENCIAIS_INVALIDAS");
    });
  });

  describe("desistir", () => {
    it("com e-mail e senha: cancela o pedido e já entra", async () => {
      const ana = await cadastrar("Ana");
      await pedir(ana);
      expect((await desistir(ana, "errada123")).status).toBe(401);
      const r = await desistir(ana);
      expect(r.status).toBe(200);
      expect(r.body.usuario.email).toBe(ana.email);
      expect((await comCookie(app, cookieSessao(r)).get("/api/auth/sessao")).status).toBe(200);
      expect((await entrar(ana)).status).toBe(200);
      await apagarVencidas(pool);
      expect(await contar("SELECT COUNT(*) AS n FROM usuario WHERE id_usuario = ?", [ana.idUsuario])).toBe(1);
    });

    it("e-mail que não existe: o mesmo erro de senha errada", async () => {
      const r = await request(app).post("/api/auth/desistir-apagar").send({ email: "ninguem.aqui@exemplo.com", senha: "qualquer1" });
      expect(r.status).toBe(401);
      expect(r.body.erro.codigo).toBe("CREDENCIAIS_INVALIDAS");
    });
  });

  describe("durante os 30 dias", () => {
    it("o membro continua vendo; o código não aceita gente nova; desistindo, volta a aceitar", async () => {
      const helena = await donaComAcervo("Helena");
      const clara = await cadastrar("Clara", { codigo: helena.codigo });
      await pedir(helena);
      expect((await como(clara).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(200);
      const conf = await request(app).post("/api/convites/conferir").send({ codigo: helena.codigo });
      expect(conf.body.erro.codigo).toBe("CODIGO_INVALIDO");
      await desistir(helena);
      expect((await request(app).post("/api/convites/conferir").send({ codigo: helena.codigo })).status).toBe(200);
    });

    it("antes do prazo, a faxina não apaga", async () => {
      const ana = await cadastrar("Ana");
      await pedir(ana);
      await apagarVencidas(pool);
      expect(await contar("SELECT COUNT(*) AS n FROM usuario WHERE id_usuario = ?", [ana.idUsuario])).toBe(1);
    });
  });

  describe("depois dos 30 dias", () => {
    let helena, clara, beto, contagemBeto;

    // quanto existe ligado a uma família (para conferir que sumiu tudo, ou que nada mudou)
    const tudoDa = async (idFamilia) => ({
      familia: await contar("SELECT COUNT(*) AS n FROM familia WHERE id_familia = ?", [idFamilia]),
      memorias: await contar("SELECT COUNT(*) AS n FROM memoria WHERE id_familia = ?", [idFamilia]),
      pessoas: await contar("SELECT COUNT(*) AS n FROM pessoa WHERE id_familia = ?", [idFamilia]),
      lacos: await contar("SELECT COUNT(*) AS n FROM laco WHERE id_familia = ?", [idFamilia]),
    });

    beforeAll(async () => {
      helena = await donaComAcervo("Helena");
      clara = await cadastrar("Clara", { codigo: helena.codigo });
      beto = await donaComAcervo("Beto");
      // a Helena também entrou na família do Beto
      await como(helena).post("/api/convites/entrar").send({ codigo: beto.codigo });
      contagemBeto = await tudoDa(beto.idFamilia);
      await pedir(helena);
      await vencer(helena);
      expect(await apagarVencidas(pool)).toMatchObject({ apagadas: 1, falhas: 0 });
    });

    it("a conta some (e o e-mail fica livre para um cadastro novo)", async () => {
      expect(await contar("SELECT COUNT(*) AS n FROM usuario WHERE id_usuario = ?", [helena.idUsuario])).toBe(0);
      expect(await contar("SELECT COUNT(*) AS n FROM sessao WHERE id_usuario = ?", [helena.idUsuario])).toBe(0);
      expect((await entrar(helena)).status).toBe(401);
      const novo = await request(app).post("/api/auth/cadastro").send({ ...novaPessoa(), email: helena.email });
      expect(novo.status).toBe(201);
    });

    it("a família dela some inteira: memórias, detalhes, árvore, laços, datas", async () => {
      expect(await tudoDa(helena.idFamilia)).toEqual({ familia: 0, memorias: 0, pessoas: 0, lacos: 0 });
      // nada ficou solto apontando para memórias que não existem
      for (const t of ["receita", "ingrediente", "musica", "memoria_pessoa", "memoria_etiqueta", "item_memoria"]) {
        expect(await contar(`SELECT COUNT(*) AS n FROM ${t} x LEFT JOIN memoria m ON m.id_memoria = x.id_memoria WHERE m.id_memoria IS NULL`)).toBe(0);
      }
      // nenhuma data ficou sem dono
      expect(await contar(`
        SELECT COUNT(*) AS n FROM data_flexivel d
         WHERE NOT EXISTS (SELECT 1 FROM memoria m WHERE m.id_data = d.id_data)
           AND NOT EXISTS (SELECT 1 FROM item_memoria i WHERE i.id_data = d.id_data)
           AND NOT EXISTS (SELECT 1 FROM pessoa p WHERE p.id_nascimento = d.id_data OR p.id_falecimento = d.id_data)`)).toBe(0);
    });

    it("quem tinha entrado pela família dela perde o acesso, mas a conta e o acervo dele continuam", async () => {
      expect((await como(clara).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(404);
      const s = await como(clara).get("/api/auth/sessao");
      expect(s.status).toBe(200);
      expect(s.body.familias.map((f) => f.id)).toEqual([clara.idFamilia]);
    });

    it("na família do Beto, ela continua na árvore, mas sem conta; nada do Beto foi apagado", async () => {
      expect(await tudoDa(beto.idFamilia)).toEqual(contagemBeto);
      const arvore = (await como(beto).get(`/api/familias/${beto.idFamilia}/arvore`)).body.pessoas;
      const ela = arvore.find((p) => p.nome === "Helena");
      expect(ela).toMatchObject({ temConta: false, removida: false });
      expect(await contar("SELECT COUNT(*) AS n FROM pessoa WHERE id_usuario = ?", [helena.idUsuario])).toBe(0);
    });

    it("rodar de novo não apaga mais nada", async () => {
      expect(await apagarVencidas(pool)).toEqual({ apagadas: 0, falhas: 0 });
      expect(await tudoDa(beto.idFamilia)).toEqual(contagemBeto);
    });
  });
});
