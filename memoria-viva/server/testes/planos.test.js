// Planos: catálogo, plano escolhido no cadastro, troca simulada e os limites que passam a valer.
// Cenário: Helena (dona) e Clara (entra no acervo da Helena pelo código).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";
import { cicloPara } from "../servicos/planos.js";
import { PLANOS_RESERVA } from "../../src/dados/planos.js";

describe("ciclo do plano (sem banco)", () => {
  it("Grátis não tem ciclo; pago sem ciclo é mensal; anual só se o plano tiver preço anual", () => {
    expect(cicloPara({ nome: "Grátis", valor_mensal: "0.00", valor_anual: null }, "anual")).toBeNull();
    expect(cicloPara({ nome: "Família", valor_mensal: "49.90", valor_anual: "499.00" })).toBe("mensal");
    expect(cicloPara({ nome: "Família", valor_mensal: "49.90", valor_anual: "499.00" }, "anual")).toBe("anual");
    expect(() => cicloPara({ nome: "Só mensal", valor_mensal: "10.00", valor_anual: null }, "anual")).toThrow(/não tem opção anual/);
  });
});

describe.skipIf(!inject("temBanco"))("planos (com banco)", () => {
  let app, pool, catalogo;
  const como = (quem) => comCookie(app, quem.token);
  const cadastrar = async (nome, extra = {}) => {
    const r = await request(app).post("/api/auth/cadastro").send(novaPessoa({ nome, familia: `Família de ${nome}`, ...extra }));
    return { r, token: cookieSessao(r), idUsuario: r.body.usuario?.id, idFamilia: r.body.familias?.[0]?.id, email: r.body.usuario?.email };
  };
  const plano = (nome) => catalogo.find((p) => p.nome === nome);
  const trocar = (quem, nome, ciclo) => como(quem).post("/api/conta/plano").send({ idPlano: plano(nome).id, ciclo });

  beforeAll(async () => {
    ({ app, pool } = contexto());
    catalogo = (await request(app).get("/api/planos")).body;
  });
  afterAll(() => pool?.end());

  describe("catálogo", () => {
    it("é público e traz os 4 planos do relatório, na ordem, com preço, limites e textos", async () => {
      const r = await request(app).get("/api/planos");
      expect(r.status).toBe(200);
      expect(r.body.map((p) => p.nome)).toEqual(["Grátis", "Individual", "Família", "Família Ampliada"]);
      expect(r.body.map((p) => p.valorMensal)).toEqual([0, 24.9, 49.9, 79.9]);
      expect(r.body.map((p) => p.valorAnual)).toEqual([null, 249, 499, 799]);
      expect(r.body.map((p) => p.espacoGb)).toEqual([1, 10, 50, 120]);
      expect(r.body.map((p) => p.limitePessoas)).toEqual([1, 1, 5, 10]);
      expect(r.body.map((p) => p.convidaFamilia)).toEqual([false, false, true, true]);
      expect(r.body.map((p) => p.feedFamilia)).toEqual([false, false, true, true]); // feed da família: só nos planos Família
      for (const p of r.body) {
        expect(p.recursos.length).toBeGreaterThan(0);
        expect(Array.isArray(p.emBreve)).toBe(true);
        expect(p.descricao).toBeTruthy();
      }
    });

    it("a cópia de reserva da demonstração (src/dados/planos.js) é igual ao banco", async () => {
      expect((await request(app).get("/api/planos")).body).toEqual(PLANOS_RESERVA);
    });
  });

  describe("plano no cadastro", () => {
    it("sem escolher: começa no Grátis, sem ciclo", async () => {
      const a = await cadastrar("Ana");
      expect(a.r.status).toBe(201);
      expect(a.r.body.usuario.plano).toMatchObject({ nome: "Grátis", ciclo: null });
    });

    it("escolhendo Família anual: a conta já nasce nele, e o convite já funciona", async () => {
      const b = await cadastrar("Bia", { idPlano: plano("Família").id, ciclo: "anual" });
      expect(b.r.status).toBe(201);
      expect(b.r.body.usuario.plano).toMatchObject({ nome: "Família", ciclo: "anual" });
      const v = await como(b).get("/api/conta/plano");
      expect(v.body.plano.nome).toBe("Família");
      expect(v.body.ciclo).toBe("anual");
      expect(v.body.desde).toBeTruthy();
      expect((await como(b).post(`/api/familias/${b.idFamilia}/convite`)).status).toBe(200);
    });

    it("Grátis com ciclo anual: o ciclo é ignorado (não há cobrança)", async () => {
      const c = await cadastrar("Cida", { idPlano: plano("Grátis").id, ciclo: "anual" });
      expect(c.r.body.usuario.plano).toMatchObject({ nome: "Grátis", ciclo: null });
    });

    it("plano que não existe: 400 e a conta NÃO é criada", async () => {
      const dados = novaPessoa({ nome: "Duda", idPlano: 999999 });
      const r = await request(app).post("/api/auth/cadastro").send(dados);
      expect(r.status).toBe(400);
      expect(r.body.erro.codigo).toBe("PLANO_INVALIDO");
      const entrar = await request(app).post("/api/auth/entrar").send({ email: dados.email, senha: dados.senha });
      expect(entrar.status).toBe(401);
    });
  });

  describe("troca simulada", () => {
    let helena, clara;
    beforeAll(async () => {
      helena = await cadastrar("Helena");
      clara = await cadastrar("Clara");
    });

    it("exige login", async () => {
      expect((await request(app).get("/api/conta/plano")).status).toBe(401);
      expect((await request(app).post("/api/conta/plano").send({ idPlano: plano("Família").id })).status).toBe(401);
    });

    it("dados errados: 400 (plano inexistente ou ciclo que não existe)", async () => {
      const r1 = await como(helena).post("/api/conta/plano").send({ idPlano: 999999 });
      expect(r1.body.erro.codigo).toBe("PLANO_INVALIDO");
      const r2 = await como(helena).post("/api/conta/plano").send({ idPlano: plano("Família").id, ciclo: "semanal" });
      expect(r2.status).toBe(400);
      expect(r2.body.erro.codigo).toBe("DADOS_INVALIDOS");
    });

    it("Grátis → Família: grava no banco e o convite passa a funcionar na hora", async () => {
      expect((await como(helena).post(`/api/familias/${helena.idFamilia}/convite`)).body.erro.codigo).toBe("PLANO_SEM_CONVITE");
      const r = await trocar(helena, "Família");
      expect(r.status).toBe(200);
      expect(r.body.plano.nome).toBe("Família");
      expect(r.body.ciclo).toBe("mensal");
      expect(r.body.avisos).toEqual([]);
      const [[u]] = await pool.execute("SELECT p.nome, u.ciclo_plano FROM usuario u JOIN plano p USING (id_plano) WHERE id_usuario = ?", [helena.idUsuario]);
      expect(u).toMatchObject({ nome: "Família", ciclo_plano: "mensal" });
      const g = await como(helena).post(`/api/familias/${helena.idFamilia}/convite`);
      expect(g.status).toBe(200);
      expect((await como(clara).post("/api/convites/entrar").send({ codigo: g.body.codigo })).status).toBe(201);
    });

    it("o mesmo plano e ciclo de novo: 409", async () => {
      const r = await trocar(helena, "Família", "mensal");
      expect(r.status).toBe(409);
      expect(r.body.erro.codigo).toBe("MESMO_PLANO");
    });

    it("só o ciclo muda (mensal → anual): vale", async () => {
      const r = await trocar(helena, "Família", "anual");
      expect(r.status).toBe(200);
      expect(r.body.ciclo).toBe("anual");
    });

    it("quem entrou por convite vê de quem é o plano que vale no acervo", async () => {
      const r = await como(clara).get("/api/conta/plano");
      expect(r.body.plano.nome).toBe("Grátis"); // o plano da própria Clara
      const daHelena = r.body.acervos.find((a) => a.id === helena.idFamilia);
      expect(daHelena).toMatchObject({ papel: "familiar", plano: "Família", pessoas: { usadas: 2, limite: 5 } });
    });

    it("rebaixar para o Grátis com 2 pessoas e 2 GB: troca, ninguém sai, nada é apagado, o resto fica parado", async () => {
      await pool.execute(
        "INSERT INTO arquivo (id_familia, tipo, mime, tamanho_bytes, enviado_por) VALUES (?, 'foto', 'image/jpeg', ?, ?)",
        [helena.idFamilia, 2 * 1024 ** 3, helena.idUsuario],
      );
      const r = await trocar(helena, "Grátis");
      expect(r.status).toBe(200);
      expect(r.body.plano.nome).toBe("Grátis");
      expect(r.body.ciclo).toBeNull();
      expect(r.body.avisos).toHaveLength(2);
      expect(r.body.avisos[0]).toMatch(/2 pessoas.*permite 1.*Ninguém sai/);
      expect(r.body.avisos[1]).toMatch(/Nenhuma foto é apagada/);
      const acervo = r.body.acervos.find((a) => a.id === helena.idFamilia);
      expect(acervo.pessoas).toMatchObject({ usadas: 2, limite: 1, passou: true });
      expect(acervo.espaco.passou).toBe(true);

      // a Clara continua no acervo, vendo as memórias
      expect((await como(clara).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(200);
      // e nada novo entra: nem convite novo, nem gente nova com o código antigo
      expect((await como(helena).post(`/api/familias/${helena.idFamilia}/convite`)).body.erro.codigo).toBe("PLANO_SEM_CONVITE");
      const [[{ n }]] = await pool.execute("SELECT COUNT(*) AS n FROM arquivo WHERE id_familia = ?", [helena.idFamilia]);
      expect(n).toBe(1);
    });

    it("voltando para um plano maior, o que estava parado volta a funcionar", async () => {
      const r = await trocar(helena, "Família Ampliada", "mensal");
      expect(r.body.avisos).toEqual([]);
      expect((await como(helena).post(`/api/familias/${helena.idFamilia}/convite`)).status).toBe(200);
    });

    it("a sessão também mostra o plano novo, e se ele libera o feed da família", async () => {
      const s = await como(helena).get("/api/auth/sessao");
      expect(s.body.usuario.plano).toMatchObject({ nome: "Família Ampliada", ciclo: "mensal", feedFamilia: true });
      await trocar(helena, "Individual");
      const s2 = await como(helena).get("/api/auth/sessao");
      expect(s2.body.usuario.plano).toMatchObject({ nome: "Individual", feedFamilia: false });
    });
  });
});
