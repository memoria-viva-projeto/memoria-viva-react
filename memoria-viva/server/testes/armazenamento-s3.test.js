// Armazenamento S3 com um "S3 de mentira" na memória: confere o que o servidor pede ao bucket, sem internet e sem conta
// na nuvem. (Se um dia o grupo quiser testar num bucket de verdade, use um MinIO local e o s3_endereco.)
import { Readable, PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { LimiteExcedido, criarArmazenamentoS3 } from "../armazenamento.js";

function s3Falso() {
  const objetos = new Map(); // Key → { corpo, quando }
  const pedidos = [];
  const erro = (name, httpStatusCode) => Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });
  return {
    objetos,
    pedidos,
    async send(cmd) {
      const tipo = cmd.constructor.name;
      const i = cmd.input;
      pedidos.push({ tipo, ...i });
      if (tipo === "PutObjectCommand") { objetos.set(i.Key, { corpo: Buffer.from(i.Body), quando: new Date() }); return {}; }
      if (tipo === "DeleteObjectCommand") { objetos.delete(i.Key); return {}; }
      if (tipo === "GetObjectCommand") {
        const o = objetos.get(i.Key);
        if (!o) throw erro("NoSuchKey", 404);
        if (i.IfNoneMatch === '"igual"') throw erro("NotModified", 304);
        if (i.Range) {
          const [, de, ate] = /bytes=(\d+)-(\d+)/.exec(i.Range).map(Number);
          const parte = o.corpo.subarray(de, ate + 1);
          return { Body: Readable.from([parte]), ContentLength: parte.length, ContentRange: `bytes ${de}-${ate}/${o.corpo.length}`, ETag: '"x"' };
        }
        return { Body: Readable.from([o.corpo]), ContentLength: o.corpo.length, ETag: '"x"', LastModified: o.quando };
      }
      if (tipo === "ListObjectsV2Command") {
        return { Contents: [...objetos].map(([Key, o]) => ({ Key, LastModified: o.quando })), IsTruncated: false };
      }
      throw new Error(`comando inesperado: ${tipo}`);
    },
  };
}

/** Resposta do Express de mentira: guarda status, cabeçalhos e o corpo que passou. */
function respostaFalsa() {
  const res = new PassThrough();
  const partes = [];
  res.on("data", (p) => partes.push(p));
  Object.assign(res, {
    statusCode: 200, cabecalhos: {},
    status(n) { this.statusCode = n; return this; },
    set(a, b) { if (typeof a === "object") Object.assign(this.cabecalhos, a); else this.cabecalhos[a] = b; return this; },
    end(...a) { PassThrough.prototype.end.apply(this, a); return this; },
    corpo: () => Buffer.concat(partes),
  });
  return res;
}

describe("armazenamento S3 (sem rede)", () => {
  const novo = () => { const cliente = s3Falso(); return { cliente, arm: criarArmazenamentoS3({ bucket: "mv" }, { cliente }) }; };

  it("grava em <subpasta>/<nome aleatório>, entrega e apaga", async () => {
    const { cliente, arm } = novo();
    const g = await arm.gravar(Readable.from([Buffer.from("conteúdo da foto")]), { limite: 1000, subpasta: "familias/7" });
    expect(g.subpasta).toBe("familias/7");
    expect(g.nome).toMatch(/^[a-f0-9]{32}$/);
    expect([...cliente.objetos.keys()]).toEqual([`familias/7/${g.nome}`]);
    expect(cliente.pedidos[0]).toMatchObject({ tipo: "PutObjectCommand", Bucket: "mv" });

    const res = respostaFalsa();
    await arm.entregar({ headers: {} }, res, g, { "Content-Type": "image/jpeg" });
    expect(res.statusCode).toBe(200);
    expect(res.cabecalhos["Content-Type"]).toBe("image/jpeg");
    expect(res.corpo().toString()).toBe("conteúdo da foto");

    expect(await arm.listar()).toEqual([{ subpasta: "familias/7", nome: g.nome, mudadoEm: expect.any(Number) }]);
    await arm.apagar(g);
    expect(cliente.objetos.size).toBe(0);
  });

  it("trecho (Range) responde 206; não mudou responde 304; arquivo que sumiu: 404", async () => {
    const { arm } = novo();
    const g = await arm.gravar(Readable.from([Buffer.from("0123456789")]), { limite: 1000, subpasta: "familias/7" });
    const r1 = respostaFalsa();
    await arm.entregar({ headers: { range: "bytes=2-4" } }, r1, g, {});
    expect(r1.statusCode).toBe(206);
    expect(r1.cabecalhos["Content-Range"]).toBe("bytes 2-4/10");
    expect(r1.corpo().toString()).toBe("234");
    const r2 = respostaFalsa();
    await arm.entregar({ headers: { "if-none-match": '"igual"' } }, r2, g, {});
    expect(r2.statusCode).toBe(304);
    await arm.apagar(g);
    await expect(arm.entregar({ headers: {} }, respostaFalsa(), g, {})).rejects.toMatchObject({ status: 404 });
  });

  it("passou do limite: para no meio e nada vai para o bucket", async () => {
    const { cliente, arm } = novo();
    await expect(arm.gravar(Readable.from([Buffer.alloc(600), Buffer.alloc(600)]), { limite: 1000, subpasta: "familias/7" }))
      .rejects.toBeInstanceOf(LimiteExcedido);
    expect(cliente.objetos.size).toBe(0);
  });

  it("subpasta ou nome fora do padrão nunca viram endereço no bucket (sem ../)", async () => {
    const { cliente, arm } = novo();
    await expect(arm.gravar(Readable.from([Buffer.from("x")]), { limite: 10, subpasta: "../outra" })).rejects.toThrow();
    await expect(arm.apagar({ subpasta: "familias/7", nome: "../../segredo" })).rejects.toThrow();
    expect(cliente.pedidos).toEqual([]);
  });

  it("sem bucket: não cria", () => {
    expect(() => criarArmazenamentoS3({ bucket: null }, { cliente: s3Falso() })).toThrow(/s3_bucket/);
  });
});
