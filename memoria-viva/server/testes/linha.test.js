// Linha da vida: ordem pelas datas como a pessoa lembra, páginas sem repetir nem pular, filtros e privacidade.
// Cenário: Helena (dona, com memórias de todos os jeitos de data), Clara (membro), Beto (de fora).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";

describe.skipIf(!inject("temBanco"))("linha da vida (com banco)", () => {
  let app, pool, helena, clara, beto;
  const ids = {};

  const cadastrar = async (nome, extra = {}) => {
    const r = await request(app).post("/api/auth/cadastro").send(novaPessoa({ nome, familia: `Família de ${nome}`, ...extra }));
    return { token: cookieSessao(r), idUsuario: r.body.usuario.id, idFamilia: r.body.familias[0].id };
  };
  const como = (quem) => comCookie(app, quem.token);
  const linha = (quem, q = "", idFamilia = helena.idFamilia) => como(quem).get(`/api/familias/${idFamilia}/linha${q ? `?${q}` : ""}`);
  const guardar = async (nome, corpo) => {
    const r = await como(helena).post(`/api/familias/${helena.idFamilia}/memorias`).send({ tipo: "foto", titulo: nome, ...corpo });
    expect(r.status).toBe(201);
    ids[nome] = r.body.id;
  };
  /** Todas as páginas, seguindo "proxima". */
  async function todas(quem, q, limite) {
    const vistos = [];
    let depois = null;
    do {
      const r = await linha(quem, [q, `limite=${limite}`, depois && `depois=${depois}`].filter(Boolean).join("&"));
      expect(r.status).toBe(200);
      vistos.push(...r.body.memorias.map((m) => m.titulo));
      depois = r.body.proxima;
    } while (depois);
    return vistos;
  }

  beforeAll(async () => {
    ({ app, pool } = contexto());
    helena = await cadastrar("Helena");
    await pool.execute("UPDATE usuario SET id_plano = (SELECT id_plano FROM plano WHERE nome = 'Família') WHERE id_usuario = ?", [helena.idUsuario]);
    const codigo = (await como(helena).post(`/api/familias/${helena.idFamilia}/convite`)).body.codigo;
    clara = await cadastrar("Clara", { codigo });
    beto = await cadastrar("Beto");

    // guardadas fora de ordem de propósito
    await guardar("sem data 1", {});
    await guardar("dia 12/06/1957", { data: { modo: "dia", dia: 12, mes: 6, ano: 1957 }, pessoas: ["Vó Rosa"] });
    await guardar("década de 1950", { data: { modo: "decada", decada: 1950 } });
    await guardar("não sei", { data: { modo: "naosei" } });
    await guardar("por volta de 1957", { data: { modo: "ano", ano: 1957, aprox: true } });
    await guardar("período 1955–1960", { data: { modo: "periodo", ano: 1955, anoFim: 1960 }, etiquetas: ["juventude"] });
    await guardar("rascunho de 1950", { data: { modo: "ano", ano: 1950 }, status: "rascunho" });
    await guardar("junho de 1957", { data: { modo: "mes", mes: 6, ano: 1957 } });
    await guardar("1957", { data: { modo: "ano", ano: 1957 } });
    await guardar("sem data 2", {});
    await guardar("aniversário sem ano", { data: { modo: "dia", dia: 3, mes: 4 } });
    // álbum sem data própria, mas com uma foto de 1940: entra pela data da foto
    const foto = (await como(helena).post(`/api/familias/${helena.idFamilia}/arquivos?tipo=foto`).set("Content-Type", "image/jpeg")
      .send(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(50)]))).body.id;
    const album = await como(helena).post(`/api/familias/${helena.idFamilia}/memorias`).send({
      tipo: "album", titulo: "álbum com foto de 1940", itens: [{ idArquivo: foto, tipo: "foto", data: { modo: "ano", ano: 1940 }, marcas: [{ nome: "Tio Zé" }] }],
    });
    expect(album.status).toBe(201);
    // três memórias no mesmo ponto (empate total): ficam na ordem em que foram guardadas
    for (const n of ["empate A", "empate B", "empate C"]) await guardar(n, { data: { modo: "ano", ano: 2000 } });
  });
  afterAll(() => pool?.end());

  const ORDEM = [
    "álbum com foto de 1940",
    "década de 1950", // começa em 1950
    "período 1955–1960", // começa em 1955
    "1957", // começa em 1º de janeiro de 1957: antes de junho
    "por volta de 1957", // mesmo ponto que "1957", menos preciso
    "junho de 1957",
    "dia 12/06/1957",
    "empate A", "empate B", "empate C",
    // sem data, na ordem em que foram guardadas (não sei e "sem ano" também)
    "sem data 1", "não sei", "sem data 2", "aniversário sem ano",
  ];

  it("ordena pelo começo da data, o mais preciso primeiro no empate, e deixa 'sem data' no fim", async () => {
    const r = await linha(helena, "limite=60");
    expect(r.status).toBe(200);
    expect(r.body.memorias.map((m) => m.titulo)).toEqual(ORDEM);
    expect(r.body.total).toBe(ORDEM.length);
    expect(r.body.proxima).toBeNull();
    // a data volta do jeito que foi contada (nada inventado) e "sem data" vem marcado
    const porNome = Object.fromEntries(r.body.memorias.map((m) => [m.titulo, m]));
    expect(porNome["década de 1950"].data).toEqual({ modo: "decada", dia: null, mes: null, ano: null, anoFim: null, decada: 1950, aprox: false });
    expect(porNome["por volta de 1957"].data).toMatchObject({ modo: "ano", ano: 1957, aprox: true });
    expect(porNome["álbum com foto de 1940"]).toMatchObject({ data: null, semData: false, anoNaLinha: 1940 });
    expect(porNome["década de 1950"].anoNaLinha).toBe(1950);
    expect(porNome["dia 12/06/1957"].anoNaLinha).toBe(1957);
    expect(porNome["sem data 1"]).toMatchObject({ data: null, semData: true, anoNaLinha: null });
    expect(porNome["aniversário sem ano"]).toMatchObject({ data: { modo: "dia", dia: 3, mes: 4, ano: null }, semData: true });
  });

  it("rascunho não entra (nem para a dona)", async () => {
    expect((await linha(helena, "limite=60")).body.memorias.map((m) => m.titulo)).not.toContain("rascunho de 1950");
  });

  it("em páginas pequenas: a mesma ordem, sem repetir nem pular (inclusive nos empates)", async () => {
    for (const limite of [1, 2, 3, 4]) expect(await todas(helena, "", limite)).toEqual(ORDEM);
  });

  it("depois de editar ou apagar, a linha muda junto", async () => {
    await como(helena).put(`/api/memorias/${ids["sem data 2"]}`).send({ tipo: "foto", titulo: "sem data 2", data: { modo: "ano", ano: 1930 } });
    expect((await linha(helena, "limite=1")).body.memorias[0].titulo).toBe("sem data 2");
    await como(helena).delete(`/api/memorias/${ids["sem data 2"]}`);
    const r = await linha(helena, "limite=60");
    expect(r.body.memorias.map((m) => m.titulo)).toEqual(ORDEM.filter((t) => t !== "sem data 2"));
    expect(r.body.total).toBe(ORDEM.length - 1);
  });

  describe("filtros", () => {
    const titulos = async (q) => (await linha(helena, `limite=60&${q}`)).body.memorias.map((m) => m.titulo);

    it("ano: só o que cobre aquele ano de verdade (década sozinha não vira ano)", async () => {
      expect(await titulos("ano=1957")).toEqual(["período 1955–1960", "1957", "por volta de 1957", "junho de 1957", "dia 12/06/1957"]);
    });
    it("década: as datas dentro dela e a própria década", async () => {
      expect(await titulos("decada=1950")).toEqual(["década de 1950", "período 1955–1960", "1957", "por volta de 1957", "junho de 1957", "dia 12/06/1957"]);
    });
    it("intervalo: o que encosta nele (a década conta se não houver ano)", async () => {
      expect(await titulos("de=1935&ate=1952")).toEqual(["álbum com foto de 1940", "década de 1950"]);
    });
    it("etiqueta, pessoa (na memória ou marcada na foto) e tipo; o total segue o filtro", async () => {
      expect(await titulos("etiqueta=juventude")).toEqual(["período 1955–1960"]);
      expect(await titulos("etiqueta=juventude&etiqueta=natal")).toEqual([]); // as duas juntas
      expect(await titulos("pessoa=Vó Rosa")).toEqual(["dia 12/06/1957"]);
      expect(await titulos("pessoa=Tio Zé")).toEqual(["álbum com foto de 1940"]);
      const r = await linha(helena, "tipo=album");
      expect(r.body.memorias.map((m) => m.titulo)).toEqual(["álbum com foto de 1940"]);
      expect(r.body.total).toBe(1);
    });
    it("valores inválidos: 400", async () => {
      for (const q of ["depois=abc", "decada=1955", "tipo=pdf", "limite=500"]) expect((await linha(helena, q)).status).toBe(400);
    });
  });

  describe("quem vê", () => {
    it("o membro vê a mesma linha (só confirmadas)", async () => {
      const r = await linha(clara, "limite=60");
      expect(r.status).toBe(200);
      expect(r.body.memorias.map((m) => m.titulo)).toEqual((await linha(helena, "limite=60")).body.memorias.map((m) => m.titulo));
    });
    it("quem é de fora: 404, sem total, títulos ou contagem; sem login: 401", async () => {
      const r = await linha(beto, "limite=60");
      expect(r.status).toBe(404);
      expect(JSON.stringify(r.body)).not.toMatch(/total|1957|memorias/);
      expect((await linha(beto, "", 2147483000)).body).toEqual(r.body);
      expect((await request(app).get(`/api/familias/${helena.idFamilia}/linha`)).status).toBe(401);
    });
    it("a linha de cada um só tem o próprio acervo", async () => {
      const r = await linha(beto, "", beto.idFamilia);
      expect(r.body).toEqual({ memorias: [], total: 0, proxima: null });
    });
  });
});
