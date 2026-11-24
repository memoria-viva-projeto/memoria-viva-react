// Arquivos (fotos) e o ciclo completo das memórias com fotos.
// Cenário: Helena (dona, plano Família), Clara (entrou na família da Helena pelo código), Beto (outra conta, de fora).
import { existsSync } from "node:fs";
import { rm, utimes } from "node:fs/promises";
import { Readable } from "node:stream";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { comCookie, contexto, cookieSessao, novaPessoa } from "./ajuda.js";
import { armazenamentoConfigurado, criarArmazenamento } from "../armazenamento.js";
import { enviar, enviarMiniatura, faxina, tipoReal } from "../servicos/arquivos.js";

// conteúdos pequenos com a "assinatura" certa de cada formato
const JPEG = (extra = 200) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]), Buffer.alloc(extra, 7)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(100, 2)]);
const OGG = Buffer.concat([Buffer.from("OggS"), Buffer.alloc(100, 3)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(60, 4)]);
const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(40, 5)]);
const TEXTO = Buffer.from("<html><script>alert(1)</script></html>");

describe("tipo real do arquivo pelos primeiros bytes (sem banco)", () => {
  it("aceita só a lista de formatos, conferindo o conteúdo", () => {
    expect(tipoReal(JPEG(), "foto")).toBe("image/jpeg");
    expect(tipoReal(PNG, "foto")).toBe("image/png");
    expect(tipoReal(JPEG(), "miniatura")).toBe("image/jpeg");
  });
  it("recusa conteúdo que não confere com o tipo pedido", () => {
    expect(tipoReal(TEXTO, "foto")).toBeNull();
    expect(tipoReal(MP4, "foto")).toBeNull();
    expect(tipoReal(HEIC, "foto")).toBeNull();
    expect(tipoReal(MP4, "video")).toBeNull(); // vídeo e áudio saíram do projeto
    expect(tipoReal(OGG, "audio")).toBeNull();
    expect(tipoReal(WEBM, "audio")).toBeNull();
    expect(tipoReal(PNG, "miniatura")).toBeNull();
    expect(tipoReal(JPEG(), "audio")).toBeNull();
  });
});

describe.skipIf(!inject("temBanco"))("arquivos e memórias com fotos (com banco)", () => {
  let app, pool, config, arm;
  let helena, clara, beto;

  const cadastrar = async (nome, extra = {}) => {
    const r = await request(app).post("/api/auth/cadastro").send(novaPessoa({ nome, familia: `Família de ${nome}`, ...extra }));
    return { token: cookieSessao(r), idUsuario: r.body.usuario.id, idFamilia: r.body.familias[0].id, familias: r.body.familias };
  };
  const como = (quem) => comCookie(app, quem.token);
  const subir = (quem, conteudo, { tipo = "foto", idFamilia = quem.idFamilia, mime = "image/jpeg", q = "" } = {}) =>
    como(quem).post(`/api/familias/${idFamilia}/arquivos?tipo=${tipo}${q}`).set("Content-Type", mime).send(conteudo);
  const novaMemoria = (quem, corpo) => como(quem).post(`/api/familias/${quem.idFamilia}/memorias`).send(corpo);
  const baixar = (quem, id, mini = false) =>
    como(quem).get(`/api/arquivos/${id}${mini ? "?mini=1" : ""}`).buffer(true).parse((res, cb) => {
      const partes = []; res.on("data", (c) => partes.push(c)); res.on("end", () => cb(null, Buffer.concat(partes)));
    });
  // { subpasta, nome } do arquivo no armazenamento (o que a tabela arquivo guarda)
  const localNoDisco = async (id) => {
    const [[a]] = await pool.execute("SELECT subpasta, nome_arquivo FROM arquivo WHERE id_arquivo = ?", [id]);
    return { subpasta: a.subpasta, nome: a.nome_arquivo };
  };
  const foto = (idArquivo, extra = {}) => ({ idArquivo, tipo: "foto", ...extra });

  beforeAll(async () => {
    ({ app, pool, config } = contexto());
    arm = criarArmazenamento(config.arquivosPasta);
    helena = await cadastrar("Helena");
    await pool.execute("UPDATE usuario SET id_plano = (SELECT id_plano FROM plano WHERE nome = 'Família') WHERE id_usuario = ?", [helena.idUsuario]);
    const codigo = (await como(helena).post(`/api/familias/${helena.idFamilia}/convite`)).body.codigo;
    clara = await cadastrar("Clara", { codigo });
    clara.naHelena = clara.familias.find((f) => f.id === helena.idFamilia).idPessoa;
    beto = await cadastrar("Beto");
  });
  afterAll(async () => {
    await pool?.end();
    await rm(config.arquivosPasta, { recursive: true, force: true });
  });

  describe("enviar", () => {
    it("sem login: 401", async () => {
      expect((await request(app).post(`/api/familias/${helena.idFamilia}/arquivos?tipo=foto`).set("Content-Type", "image/jpeg").send(JPEG())).status).toBe(401);
    });

    it("foto: grava, devolve os dados (sem caminho interno) e entrega o mesmo conteúdo, protegido", async () => {
      const conteudo = JPEG(500);
      const r = await subir(helena, conteudo, { q: "&largura=1600&altura=1200&nome=casamento.jpg" });
      expect(r.status).toBe(201);
      expect(r.body).toEqual({ id: expect.any(Number), tipo: "foto", mime: "image/jpeg", tamanho: conteudo.length, largura: 1600, altura: 1200, temMiniatura: false });
      expect(JSON.stringify(r.body)).not.toMatch(/subpasta|nome_arquivo|caminho|armazenamento/);
      // no banco: só a subpasta do acervo e o nome aleatório (nenhuma URL)
      const [[linha]] = await pool.execute("SELECT * FROM arquivo WHERE id_arquivo = ?", [r.body.id]);
      expect(linha.subpasta).toBe(`familias/${helena.idFamilia}`);
      expect(linha.nome_arquivo).toMatch(/^[a-f0-9]{32}$/);
      expect(linha).not.toHaveProperty("url");
      expect(existsSync(arm.caminho(await localNoDisco(r.body.id)))).toBe(true);
      const b = await baixar(helena, r.body.id);
      expect(b.status).toBe(200);
      expect(b.body.equals(conteudo)).toBe(true);
      expect(b.headers["content-type"]).toBe("image/jpeg");
      expect(b.headers["cache-control"]).toBe("private, no-cache");
      expect(b.headers["x-content-type-options"]).toBe("nosniff");
      // sem miniatura, a foto inteira serve como miniatura
      expect((await baixar(helena, r.body.id, true)).body.equals(conteudo)).toBe(true);
    });

    it("áudio e vídeo não entram mais", async () => {
      const antes = (await arm.listar()).length;
      expect((await subir(helena, OGG, { tipo: "audio", mime: "audio/ogg" })).status).toBe(400);
      expect((await subir(helena, MP4, { tipo: "video", mime: "video/mp4" })).status).toBe(400);
      expect((await arm.listar()).length).toBe(antes);
    });

    it("conteúdo que não confere, arquivo vazio, tipo desconhecido: recusa e não guarda nada", async () => {
      const antes = (await arm.listar()).length;
      const texto = await subir(helena, TEXTO);
      expect(texto.status).toBe(415);
      expect(texto.body.erro.codigo).toBe("TIPO_NAO_ACEITO");
      expect((await subir(helena, HEIC, { mime: "image/heic" })).status).toBe(415);
      expect((await subir(helena, Buffer.alloc(0))).body.erro.codigo).toBe("ARQUIVO_VAZIO");
      expect((await subir(helena, JPEG(), { tipo: "pdf" })).status).toBe(400);
      expect((await arm.listar()).length).toBe(antes);
    });

    it("grande demais: recusa pelo tamanho declarado, ou para no meio se passar do limite; nada fica no disco", async () => {
      const { body } = await subir(helena, JPEG());
      const antes = (await arm.listar()).length;
      const dados = { idUsuario: helena.idUsuario, idArquivo: body.id };
      // declarou 3 MB (miniatura vai até 2 MB): nem começa a receber
      await expect(enviarMiniatura(pool, arm, { ...dados, entrada: Readable.from([JPEG()]), tamanhoDeclarado: 3 * 1024 * 1024 }))
        .rejects.toMatchObject({ status: 413, codigo: "ARQUIVO_GRANDE" });
      // sem tamanho declarado (envio em partes): para quando passa do limite e apaga o pedaço
      const pedacos = Array.from({ length: 5 }, (_, k) => (k === 0 ? JPEG(512 * 1024) : Buffer.alloc(512 * 1024, 9)));
      await expect(enviarMiniatura(pool, arm, { ...dados, entrada: Readable.from(pedacos), tamanhoDeclarado: null }))
        .rejects.toMatchObject({ status: 413, codigo: "ARQUIVO_GRANDE" });
      expect((await arm.listar()).length).toBe(antes);
    });

    it("só a dona envia para o acervo: membro e gente de fora recebem 404", async () => {
      expect((await subir(clara, JPEG(), { idFamilia: helena.idFamilia })).status).toBe(404);
      expect((await subir(beto, JPEG(), { idFamilia: helena.idFamilia })).status).toBe(404);
    });

    it("espaço do plano: quando acaba, recusa (507) e não guarda nada", async () => {
      const ana = await cadastrar("Ana"); // plano Grátis: 1 GB
      await pool.execute(
        "INSERT INTO arquivo (id_familia, tipo, mime, tamanho_bytes, enviado_por) VALUES (?, 'foto', 'image/jpeg', ?, ?)",
        [ana.idFamilia, Math.floor(1 * 1024 ** 3) - 50, ana.idUsuario],
      );
      const antes = (await arm.listar()).length;
      const r = await subir(ana, JPEG());
      expect(r.status).toBe(507);
      expect(r.body.erro.codigo).toBe("ESPACO_CHEIO");
      expect((await arm.listar()).length).toBe(antes);
    });

    it("miniatura: só JPEG, na mesma subpasta do arquivo; a antiga sai do disco", async () => {
      const { body } = await subir(helena, PNG, { mime: "image/png" });
      expect((await como(helena).put(`/api/arquivos/${body.id}/miniatura`).set("Content-Type", "image/png").send(PNG)).status).toBe(415);
      const m1 = await como(helena).put(`/api/arquivos/${body.id}/miniatura`).set("Content-Type", "image/jpeg").send(JPEG(10));
      expect(m1.body.temMiniatura).toBe(true);
      const [[a]] = await pool.execute("SELECT subpasta, nome_miniatura FROM arquivo WHERE id_arquivo = ?", [body.id]);
      const antiga = { subpasta: a.subpasta, nome: a.nome_miniatura };
      expect(existsSync(arm.caminho(antiga))).toBe(true);
      await como(helena).put(`/api/arquivos/${body.id}/miniatura`).set("Content-Type", "image/jpeg").send(JPEG(20));
      expect(existsSync(arm.caminho(antiga))).toBe(false);
      expect((await baixar(helena, body.id, true)).body.length).toBe(JPEG(20).length);
      expect((await como(beto).put(`/api/arquivos/${body.id}/miniatura`).set("Content-Type", "image/jpeg").send(JPEG())).status).toBe(404);
    });

    it("o banco falha depois de gravar no disco: o arquivo do disco é apagado na hora", async () => {
      const quebrado = {
        execute: (...a) => pool.execute(...a),
        query: (...a) => pool.query(...a),
        getConnection: async () => {
          const c = await pool.getConnection();
          return new Proxy(c, {
            get(t, p) {
              if (p === "execute") return (sql, params) => (sql.startsWith("INSERT INTO arquivo") ? Promise.reject(Object.assign(new Error("caiu"), { code: "ER_TESTE" })) : t.execute(sql, params));
              const v = t[p];
              return typeof v === "function" ? v.bind(t) : v;
            },
          });
        },
      };
      const antes = (await arm.listar()).length;
      await expect(enviar(quebrado, arm, {
        idUsuario: helena.idUsuario, idFamilia: helena.idFamilia, entrada: Readable.from([JPEG()]), tamanhoDeclarado: null,
        meta: { tipo: "foto", largura: null, altura: null, nome: null },
      })).rejects.toMatchObject({ code: "ER_TESTE" });
      expect((await arm.listar()).length).toBe(antes);
    });

    it("envio interrompido no meio: nada fica no disco", async () => {
      const antes = (await arm.listar()).length;
      const quebra = new Readable({ read() { this.push(JPEG()); this.destroy(Object.assign(new Error("caiu a conexão"), { code: "ECONNRESET" })); } });
      await expect(enviar(pool, arm, {
        idUsuario: helena.idUsuario, idFamilia: helena.idFamilia, entrada: quebra, tamanhoDeclarado: null,
        meta: { tipo: "foto", largura: null, altura: null, nome: null },
      })).rejects.toMatchObject({ codigo: "ENVIO_INCOMPLETO" });
      expect((await arm.listar()).length).toBe(antes);
    });
  });

  describe("quem vê cada arquivo", () => {
    let solta, naMemoria, noRascunho;

    beforeAll(async () => {
      solta = (await subir(helena, JPEG())).body.id;
      naMemoria = (await subir(helena, JPEG())).body.id;
      noRascunho = (await subir(helena, JPEG())).body.id;
      await novaMemoria(helena, { tipo: "foto", titulo: "Praia", itens: [foto(naMemoria)] });
      await novaMemoria(helena, { tipo: "foto", titulo: "Ainda escrevendo", status: "rascunho", itens: [foto(noRascunho)] });
    });

    it("a dona vê todos os do acervo, inclusive os que ainda não usou", async () => {
      for (const id of [solta, naMemoria, noRascunho]) expect((await baixar(helena, id)).status).toBe(200);
    });

    it("o membro vê só os de memórias confirmadas", async () => {
      expect((await baixar(clara, naMemoria)).status).toBe(200);
      expect((await baixar(clara, solta)).status).toBe(404);
      expect((await baixar(clara, noRascunho)).status).toBe(404);
    });

    it("trocando o número: quem é de fora não vê nada (404, igual a um número que não existe)", async () => {
      const respostas = [await baixar(beto, naMemoria), await baixar(beto, solta), await baixar(beto, 2147483000)];
      expect(respostas.map((r) => r.status)).toEqual([404, 404, 404]);
      expect(respostas[0].body.toString()).toBe(respostas[2].body.toString());
      expect((await request(app).get(`/api/arquivos/${naMemoria}`)).status).toBe(401);
    });

    it("usar o arquivo de outra família numa memória: recusa", async () => {
      const r = await novaMemoria(beto, { tipo: "foto", itens: [foto(naMemoria)] });
      expect(r.status).toBe(400);
      expect(Object.keys(r.body.erro.campos)).toEqual(["itens.0"]);
      // e a capa também não serve de porta
      expect((await novaMemoria(beto, { tipo: "foto", capa: naMemoria })).status).toBe(400);
    });

    it("tirada da árvore: perde o acesso aos arquivos na hora", async () => {
      expect((await como(helena).delete(`/api/pessoas/${clara.naHelena}`)).status).toBe(204);
      expect((await baixar(clara, naMemoria)).status).toBe(404);
    });
  });

  describe("memória com fotos: criar, abrir, editar, apagar", () => {
    let a1, a2, a3, a4, idAlbum, versao;

    beforeAll(async () => {
      [a1, a2, a3] = [(await subir(helena, JPEG())).body.id, (await subir(helena, JPEG())).body.id, (await subir(helena, JPEG())).body.id];
      a4 = (await subir(helena, PNG, { mime: "image/png" })).body.id;
    });

    it("cria o álbum com ordem, capa, legendas, datas, etiquetas e pessoas marcadas, e abre igual depois", async () => {
      const r = await novaMemoria(helena, {
        tipo: "album", titulo: "Natal de 1975", capa: a2, data: { modo: "ano", ano: 1975 },
        itens: [
          foto(a1, { legenda: "A mesa", marcas: [{ nome: "Vó Rosa", x: 0.25, y: 0.5 }, { nome: "Tio Zé" }], etiquetas: ["natal"] }),
          foto(a2, { legenda: "A árvore", data: { modo: "dia", dia: 24, mes: 12, ano: 1975 }, lugar: "Casa da vó" }),
          foto(a3, { observacao: "Foi o ano da neve." }),
          foto(a4, { anexo: true }),
        ],
      });
      expect(r.status).toBe(201);
      idAlbum = r.body.id;
      versao = r.body.versao;
      const aberto = (await como(helena).get(`/api/memorias/${idAlbum}`)).body;
      expect(aberto.capa).toBe(a2);
      expect(aberto.itens.map((it) => it.idArquivo)).toEqual([a1, a2, a3, a4]);
      expect(aberto.itens[0]).toMatchObject({
        tipo: "foto", anexo: false, legenda: "A mesa", etiquetas: ["natal"],
        marcas: [{ nome: "Vó Rosa", x: 0.25, y: 0.5 }, { nome: "Tio Zé", x: null, y: null }],
        arquivo: { mime: "image/jpeg", temMiniatura: false },
      });
      expect(aberto.itens[1]).toMatchObject({ data: { modo: "dia", dia: 24, mes: 12, ano: 1975 }, lugar: "Casa da vó" });
      expect(aberto.itens[3]).toMatchObject({ tipo: "foto", anexo: true, arquivo: { mime: "image/png" } });
      expect(JSON.stringify(aberto)).not.toMatch(/subpasta|nome_arquivo|nome_miniatura/);
    });

    it("item com tipo trocado ou repetido, ou capa que não está nos itens: recusa", async () => {
      expect((await novaMemoria(helena, { tipo: "album", itens: [{ idArquivo: a4, tipo: "audio" }] })).status).toBe(400);
      expect((await novaMemoria(helena, { tipo: "album", itens: [foto(a1), foto(a1)] })).status).toBe(400);
      expect((await novaMemoria(helena, { tipo: "album", itens: [foto(a1)], capa: a3 })).status).toBe(400);
    });

    it("editar sem mandar os itens: as fotos ficam como estavam", async () => {
      const r = await como(helena).put(`/api/memorias/${idAlbum}`).send({ tipo: "album", titulo: "Natal de 75", versao });
      expect(r.status).toBe(200);
      expect(r.body.itens.map((it) => it.idArquivo)).toEqual([a1, a2, a3, a4]);
      expect(r.body.capa).toBe(a2);
      expect(r.body.versao).toBe(versao + 1);
      versao = r.body.versao;
    });

    it("duas edições ao mesmo tempo: a segunda (com a versão antiga) é recusada, sem apagar a primeira", async () => {
      const r = await como(helena).put(`/api/memorias/${idAlbum}`).send({ tipo: "album", titulo: "Por cima", versao: versao - 1 });
      expect(r.status).toBe(409);
      expect(r.body.erro.codigo).toBe("CONFLITO_EDICAO");
      expect((await como(helena).get(`/api/memorias/${idAlbum}`)).body.titulo).toBe("Natal de 75");
    });

    it("reordenar, tirar uma foto e trocar a capa: a foto tirada sai do disco (não é usada em mais nada)", async () => {
      const localA1 = await localNoDisco(a1);
      const r = await como(helena).put(`/api/memorias/${idAlbum}`).send({
        tipo: "album", titulo: "Natal de 75", versao, capa: a3,
        itens: [foto(a3, { legenda: "Neve" }), foto(a2), foto(a4, { anexo: true })],
      });
      expect(r.status).toBe(200);
      versao = r.body.versao;
      expect(r.body.itens.map((it) => it.idArquivo)).toEqual([a3, a2, a4]);
      expect(r.body.itens[0].legenda).toBe("Neve");
      expect(r.body.capa).toBe(a3);
      expect((await baixar(helena, a1)).status).toBe(404);
      expect(existsSync(arm.caminho(localA1))).toBe(false);
    });

    it("tirar a capa dos itens sem escolher outra: fica sem capa", async () => {
      const r = await como(helena).put(`/api/memorias/${idAlbum}`).send({ tipo: "album", versao, itens: [foto(a2)] });
      expect(r.body.capa).toBeNull();
      versao = r.body.versao;
    });

    it("apagar a memória: apaga as fotos dela, mas não as que outra memória também usa", async () => {
      const usada = (await subir(helena, JPEG())).body.id;
      const so = (await subir(helena, JPEG())).body.id;
      const m1 = (await novaMemoria(helena, { tipo: "album", itens: [foto(usada), foto(so)] })).body.id;
      await novaMemoria(helena, { tipo: "foto", itens: [foto(usada)] });
      const [localUsada, localSo] = [await localNoDisco(usada), await localNoDisco(so)];
      expect((await como(helena).delete(`/api/memorias/${m1}`)).status).toBe(204);
      expect((await baixar(helena, usada)).status).toBe(200);
      expect(existsSync(arm.caminho(localUsada))).toBe(true);
      expect((await baixar(helena, so)).status).toBe(404);
      expect(existsSync(arm.caminho(localSo))).toBe(false);
    });

    it("descartar um envio que não entrou em memória: 204; em uso: 409; de outra pessoa: 404", async () => {
      const solta = (await subir(helena, JPEG())).body.id;
      expect((await como(beto).delete(`/api/arquivos/${solta}`)).status).toBe(404);
      expect((await como(helena).delete(`/api/arquivos/${solta}`)).status).toBe(204);
      expect((await como(helena).delete(`/api/arquivos/${a2}`)).status).toBe(409);
    });
  });

  describe("faxina", () => {
    it("apaga envios abandonados há mais de 24 h e arquivos do disco sem linha no banco; o resto fica", async () => {
      const velho = (await subir(helena, JPEG())).body.id;
      const novo = (await subir(helena, JPEG())).body.id;
      const usado = (await subir(helena, JPEG())).body.id;
      await novaMemoria(helena, { tipo: "foto", itens: [foto(usado)] });
      await pool.execute("UPDATE arquivo SET criado_em = UTC_TIMESTAMP() - INTERVAL 25 HOUR WHERE id_arquivo IN (?, ?)", [velho, usado]);
      const localVelho = await localNoDisco(velho);
      // um arquivo no disco sem linha no banco (o banco caiu depois de gravar), de 2 dias atrás
      const solto = await arm.gravar(Readable.from([JPEG()]), { limite: 1000, subpasta: `familias/${helena.idFamilia}` });
      // e um do jeito antigo (de antes da migração 005: subpasta de 2 letras), também sem linha no banco
      const antigo = await arm.gravar(Readable.from([JPEG()]), { limite: 1000, subpasta: "ab" });
      const doisDias = (Date.now() - 48 * 3600 * 1000) / 1000;
      await utimes(arm.caminho(solto), doisDias, doisDias);
      await utimes(arm.caminho(antigo), doisDias, doisDias);

      await faxina(pool, arm);
      expect((await baixar(helena, velho)).status).toBe(404);
      expect(existsSync(arm.caminho(localVelho))).toBe(false);
      expect(existsSync(arm.caminho(solto))).toBe(false);
      expect(existsSync(arm.caminho(antigo))).toBe(false);
      expect((await baixar(helena, novo)).status).toBe(200);
      expect((await baixar(helena, usado)).status).toBe(200);
    });
  });

  describe("qual armazenamento usar (tabela configuracao)", () => {
    const mudar = (chave, valor) => pool.execute("UPDATE configuracao SET valor = ? WHERE chave = ?", [valor, chave]);
    afterAll(async () => {
      await mudar("armazenamento", "local");
      await mudar("s3_bucket", null);
      await mudar("s3_regiao", null);
    });

    it("local por padrão; s3 com o bucket da tabela; s3 sem bucket ou tipo desconhecido: erro claro", async () => {
      expect((await armazenamentoConfigurado(pool, config)).tipo).toBe("local");
      await mudar("armazenamento", "s3");
      await expect(armazenamentoConfigurado(pool, config)).rejects.toThrow(/s3_bucket/);
      await mudar("s3_bucket", "memoria-viva-teste");
      await mudar("s3_regiao", "sa-east-1");
      const s3 = await armazenamentoConfigurado(pool, config);
      expect(s3).toMatchObject({ tipo: "s3", bucket: "memoria-viva-teste" });
      await mudar("armazenamento", "ftp");
      await expect(armazenamentoConfigurado(pool, config)).rejects.toThrow(/ftp/);
    });

    it("a tabela não guarda chave de acesso da nuvem", async () => {
      const [l] = await pool.query("SELECT chave FROM configuracao");
      expect(l.map((x) => x.chave).sort()).toEqual(["armazenamento", "s3_bucket", "s3_endereco", "s3_regiao"]);
    });
  });
});
