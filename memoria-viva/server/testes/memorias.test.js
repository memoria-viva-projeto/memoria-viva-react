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
    it("álbum completo: grava tudo e devolve igual (a data fica nas colunas da própria memória)", async () => {
      const r = await guardar(helena, {
        tipo: "album",
        titulo: "Domingos na casa da vó",
        descricao: "Toda tarde de domingo.",
        data: { modo: "decada", decada: "1970" },
        lugar: "Campinas, SP",
        etiquetas: ["Infância", "Natal", "Natal"],
        pessoas: ["Antônio", "Vó Rosa", "Antônio"],
      });
      expect(r.status).toBe(201);
      expect(r.body).toMatchObject({
        tipo: "album",
        titulo: "Domingos na casa da vó",
        status: "confirmada",
        data: { modo: "decada", decada: 1970, ano: null },
        etiquetas: ["Infância", "Natal"], // repetida entra uma vez só
        pessoas: ["Antônio", "Vó Rosa"], // repetido entra uma vez só
        enviadaPor: { idPessoa: helena.idPessoa, nome: "Helena" },
      });
      expect(r.body).not.toHaveProperty("detalhes");
      expect(r.body.confirmadaEm).toBeTruthy();
      const [[l]] = await pool.execute("SELECT data_modo, data_ano, data_aprox FROM memoria WHERE id_memoria = ?", [r.body.id]);
      expect(l).toEqual({ data_modo: "decada", data_ano: 1970, data_aprox: 0 });

      const aberta = await como(helena).get(`/api/memorias/${r.body.id}`);
      expect(aberta.status).toBe(200);
      expect(aberta.body).toEqual(r.body);
    });

    it("foto e álbum; os tipos que saíram do projeto são recusados", async () => {
      const casos = [
        { tipo: "foto", titulo: "O dia do casamento", data: { modo: "dia", dia: 12, mes: 6, ano: 1957 } },
        { tipo: "foto", titulo: "Por volta de 1975", data: { modo: "ano", ano: 1975, aprox: true } },
        { tipo: "album", titulo: "Praia", status: "rascunho" },
      ];
      for (const c of casos) {
        const r = await guardar(helena, c);
        expect(r.status, c.titulo).toBe(201);
        expect(r.body.tipo).toBe(c.tipo);
        if (c.data) expect(r.body.data).toMatchObject(c.data);
      }
      for (const tipo of ["receita", "musica", "video", "conselho"]) {
        const r = await guardar(helena, { tipo, titulo: "Não entra" });
        expect(r.status, tipo).toBe(400);
        expect(Object.keys(r.body.erro.campos)).toContain("tipo");
      }
      const rascunho = await guardar(helena, { tipo: "foto", status: "rascunho" });
      expect(rascunho.body.confirmadaEm).toBeNull();
    });

    it("história longa, dentro dos limites, é aceita (o corpo passa de 100 KB)", async () => {
      const r = await guardar(helena, { tipo: "foto", descricao: "ã".repeat(50000) });
      expect(r.status).toBe(201);
      expect(r.body.descricao).toHaveLength(50000);
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
      // cada item da lista já vem completo, igual ao abrir (a tela não precisa abrir uma por uma)
      for (const item of tudo.body.memorias) {
        expect(item, `memória ${item.id}`).toEqual((await como(helena).get(`/api/memorias/${item.id}`)).body);
      }
      const [[{ n }]] = await pool.execute("SELECT COUNT(*) AS n FROM memoria WHERE id_familia = ?", [helena.idFamilia]);
      expect(tudo.body.memorias).toHaveLength(n);
    });
  });

  describe("quem vê o acervo: a dona e quem entrou na família; mais ninguém", () => {
    let idDaHelena;
    beforeAll(async () => {
      idDaHelena = (await guardar(helena, { tipo: "foto", titulo: "Segredo da Helena." })).body.id;
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

    // A partir daqui, a Clara aparece no acervo da Helena de vários jeitos. Enquanto a pessoa "Clara" da árvore
    // não estiver ligada à CONTA da Clara (o que só acontece entrando pelo código), NENHUM deles dá acesso.
    let claraNaHelena; // id_pessoa da Clara dentro da família da Helena
    const papel = (p) => pool.execute("UPDATE pessoa SET papel = ? WHERE id_pessoa = ?", [p, claraNaHelena]);

    it("estar na árvore, sem a conta ligada, não dá acesso", async () => {
      const [r] = await pool.execute("INSERT INTO pessoa (id_familia, papel, nome) VALUES (?, 'familiar', 'Clara')", [helena.idFamilia]);
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
      const [arq] = await pool.execute(
        "INSERT INTO arquivo (id_familia, tipo, mime, tamanho_bytes, enviado_por) VALUES (?, 'foto', 'image/jpeg', 1, ?)",
        [helena.idFamilia, helena.idUsuario],
      );
      const [item] = await pool.execute("INSERT INTO item_memoria (id_memoria, tipo, id_arquivo) VALUES (?, 'foto', ?)", [idDaHelena, arq.insertId]);
      await pool.execute("INSERT INTO marcacao (id_item, id_pessoa) VALUES (?, ?)", [item.insertId, claraNaHelena]);
      await naoVe(clara);
    });

    it("papel de ajudante, sem a conta ligada, não dá acesso", async () => {
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

    it("com a conta ligada (quem entra pelo código): vê, mas não grava; tirada da árvore, deixa de ver", async () => {
      await pool.execute("UPDATE pessoa SET id_usuario = ? WHERE id_pessoa = ?", [clara.idUsuario, claraNaHelena]);
      expect((await como(clara).get(`/api/memorias/${idDaHelena}`)).status).toBe(200);
      expect((await como(clara).get(`/api/familias/${helena.idFamilia}/memorias`)).status).toBe(200);
      expect((await guardar(clara, { tipo: "foto" }, helena.idFamilia)).status).toBe(404);
      expect((await como(clara).delete(`/api/memorias/${idDaHelena}`)).status).toBe(404);
      await pool.execute("UPDATE pessoa SET removida_em = UTC_TIMESTAMP() WHERE id_pessoa = ?", [claraNaHelena]);
      await naoVe(clara);
    });

    it("sessão encerrada não abre mais nada", async () => {
      const { token } = await entrarComo("Marta");
      await comCookie(app, token).post("/api/auth/sair");
      expect((await comCookie(app, token).get(`/api/memorias/${idDaHelena}`)).status).toBe(401);
    });
  });

  describe("editar", () => {
    const contar = async (tabela, idMemoria) =>
      (await pool.execute(`SELECT COUNT(*) AS n FROM ${tabela} WHERE id_memoria = ?`, [idMemoria]))[0][0].n;

    it("a dona edita: tudo é trocado, nada fica duplicado", async () => {
      const r = await guardar(helena, {
        tipo: "foto", titulo: "Natal", data: { modo: "ano", ano: 1980 }, etiquetas: ["Natal"], pessoas: ["Rosa"],
      });
      const id = r.body.id;
      const e = await como(helena).put(`/api/memorias/${id}`).send({
        tipo: "foto", titulo: "Natal na casa da Rosa", data: { modo: "decada", decada: 1970 }, etiquetas: ["Páscoa"], pessoas: ["Rosa", "Zé"],
      });
      expect(e.status).toBe(200);
      expect(e.body).toMatchObject({
        id, titulo: "Natal na casa da Rosa", data: { modo: "decada", decada: 1970, ano: null }, etiquetas: ["Páscoa"], pessoas: ["Rosa", "Zé"],
      });
      expect(e.body.atualizadaEm).toBeTruthy();
      expect(e.body.confirmadaEm).toEqual(r.body.confirmadaEm); // a primeira confirmação continua
      expect(await contar("memoria_etiqueta", id)).toBe(1);
      expect(await contar("memoria_pessoa", id)).toBe(2);
      // sem data na edição: as colunas da data ficam vazias
      const semData = await como(helena).put(`/api/memorias/${id}`).send({ tipo: "foto", titulo: "Sem data" });
      expect(semData.body.data).toBeNull();
      const [[l]] = await pool.execute("SELECT data_modo, data_ano FROM memoria WHERE id_memoria = ?", [id]);
      expect(l).toEqual({ data_modo: null, data_ano: null });
      expect((await como(helena).get(`/api/memorias/${id}`)).body).toEqual(semData.body);
    });

    it("não muda o tipo nem volta a rascunho", async () => {
      const id = (await guardar(helena, { tipo: "foto", titulo: "Bolo" })).body.id;
      const t = await como(helena).put(`/api/memorias/${id}`).send({ tipo: "album", titulo: "Bolo" });
      expect(t.status).toBe(400);
      expect(Object.keys(t.body.erro.campos)).toContain("tipo");
      const s = await como(helena).put(`/api/memorias/${id}`).send({ tipo: "foto", status: "rascunho" });
      expect(s.status).toBe(400);
      expect(Object.keys(s.body.erro.campos)).toContain("status");
      const rasc = (await guardar(helena, { tipo: "foto", status: "rascunho" })).body.id;
      const c = await como(helena).put(`/api/memorias/${rasc}`).send({ tipo: "foto", status: "confirmada" });
      expect(c.body.confirmadaEm).toBeTruthy();
    });

    it("outra conta não edita (404) e nada muda; sem login → 401", async () => {
      const id = (await guardar(helena, { tipo: "foto", titulo: "Original." })).body.id;
      const r = await como(clara).put(`/api/memorias/${id}`).send({ tipo: "foto", titulo: "Invadido." });
      expect(r.status).toBe(404);
      expect((await request(app).put(`/api/memorias/${id}`).send({ tipo: "foto", titulo: "x" })).status).toBe(401);
      expect((await como(helena).get(`/api/memorias/${id}`)).body.titulo).toBe("Original.");
    });
  });

  describe("apagar", () => {
    const contar = async (tabela, idMemoria) =>
      (await pool.execute(`SELECT COUNT(*) AS n FROM ${tabela} WHERE id_memoria = ?`, [idMemoria]))[0][0].n;

    it("a dona apaga a memória e tudo o que é dela", async () => {
      const r = await guardar(helena, {
        tipo: "foto", titulo: "Natal", data: { modo: "ano", ano: 1980 }, etiquetas: ["Natal"], pessoas: ["Rosa"],
      });
      const id = r.body.id;

      const apagou = await como(helena).delete(`/api/memorias/${id}`);
      expect(apagou.status).toBe(204);
      expect((await como(helena).get(`/api/memorias/${id}`)).status).toBe(404);
      for (const t of ["memoria", "memoria_etiqueta", "memoria_pessoa"]) expect(await contar(t, id), t).toBe(0);
      // apagar de novo: já não existe
      expect((await como(helena).delete(`/api/memorias/${id}`)).status).toBe(404);
    });

    it("apaga mesmo com item, marcação, comentário, reação, compartilhamento e palpite da IA", async () => {
      const id = (await guardar(helena, { tipo: "foto" })).body.id;
      const [arq] = await pool.execute(
        "INSERT INTO arquivo (id_familia, tipo, mime, tamanho_bytes, enviado_por) VALUES (?, 'foto', 'image/jpeg', 1, ?)",
        [helena.idFamilia, helena.idUsuario],
      );
      const [{ insertId: id_item }] = await pool.execute("INSERT INTO item_memoria (id_memoria, tipo, id_arquivo) VALUES (?, 'foto', ?)", [id, arq.insertId]);
      await pool.execute("INSERT INTO marcacao (id_item, id_pessoa) VALUES (?, ?)", [id_item, helena.idPessoa]);
      await pool.execute("INSERT INTO comentario (id_memoria, id_pessoa, texto) VALUES (?, ?, 'Que saudade')", [id, helena.idPessoa]);
      await pool.execute("INSERT INTO reacao (id_memoria, id_pessoa) VALUES (?, ?)", [id, helena.idPessoa]);
      await pool.execute("INSERT INTO compartilhamento (id_memoria, id_pessoa) VALUES (?, ?)", [id, helena.idPessoa]);
      await pool.execute("INSERT INTO sugestao_ia (id_memoria, id_item, campo, texto) VALUES (?, ?, 'data', '1970')", [id, id_item]);

      expect((await como(helena).delete(`/api/memorias/${id}`)).status).toBe(204);
      for (const t of ["memoria", "item_memoria", "comentario", "reacao", "compartilhamento", "sugestao_ia"]) {
        expect(await contar(t, id), t).toBe(0);
      }
      const [[{ n }]] = await pool.execute("SELECT COUNT(*) AS n FROM marcacao WHERE id_item = ?", [id_item]);
      expect(n).toBe(0);
    });

    it("outra conta não apaga (404, igual a inexistente) e a memória continua lá", async () => {
      const id = (await guardar(helena, { tipo: "foto", titulo: "Não apague." })).body.id;
      const r = await como(clara).delete(`/api/memorias/${id}`);
      expect(r.status).toBe(404);
      expect(r.body).toEqual((await como(clara).delete("/api/memorias/2147483000")).body);
      expect(await contar("memoria", id)).toBe(1);
      expect((await request(app).delete(`/api/memorias/${id}`)).status).toBe(401);
      expect((await como(helena).delete("/api/memorias/abc")).status).toBe(404);
      expect(await contar("memoria", id)).toBe(1);
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
    it("dia que não existe (31 de fevereiro)", () => erro({ tipo: "foto", data: { modo: "dia", dia: 31, mes: 2, ano: 1957 } }, "data.dia"));
    it("período ao contrário", () => erro({ tipo: "foto", data: { modo: "periodo", ano: 1980, anoFim: 1970 } }, "data.anoFim"));
    it("ano no futuro", () => erro({ tipo: "foto", data: { modo: "ano", ano: new Date().getFullYear() + 1 } }, "data.ano"));
    it("título grande demais", () => erro({ tipo: "foto", titulo: "x".repeat(151) }, "titulo"));
    it("status 'aguardando' não é da dona", () => erro({ tipo: "foto", status: "aguardando" }, "status"));
    it("nome de pessoa grande demais", () => erro({ tipo: "foto", pessoas: ["x".repeat(81)] }, "pessoas.0"));

    it("nada é gravado quando o dado é inválido", async () => {
      const [[{ antes }]] = await pool.query("SELECT COUNT(*) AS antes FROM memoria");
      await guardar(helena, { tipo: "foto", data: { modo: "dia", dia: 31, mes: 2, ano: 1957 } });
      const [[{ depois }]] = await pool.query("SELECT COUNT(*) AS depois FROM memoria");
      expect(depois).toBe(antes);
    });

    it("id que não é número → 404", async () => {
      expect((await como(helena).get("/api/memorias/abc")).status).toBe(404);
      expect((await como(helena).get("/api/familias/-1/memorias")).status).toBe(404);
    });
  });
});
