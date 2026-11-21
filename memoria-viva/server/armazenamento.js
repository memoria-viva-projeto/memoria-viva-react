// Onde ficam os arquivos (as fotos). Duas versões, com as MESMAS funções, e o resto do servidor não sabe qual é:
//   - local: uma pasta no disco do servidor (ARQUIVOS_PASTA). Usada no desenvolvimento e nos testes;
//   - s3:    um bucket na nuvem (AWS S3, ou Cloudflare R2 / Backblaze B2 / MinIO, que falam a mesma língua).
// Qual usar vem da tabela configuracao (armazenamento = local | s3; s3_bucket, s3_regiao, s3_endereco).
// As chaves de acesso da nuvem NUNCA ficam no banco: o SDK lê AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY do ambiente
// (ou o papel IAM da máquina).
//
// Cada arquivo é identificado por { subpasta, nome } (é o que a tabela arquivo guarda; nunca uma URL):
//   - subpasta: "familias/<id do acervo>" (os arquivos antigos, de antes da migração 005, estão em "<2 letras>");
//   - nome: 32 letras/números aleatórios. Ninguém escolhe o nome: não dá para sobrescrever o arquivo de outra pessoa
//     nem sair da pasta com "../" (path traversal). Toda subpasta e nome são conferidos antes de virar caminho.
// O bucket e a pasta são PRIVADOS: nada é servido direto; o arquivo só sai por /api/arquivos/:id, que confere o acesso.
import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform, Writable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const NOME_OK = /^[a-f0-9]{32}$/;
const SUBPASTA_OK = /^(?:[a-f0-9]{2}|familias\/[1-9]\d{0,9})$/;

export class LimiteExcedido extends Error {}

/** Subpasta dos arquivos de um acervo. */
export const subpastaDaFamilia = (idFamilia) => `familias/${Number(idFamilia)}`;

function conferir({ subpasta, nome }) {
  if (!SUBPASTA_OK.test(String(subpasta)) || !NOME_OK.test(String(nome))) throw new Error("Arquivo inválido no armazenamento.");
  return { subpasta, nome };
}

const novoNome = () => randomBytes(16).toString("hex");

/** Conta os bytes que passam; para (com LimiteExcedido) se passar do limite; guarda os primeiros 64 bytes. */
function contador(limite) {
  const r = { tamanho: 0, partes: [], juntos: 0 };
  r.stream = new Transform({
    transform(pedaco, _cod, pronto) {
      r.tamanho += pedaco.length;
      if (r.tamanho > limite) return pronto(new LimiteExcedido("Arquivo grande demais."));
      if (r.juntos < 64) { r.partes.push(pedaco); r.juntos += pedaco.length; }
      pronto(null, pedaco);
    },
  });
  r.inicio = () => Buffer.concat(r.partes).subarray(0, 64);
  return r;
}

const naoAchou = () => Object.assign(new Error("Arquivo não encontrado no armazenamento."), { status: 404 });

// ---------------------------------------------------------------- local (pasta no disco)

export function criarArmazenamento(pasta) {
  /** Caminho no disco (só a versão local tem). */
  const caminho = (local) => {
    const { subpasta, nome } = conferir(local);
    return join(pasta, ...subpasta.split("/"), nome);
  };

  /** Grava o que vier pelo stream. Para no meio (e apaga o pedaço) se passar de `limite` bytes. */
  async function gravar(entrada, { limite, subpasta }) {
    const local = conferir({ subpasta, nome: novoNome() });
    const destino = caminho(local);
    await mkdir(join(pasta, ...subpasta.split("/")), { recursive: true });
    const c = contador(limite);
    try {
      // "wx": falha se já existir um arquivo com esse nome (nunca sobrescreve)
      await pipeline(entrada, c.stream, createWriteStream(destino, { flags: "wx" }));
    } catch (e) {
      await rm(destino, { force: true }).catch(() => {});
      throw e;
    }
    return { ...local, tamanho: c.tamanho, inicio: c.inicio() };
  }

  /** Apaga (se não existir, tudo bem). */
  const apagar = (local) => rm(caminho(local), { force: true });

  /** Entrega o arquivo na resposta (o Express cuida de Range, ETag e 304). */
  function entregar(_req, res, local, headers) {
    return new Promise((ok, falhou) => {
      res.sendFile(caminho(local), { headers, dotfiles: "deny" }, (e) => {
        if (!e) return ok();
        falhou(e.code === "ENOENT" || e.status === 404 ? naoAchou() : e);
      });
    });
  }

  /** Todos os arquivos guardados, com a data da última mudança (para a faxina de arquivos sem linha no banco). */
  async function listar() {
    const r = [];
    const ler = async (subpasta) => {
      for (const nome of await readdir(join(pasta, ...subpasta.split("/"))).catch(() => [])) {
        if (!NOME_OK.test(nome)) continue;
        const s = await stat(join(pasta, ...subpasta.split("/"), nome)).catch(() => null);
        if (s?.isFile()) r.push({ subpasta, nome, mudadoEm: s.mtimeMs });
      }
    };
    for (const sub of await readdir(pasta).catch(() => [])) if (/^[a-f0-9]{2}$/.test(sub)) await ler(sub); // antigos
    for (const id of await readdir(join(pasta, "familias")).catch(() => [])) if (/^[1-9]\d{0,9}$/.test(id)) await ler(`familias/${id}`);
    return r;
  }

  return { tipo: "local", pasta, caminho, gravar, apagar, entregar, listar };
}

// ---------------------------------------------------------------- S3 (nuvem)

/**
 * bucket: obrigatório. regiao: ex. "sa-east-1" (vazio com endereço próprio = "auto", como no R2).
 * endereco: vazio = AWS; preencha para R2, Backblaze ou MinIO. `cliente`: só nos testes (um S3Client falso).
 */
export function criarArmazenamentoS3({ bucket, regiao, endereco }, { cliente } = {}) {
  if (!bucket) throw new Error("Armazenamento S3 sem bucket: preencha s3_bucket na tabela configuracao.");
  const s3 = cliente || new S3Client({
    region: regiao || (endereco ? "auto" : undefined),
    ...(endereco ? { endpoint: endereco, forcePathStyle: true } : {}),
  });
  const chave = (local) => { const { subpasta, nome } = conferir(local); return `${subpasta}/${nome}`; };

  /**
   * Recebe o arquivo inteiro na memória (o limite é pequeno: foto 20 MB) e só então envia ao bucket:
   * assim o tamanho e o tipo são conferidos antes de qualquer coisa ir para a nuvem.
   */
  async function gravar(entrada, { limite, subpasta }) {
    const local = conferir({ subpasta, nome: novoNome() });
    const c = contador(limite);
    const pedacos = [];
    await pipeline(entrada, c.stream, new Writable({ write(p, _cod, pronto) { pedacos.push(p); pronto(); } }));
    const corpo = Buffer.concat(pedacos);
    if (corpo.length) await s3.send(new PutObjectCommand({ Bucket: bucket, Key: chave(local), Body: corpo }));
    return { ...local, tamanho: c.tamanho, inicio: c.inicio() };
  }

  const apagar = async (local) => { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: chave(local) })); };

  /** Busca no bucket e repassa na resposta, aceitando trechos (Range) e o "não mudou" (If-None-Match → 304). */
  async function entregar(req, res, local, headers) {
    let r;
    try {
      r = await s3.send(new GetObjectCommand({
        Bucket: bucket, Key: chave(local),
        Range: req.headers.range || undefined,
        IfNoneMatch: req.headers["if-none-match"] || undefined,
      }));
    } catch (e) {
      const status = e?.$metadata?.httpStatusCode;
      if (status === 304) { res.status(304).end(); return; }
      if (status === 416) { res.status(416).end(); return; }
      if (e?.name === "NoSuchKey" || status === 404) throw naoAchou();
      throw e;
    }
    res.status(r.ContentRange ? 206 : 200);
    res.set(headers);
    res.set("Accept-Ranges", "bytes");
    if (r.ContentLength != null) res.set("Content-Length", String(r.ContentLength));
    if (r.ContentRange) res.set("Content-Range", r.ContentRange);
    if (r.ETag) res.set("ETag", r.ETag);
    if (r.LastModified) res.set("Last-Modified", r.LastModified.toUTCString());
    await pipeline(r.Body, res);
  }

  async function listar() {
    const r = [];
    let ContinuationToken;
    do {
      const p = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }));
      for (const o of p.Contents || []) {
        const i = o.Key.lastIndexOf("/");
        const local = { subpasta: o.Key.slice(0, i), nome: o.Key.slice(i + 1) };
        if (SUBPASTA_OK.test(local.subpasta) && NOME_OK.test(local.nome)) r.push({ ...local, mudadoEm: new Date(o.LastModified).getTime() });
      }
      ContinuationToken = p.IsTruncated ? p.NextContinuationToken : undefined;
    } while (ContinuationToken);
    return r;
  }

  return { tipo: "s3", bucket, gravar, apagar, entregar, listar };
}

// ---------------------------------------------------------------- qual usar

/** Lê a tabela configuracao e devolve o armazenamento certo. Pasta local: ARQUIVOS_PASTA (config.arquivosPasta). */
export async function armazenamentoConfigurado(pool, config) {
  let linhas;
  try {
    [linhas] = await pool.query("SELECT chave, valor FROM configuracao");
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE") throw new Error("Falta a tabela configuracao no banco. Rode  npm run db:migrar.");
    throw e;
  }
  const c = Object.fromEntries(linhas.map((l) => [l.chave, l.valor?.trim() || null]));
  const tipo = c.armazenamento || "local";
  if (tipo === "s3") return criarArmazenamentoS3({ bucket: c.s3_bucket, regiao: c.s3_regiao, endereco: c.s3_endereco });
  if (tipo !== "local") throw new Error(`Armazenamento "${tipo}" não existe. Use local ou s3 na tabela configuracao.`);
  return criarArmazenamento(config.arquivosPasta);
}
