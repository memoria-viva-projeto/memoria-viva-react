// Árvore da família: pessoas e laços. E, principalmente, que ninguém mexe na árvore dos outros.
// Cenário: Helena (dona) e Clara (outra conta, com a árvore dela).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";

describe.skipIf(!inject("temBanco"))("família (com banco)", () => {
  let app, pool;
  let helena, clara;

  const entrarComo = async (nome) => {
    const r = await request(app).post("/api/auth/cadastro").send(novaPessoa({ nome, familia: `Família de ${nome}` }));
    const f = r.body.familias[0];
    return { token: cookieSessao(r), idFamilia: f.id, idPessoa: f.idPessoa };
  };
  const como = (quem) => comCookie(app, quem.token);
  const arvore = (quem, idFamilia = quem.idFamilia) => como(quem).get(`/api/familias/${idFamilia}/arvore`);
  const adicionar = (quem, corpo, idFamilia = quem.idFamilia) => como(quem).post(`/api/familias/${idFamilia}/pessoas`).send(corpo);
  const ligar = (quem, corpo, idFamilia = quem.idFamilia) => como(quem).post(`/api/familias/${idFamilia}/lacos`).send(corpo);

  beforeAll(async () => {
    ({ app, pool } = contexto());
    helena = await entrarComo("Helena");
    clara = await entrarComo("Clara");
  });
  afterAll(() => pool?.end());

  describe("a dona cuida da árvore", () => {
    it("conta nova: a árvore começa só com ela", async () => {
      const r = await arvore(helena);
      expect(r.status).toBe(200);
      expect(r.body.pessoas).toHaveLength(1);
      expect(r.body.pessoas[0]).toMatchObject({ id: helena.idPessoa, voce: true, papel: "dona", temConta: true, removida: false });
      expect(r.body.lacos).toEqual([]);
    });

    it("adiciona um familiar sem conta, com data flexível", async () => {
      const r = await adicionar(helena, {
        nome: "Rosa", nomeCompleto: "Rosa Maria", genero: "f", nascimento: { modo: "decada", decada: "1930" }, faleceu: true, bio: "Costureira.",
      });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        nome: "Rosa", nomeCompleto: "Rosa Maria", genero: "f", papel: "familiar", voce: false, temConta: false, faleceu: true,
        nascimento: { modo: "decada", decada: 1930 }, falecimento: null,
      });
      expect((await arvore(helena)).body.pessoas.map((p) => p.nome)).toContain("Rosa");
    });

    it("edita só o que mandou (o resto continua)", async () => {
      const { body: p } = await adicionar(helena, { nome: "Antônio", bio: "Marceneiro.", origem: "Minas" });
      const r = await como(helena).patch(`/api/pessoas/${p.id}`).send({ bio: "Marceneiro e músico.", nascimento: { modo: "ano", ano: 1931 } });
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ nome: "Antônio", origem: "Minas", bio: "Marceneiro e músico.", nascimento: { modo: "ano", ano: 1931 } });
      // trocar a data não deixa a antiga sobrando no banco
      const r2 = await como(helena).patch(`/api/pessoas/${p.id}`).send({ nascimento: null });
      expect(r2.body.nascimento).toBeNull();
    });

    it("liga duas pessoas; ligar de novo o mesmo par troca o parentesco", async () => {
      const { body: filho } = await adicionar(helena, { nome: "Carlos", genero: "m" });
      const r = await ligar(helena, { tipo: "pais", de: helena.idPessoa, para: filho.id });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ tipo: "pais", de: helena.idPessoa, para: filho.id, modo: null, rotulo: null });
      const r2 = await ligar(helena, { tipo: "outro", de: filho.id, para: helena.idPessoa, rotulo: "afilhado", rotuloVolta: "madrinha" });
      expect(r2.status).toBe(201);
      const lacos = (await arvore(helena)).body.lacos.filter((l) => [l.de, l.para].includes(filho.id));
      expect(lacos).toHaveLength(1);
      expect(lacos[0]).toMatchObject({ tipo: "outro", rotulo: "afilhado", rotuloVolta: "madrinha" });
      // desfazer
      expect((await como(helena).delete(`/api/lacos/${lacos[0].id}`)).status).toBe(204);
      expect((await arvore(helena)).body.lacos.some((l) => l.id === lacos[0].id)).toBe(false);
    });

    it("rótulo só vale no tipo 'outro'", async () => {
      const { body: p } = await adicionar(helena, { nome: "Lucas" });
      const r = await ligar(helena, { tipo: "irmaos", de: helena.idPessoa, para: p.id, rotulo: "qualquer" });
      expect(r.body.rotulo).toBeNull();
    });

    it("tira da árvore: continua no banco (e nas memórias), sai dos laços", async () => {
      const { body: p } = await adicionar(helena, { nome: "Tio Zé" });
      await ligar(helena, { tipo: "tios", de: p.id, para: helena.idPessoa });
      const memoria = await como(helena).post(`/api/familias/${helena.idFamilia}/memorias`).send({ tipo: "foto", pessoas: ["Tio Zé"] });

      expect((await como(helena).delete(`/api/pessoas/${p.id}`)).status).toBe(204);
      const a = (await arvore(helena)).body;
      expect(a.pessoas.find((x) => x.id === p.id).removida).toBe(true);
      expect(a.lacos.some((l) => l.de === p.id || l.para === p.id)).toBe(false);
      expect((await como(helena).get(`/api/memorias/${memoria.body.id}`)).body.pessoas).toEqual(["Tio Zé"]);
      // quem saiu não entra em laço novo
      expect((await ligar(helena, { tipo: "tios", de: p.id, para: helena.idPessoa })).status).toBe(400);
    });

    it("a dona não pode se tirar da própria árvore", async () => {
      const r = await como(helena).delete(`/api/pessoas/${helena.idPessoa}`);
      expect(r.status).toBe(409);
      expect(r.body.erro.codigo).toBe("VOCE_FICA");
    });
  });

  describe("dados inválidos e campos proibidos", () => {
    const erro = async (r, campo) => {
      expect(r.status).toBe(400);
      expect(r.body.erro.codigo).toBe("DADOS_INVALIDOS");
      if (campo) expect(Object.keys(r.body.erro.campos || {})).toContain(campo);
    };

    it("nome é opcional, como na tela (a árvore mostra o parentesco)", async () => {
      const r = await adicionar(helena, { genero: "f" });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({ nome: null, nomeCompleto: null, genero: "f" });
    });
    it("o cliente não escolhe papel, família nem conta", async () => {
      await erro(await adicionar(helena, { nome: "Intrusa", papel: "dona" }));
      await erro(await adicionar(helena, { nome: "Intrusa", id_familia: clara.idFamilia }));
      await erro(await como(helena).patch(`/api/pessoas/${helena.idPessoa}`).send({ idUsuario: 1 }));
      const [[{ n }]] = await pool.execute("SELECT COUNT(*) AS n FROM pessoa WHERE nome = 'Intrusa'");
      expect(n).toBe(0);
    });
    it("laço com a mesma pessoa nos dois lados", async () => erro(await ligar(helena, { tipo: "irmaos", de: helena.idPessoa, para: helena.idPessoa }), "para"));
    it("parentesco desconhecido", async () => erro(await ligar(helena, { tipo: "vizinho", de: 1, para: 2 }), "tipo"));
    it("data que não existe", async () => erro(await adicionar(helena, { nome: "X", nascimento: { modo: "dia", dia: 31, mes: 2, ano: 1950 } }), "nascimento.dia"));
    it("PATCH vazio", async () => erro(await como(helena).patch(`/api/pessoas/${helena.idPessoa}`).send({})));
  });

  describe("ninguém mexe na árvore dos outros", () => {
    let daHelena; // um familiar da Helena
    beforeAll(async () => {
      daHelena = (await adicionar(helena, { nome: "Segredo da Helena" })).body;
    });

    it("sem login → 401 em tudo", async () => {
      expect((await request(app).get(`/api/familias/${helena.idFamilia}/arvore`)).status).toBe(401);
      expect((await request(app).post(`/api/familias/${helena.idFamilia}/pessoas`).send({ nome: "X" })).status).toBe(401);
      expect((await request(app).patch(`/api/pessoas/${daHelena.id}`).send({ nome: "X" })).status).toBe(401);
      expect((await request(app).delete(`/api/pessoas/${daHelena.id}`)).status).toBe(401);
      expect((await request(app).post(`/api/familias/${helena.idFamilia}/lacos`).send({})).status).toBe(401);
      expect((await request(app).delete("/api/lacos/1")).status).toBe(401);
    });

    it("outra conta: não vê, não adiciona, não edita, não tira (404, igual a inexistente)", async () => {
      const ver = await arvore(clara, helena.idFamilia);
      expect(ver.status).toBe(404);
      expect(JSON.stringify(ver.body)).not.toContain("Segredo");
      expect((await adicionar(clara, { nome: "Intrusa 2" }, helena.idFamilia)).status).toBe(404);

      const editar = await como(clara).patch(`/api/pessoas/${daHelena.id}`).send({ nome: "Mudado" });
      expect(editar.status).toBe(404);
      expect(editar.body).toEqual((await como(clara).patch("/api/pessoas/2147483000").send({ nome: "Mudado" })).body);
      expect((await como(clara).delete(`/api/pessoas/${daHelena.id}`)).status).toBe(404);

      const [[p]] = await pool.execute("SELECT nome, removida_em FROM pessoa WHERE id_pessoa = ?", [daHelena.id]);
      expect(p).toEqual({ nome: "Segredo da Helena", removida_em: null });
    });

    it("não liga pessoas de famílias diferentes", async () => {
      // Clara tenta, na família DELA, ligar-se a uma pessoa da Helena
      const r = await ligar(clara, { tipo: "irmaos", de: clara.idPessoa, para: daHelena.id });
      expect(r.status).toBe(400);
      // e na família da Helena, nem chega a ver
      expect((await ligar(clara, { tipo: "irmaos", de: helena.idPessoa, para: daHelena.id }, helena.idFamilia)).status).toBe(404);
      const [[{ n }]] = await pool.execute("SELECT COUNT(*) AS n FROM laco WHERE id_de = ? OR id_para = ?", [daHelena.id, daHelena.id]);
      expect(n).toBe(0);
    });

    it("não desfaz laço da Helena", async () => {
      const { body: l } = await ligar(helena, { tipo: "primos", de: helena.idPessoa, para: daHelena.id });
      expect((await como(clara).delete(`/api/lacos/${l.id}`)).status).toBe(404);
      expect((await arvore(helena)).body.lacos.some((x) => x.id === l.id)).toBe(true);
    });

    it("com a conta ligada (membro, entrou pelo código): vê a árvore e muda só a própria pessoa", async () => {
      const [[{ id_usuario }]] = await pool.execute("SELECT id_usuario FROM pessoa WHERE id_pessoa = ?", [clara.idPessoa]);
      await pool.execute("UPDATE pessoa SET id_usuario = ? WHERE id_pessoa = ?", [id_usuario, daHelena.id]);
      const a = await arvore(clara, helena.idFamilia);
      expect(a.status).toBe(200);
      expect(a.body.pessoas.find((p) => p.voce).id).toBe(daHelena.id); // para ela, "você" é a pessoa dela
      expect((await como(clara).patch(`/api/pessoas/${daHelena.id}`).send({ nome: "Eu mesma" })).status).toBe(200);
      expect((await como(clara).patch(`/api/pessoas/${helena.idPessoa}`).send({ nome: "x" })).status).toBe(404);
      expect((await adicionar(clara, { nome: "x" }, helena.idFamilia)).status).toBe(404);
      await pool.execute("UPDATE pessoa SET id_usuario = NULL WHERE id_pessoa = ?", [daHelena.id]);
      expect((await arvore(clara, helena.idFamilia)).status).toBe(404);
    });
  });
});
