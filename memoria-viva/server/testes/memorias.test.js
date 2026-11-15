// Memórias: criar, listar e abrir, e principalmente QUEM consegue.
// Cenário: Helena (dona do acervo dela) e Clara (outra conta).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";

describe.skipIf(!inject("temBanco"))("memórias (com banco)", () => {
  let app, pool;
  let helena, clara; // { token, idFamilia, idUsuario, idPessoa }

  const entrarComo = async (nome) => {
    const r = await request(app).post("/api/auth/cadastro").send(novaPessoa({ nome, familia: `Família de ${nome}` }));
    const f = r.body.familias[0];
    return { token: cookieSessao(r), idFamilia: f.id, idPessoa: f.idPessoa, idUsuario: r.body.usuario.id };
  };
  const como = (quem) => comCookie(app, quem.token);
  const guardar = (quem, corpo, idFamilia = quem.idFamilia) =>
    como(quem).post(`/api/familias/${idFamilia}/memorias`).send(corpo);

  beforeAll(async () => {
    ({ app, pool } = contexto());
    helena = await entrarComo("Helena");
    clara = await entrarComo("Clara");
  });
  afterAll(() => pool?.end());

  describe("a dona guarda e vê", () => {
    it("receita completa: grava tudo e devolve igual", async () => {
      const r = await guardar(helena, {
        tipo: "receita",
        titulo: "Bolo de fubá com erva-doce",
        descricao: "Toda tarde de domingo.",
        data: { modo: "decada", decada: "1970" },
        lugar: "Campinas, SP",
        etiquetas: ["Infância", "Natal", "Natal"],
        detalhes: { quemFazia: "Vó Helena", ingredientes: ["2 xícaras de fubá", "1 colher de erva-doce"], preparo: "Misture tudo." },
      });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        tipo: "receita",
        titulo: "Bolo de fubá com erva-doce",
        status: "confirmada",
        data: { modo: "decada", decada: 1970, ano: null },
        etiquetas: ["Infância", "Natal"], // repetida entra uma vez só
        enviadaPor: { idPessoa: helena.idPessoa, nome: "Helena" },
        detalhes: { quemFazia: "Vó Helena", ingredientes: ["2 xícaras de fubá", "1 colher de erva-doce"], segredos: null },
      });
      expect(r.body.confirmadaEm).toBeTruthy();

      const aberta = await como(helena).get(`/api/memorias/${r.body.id}`);
      expect(aberta.status).toBe(200);
      expect(aberta.body).toEqual(r.body);
    });

    it("conselho, música, vídeo, foto e álbum", async () => {
      const casos = [
        { tipo: "conselho", detalhes: { frase: "Receba cada pessoa com café na mesa.", guardadoPara: "os netos" } },
        { tipo: "musica", titulo: "Asa Branca", detalhes: { artista: "Luiz Gonzaga", quemOuvia: "Meu pai" } },
        { tipo: "video", detalhes: { contexto: "Aniversário de 80 anos" } },
        { tipo: "foto", titulo: "O dia do casamento", data: { modo: "dia", dia: 12, mes: 6, ano: 1957 } },
        { tipo: "album", titulo: "Praia", status: "rascunho" },
      ];
      for (const c of casos) {
        const r = await guardar(helena, c);
        expect(r.status, c.tipo).toBe(201);
        expect(r.body.tipo).toBe(c.tipo);
      }
      const rascunho = await guardar(helena, { tipo: "foto", status: "rascunho" });
      expect(rascunho.body.confirmadaEm).toBeNull();
    });

    it("lista só o acervo dela, mais nova primeiro, com páginas", async () => {
      const r = await como(helena).get(`/api/familias/${helena.idFamilia}/memorias?limite=2`);
      expect(r.status).toBe(200);
      expect(r.body.memorias).toHaveLength(2);
      expect(r.body.memorias[0].id).toBeGreaterThan(r.body.memorias[1].id);
      expect(r.body.proxima).toBe(r.body.memorias[1].id);

      const p2 = await como(helena).get(`/api/familias/${helena.idFamilia}/memorias?limite=2&antesDe=${r.body.proxima}`);
      expect(p2.body.memorias[0].id).toBeLessThan(r.body.proxima);

      const tudo = await como(helena).get(`/api/familias/${helena.idFamilia}/memorias?limite=100`);
      expect(tudo.body.proxima).toBeNull();
      const [[{ n }]] = await pool.execute("SELECT COUNT(*) AS n FROM memoria WHERE id_familia = ?", [helena.idFamilia]);
      expect(tudo.body.memorias).toHaveLength(n);
    });
  });

  describe("ninguém mais vê (só a dona, por enquanto)", () => {
    let idDaHelena;
    beforeAll(async () => {
      idDaHelena = (await guardar(helena, { tipo: "conselho", detalhes: { frase: "Segredo da Helena." } })).body.id;
    });

    // "404 igual a inexistente": quem não pode ver não descobre nem que a memória existe
    const naoVe = async (quem) => {
      const r = await como(quem).get(`/api/memorias/${idDaHelena}`);
      expect(r.status).toBe(404);
      const inexistente = await como(quem).get("/api/memorias/2147483000");
      expect(r.body).toEqual(inexistente.body);
      const lista = await como(quem).get(`/api/familias/${helena.idFamilia}/memorias`);
      expect(lista.status).toBe(404);
      expect(JSON.stringify(lista.body)).not.toContain("Segredo");
    };

    it("sem login → 401 em tudo", async () => {
      expect((await request(app).get(`/api/memorias/${idDaHelena}`)).status).toBe(401);
      expect((await request(app).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(401);
      expect((await request(app).post(`/api/familias/${helena.idFamilia}/memorias`).send({ tipo: "foto" })).status).toBe(401);
    });

    it("outra conta não abre, não lista e não grava no acervo da Helena", async () => {
      await naoVe(clara);
      const [[{ antes }]] = await pool.execute("SELECT COUNT(*) AS antes FROM memoria WHERE id_familia = ?", [helena.idFamilia]);
      const r = await guardar(clara, { tipo: "foto", titulo: "Intrusa" }, helena.idFamilia);
      expect(r.status).toBe(404);
      const [[{ depois }]] = await pool.execute("SELECT COUNT(*) AS depois FROM memoria WHERE id_familia = ?", [helena.idFamilia]);
      expect(depois).toBe(antes);
    });

    // A partir daqui, a Clara entra no acervo da Helena de vários jeitos. NENHUM deve dar acesso.
    let claraNaHelena; // id_pessoa da Clara dentro da família da Helena
    const papel = (p) => pool.execute("UPDATE pessoa SET papel = ? WHERE id_pessoa = ?", [p, claraNaHelena]);

    it("estar na árvore como familiar, com conta vinculada, não dá acesso", async () => {
      const [r] = await pool.execute("INSERT INTO pessoa (id_familia, id_usuario, papel, nome) VALUES (?, ?, 'familiar', 'Clara')", [
        helena.idFamilia, clara.idUsuario,
      ]);
      claraNaHelena = r.insertId;
      await naoVe(clara);
    });

    it("parentesco (laço) não dá acesso", async () => {
      await pool.execute("INSERT INTO laco (id_familia, tipo, id_de, id_para) VALUES (?, 'avos', ?, ?)", [
        helena.idFamilia, helena.idPessoa, claraNaHelena,
      ]);
      await naoVe(clara);
    });

    it("aparecer na memória ou ser marcada na foto não dá acesso", async () => {
      await pool.execute("INSERT INTO memoria_pessoa (id_memoria, id_pessoa) VALUES (?, ?)", [idDaHelena, claraNaHelena]);
      const [item] = await pool.execute("INSERT INTO item_memoria (id_memoria, tipo, youtube_id) VALUES (?, 'youtube', 'x')", [idDaHelena]);
      await pool.execute("INSERT INTO marcacao (id_item, id_pessoa) VALUES (?, ?)", [item.insertId, claraNaHelena]);
      await naoVe(clara);
    });

    it("ajudante ainda não tem poderes definidos: não dá acesso", async () => {
      await papel("ajudante");
      await naoVe(clara);
      expect((await guardar(clara, { tipo: "foto" }, helena.idFamilia)).status).toBe(404);
    });

    it("compartilhamento ainda não vale nesta etapa: não dá acesso", async () => {
      await papel("familiar");
      await pool.execute("INSERT INTO compartilhamento (id_memoria, id_pessoa) VALUES (?, ?)", [idDaHelena, claraNaHelena]);
      await naoVe(clara);
    });

    it("estar no mesmo plano não dá acesso", async () => {
      const [[{ a }]] = await pool.execute("SELECT id_plano AS a FROM usuario WHERE id_usuario = ?", [helena.idUsuario]);
      const [[{ b }]] = await pool.execute("SELECT id_plano AS b FROM usuario WHERE id_usuario = ?", [clara.idUsuario]);
      expect(a).toBe(b); // as duas no Gratuito
      await naoVe(clara);
    });

    it("dona tirada da árvore perde o acesso", async () => {
      const [r] = await pool.execute("INSERT INTO pessoa (id_familia, id_usuario, papel, nome) VALUES (?, ?, 'dona', 'Clara')", [
        helena.idFamilia, clara.idUsuario,
      ]);
      // com papel de dona ela veria (é a regra); removida da árvore, deixa de ver
      expect((await como(clara).get(`/api/memorias/${idDaHelena}`)).status).toBe(200);
      await pool.execute("UPDATE pessoa SET removida_em = UTC_TIMESTAMP() WHERE id_pessoa = ?", [r.insertId]);
      await naoVe(clara);
    });

    it("sessão encerrada não abre mais nada", async () => {
      const { token } = await entrarComo("Marta");
      await comCookie(app, token).post("/api/auth/sair");
      expect((await comCookie(app, token).get(`/api/memorias/${idDaHelena}`)).status).toBe(401);
    });
  });

  describe("dados inválidos", () => {
    const erro = async (corpo, campo) => {
      const r = await guardar(helena, corpo);
      expect(r.status).toBe(400);
      expect(r.body.erro.codigo).toBe("DADOS_INVALIDOS");
      expect(Object.keys(r.body.erro.campos)).toContain(campo);
      return r;
    };

    it("tipo desconhecido", () => erro({ tipo: "poema" }, "tipo"));
    it("conselho sem frase", () => erro({ tipo: "conselho", detalhes: { frase: "  " } }, "detalhes.frase"));
    it("dia que não existe (31 de fevereiro)", () => erro({ tipo: "foto", data: { modo: "dia", dia: 31, mes: 2, ano: 1957 } }, "data.dia"));
    it("período ao contrário", () => erro({ tipo: "foto", data: { modo: "periodo", ano: 1980, anoFim: 1970 } }, "data.anoFim"));
    it("ano no futuro", () => erro({ tipo: "foto", data: { modo: "ano", ano: new Date().getFullYear() + 1 } }, "data.ano"));
    it("título grande demais", () => erro({ tipo: "foto", titulo: "x".repeat(151) }, "titulo"));
    it("status 'aguardando' não é da dona", () => erro({ tipo: "foto", status: "aguardando" }, "status"));

    it("nada é gravado quando o dado é inválido", async () => {
      const [[{ antes }]] = await pool.query("SELECT COUNT(*) AS antes FROM data_flexivel");
      await guardar(helena, { tipo: "foto", data: { modo: "dia", dia: 31, mes: 2, ano: 1957 } });
      const [[{ depois }]] = await pool.query("SELECT COUNT(*) AS depois FROM data_flexivel");
      expect(depois).toBe(antes);
    });

    it("id que não é número → 404", async () => {
      expect((await como(helena).get("/api/memorias/abc")).status).toBe(404);
      expect((await como(helena).get("/api/familias/-1/memorias")).status).toBe(404);
    });
  });
});
