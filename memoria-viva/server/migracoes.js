// Migrações: arquivos SQL numerados em db/migracoes/ (000_base.sql, 001_sessao.sql...).
// Cada arquivo roda UMA vez por banco; quais já rodaram fica anotado na tabela migracao_aplicada.
// Nada aqui apaga dados: só cria o banco se ele não existir e roda os arquivos que faltam.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const PASTA = new URL("../db/migracoes/", import.meta.url);
const BASE = "000_base.sql";
const nomeSeguro = (n) => {
  if (!/^[A-Za-z0-9_]+$/.test(n)) throw new Error(`Nome de banco inválido: ${n}`);
  return n;
};

export async function lerArquivos() {
  const nomes = (await readdir(PASTA)).filter((n) => /^\d{3}_[\w-]+\.sql$/.test(n)).sort();
  return Promise.all(
    nomes.map(async (nome) => {
      const sql = await readFile(new URL(nome, PASTA), "utf8");
      return { nome, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    }),
  );
}

/** Tabelas que a migração base cria (lidas do próprio 000_base.sql). */
export async function tabelasDaBase() {
  const sql = await readFile(new URL(BASE, PASTA), "utf8");
  return [...sql.matchAll(/CREATE TABLE\s+`?(\w+)`?/gi)].map((m) => m[1]);
}

/** Conexão sem escolher banco (para poder criá-lo ou olhar todos). */
export function conectarServidor(banco) {
  const { database: _ignorado, ...semBanco } = banco;
  return mysql.createConnection({ ...semBanco, charset: "utf8mb4", multipleStatements: true });
}

/**
 * Aplica as migrações pendentes no banco `banco.database`.
 * marcarBase: para um banco que JÁ tem o esquema base (criado à mão por alguém) mas nunca usou migrações:
 *             confere que as tabelas da base existem e só anota 000_base como aplicada, sem rodá-la.
 */
export async function migrar(banco, { marcarBase = false, log = console.log } = {}) {
  const nome = nomeSeguro(banco.database);
  const conn = await conectarServidor(banco);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${nome}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.query(`USE \`${nome}\``);

    const arquivos = await lerArquivos();
    const [tabs] = await conn.query("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?", [nome]);
    const temControle = tabs.some((r) => r.t === "migracao_aplicada");
    const existentes = new Set(tabs.map((r) => r.t).filter((t) => t !== "migracao_aplicada"));
    let regs = [];
    if (temControle) [regs] = await conn.query("SELECT nome, checksum FROM migracao_aplicada");
    const aplicadas = new Map(regs.map((r) => [r.nome, r.checksum]));

    // Banco com tabelas mas sem registro de migrações: alguém criou à mão. Confere ANTES de mexer em qualquer coisa.
    const criadoAMao = aplicadas.size === 0 && existentes.size > 0;
    if (criadoAMao) {
      if (!marcarBase) {
        throw new Error(
          `O banco "${nome}" já tem ${existentes.size} tabelas, mas nenhuma migração registrada.\n` +
            "Nada foi alterado. Rode  npm run db:verificar  para ver o que há nele antes de decidir.",
        );
      }
      const faltam = (await tabelasDaBase()).filter((t) => !existentes.has(t));
      const [col] = await conn.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = 'usuario' AND column_name = 'id_plano'",
        [nome],
      );
      if (faltam.length || col.length === 0) {
        throw new Error(
          `O banco "${nome}" não bate com ${BASE}` +
            (faltam.length ? ` (faltam: ${faltam.join(", ")})` : " (falta a coluna usuario.id_plano)") +
            ".\nNada foi alterado. É preciso uma migração de ajuste antes.",
        );
      }
    }

    await conn.query(`CREATE TABLE IF NOT EXISTS migracao_aplicada (
      nome VARCHAR(120) NOT NULL,
      checksum CHAR(64) NOT NULL COMMENT 'SHA-256 do arquivo: avisa se alguém editar uma migração já aplicada',
      aplicada_em DATETIME NOT NULL,
      PRIMARY KEY (nome)
    ) COMMENT = 'Quais arquivos de db/migracoes já rodaram neste banco'`);

    if (criadoAMao) {
      const base = arquivos.find((a) => a.nome === BASE);
      await conn.query("INSERT INTO migracao_aplicada (nome, checksum, aplicada_em) VALUES (?, ?, UTC_TIMESTAMP())", [
        base.nome,
        base.checksum,
      ]);
      aplicadas.set(base.nome, base.checksum);
      log(`✔ ${BASE} marcada como já aplicada (as tabelas já existiam; nada foi recriado).`);
    } else if (marcarBase) {
      log(existentes.size === 0 ? "O banco está vazio: não há base para marcar. Rode  npm run db:migrar." : "Este banco já usa migrações: não há o que marcar.");
      if (existentes.size === 0) return { novas: [] };
    }

    for (const a of arquivos) {
      if (aplicadas.has(a.nome) && aplicadas.get(a.nome) !== a.checksum) {
        throw new Error(`${a.nome} foi editada depois de aplicada. Desfaça a edição e crie uma migração nova.`);
      }
    }

    const novas = [];
    for (const a of arquivos.filter((x) => !aplicadas.has(x.nome))) {
      log(`→ aplicando ${a.nome}...`);
      try {
        await conn.query(a.sql);
      } catch (e) {
        // MySQL não desfaz CREATE/ALTER em caso de erro: o que rodou antes do erro fica.
        throw new Error(`${a.nome} falhou: ${e.message}\nConfira o banco com  npm run db:verificar  antes de tentar de novo.`);
      }
      await conn.query("INSERT INTO migracao_aplicada (nome, checksum, aplicada_em) VALUES (?, ?, UTC_TIMESTAMP())", [
        a.nome,
        a.checksum,
      ]);
      novas.push(a.nome);
      log(`✔ ${a.nome}`);
    }
    if (!novas.length) log("Nenhuma migração pendente: o banco já está em dia.");
    return { novas };
  } finally {
    await conn.end();
  }
}
