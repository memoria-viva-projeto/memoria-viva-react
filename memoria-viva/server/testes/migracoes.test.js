// Migrações: rodam do zero, não repetem, e um banco criado à mão é preservado.
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { lerConfig } from "../config.js";
import { conectarServidor, migrar } from "../migracoes.js";

describe.skipIf(!inject("temBanco"))("migrações (com banco)", () => {
  let config, conn;
  const AUX = []; // bancos auxiliares (terminam em _teste), apagados no fim
  const silencio = { log: () => {} };

  beforeAll(async () => {
    config = lerConfig();
    const raiz = config.banco.database.replace(/_teste$/, "");
    AUX.push(`${raiz}_amao_teste`, `${raiz}_antigo_teste`);
    conn = await conectarServidor(config.banco);
    for (const b of AUX) await conn.query(`DROP DATABASE IF EXISTS \`${b}\``);
  });
  afterAll(async () => {
    if (!conn) return;
    for (const b of AUX) await conn.query(`DROP DATABASE IF EXISTS \`${b}\``);
    await conn.end();
  });

  it("rodar de novo não faz nada", async () => {
    const r = await migrar(config.banco, silencio);
    expect(r.novas).toEqual([]);
  });

  it("banco criado à mão com o script base: recusa sem marcar, e com --marcar-base preserva os dados", async () => {
    const banco = { ...config.banco, database: AUX[0] };
    // simula a outra pessoa: rodou o script base direto e cadastrou alguém
    const base = await readFile(new URL("../../db/migracoes/000_base.sql", import.meta.url), "utf8");
    await conn.query(`CREATE DATABASE \`${AUX[0]}\``);
    await conn.query(`USE \`${AUX[0]}\``);
    await conn.query(base);
    await conn.query("INSERT INTO usuario (nome, email, senha_hash, id_plano) VALUES ('Helena', 'helena@exemplo.com', 'x', 1)");

    await expect(migrar(banco, silencio)).rejects.toThrow(/nenhuma migração registrada/);
    const [controle] = await conn.query("SHOW TABLES LIKE 'migracao_aplicada'");
    expect(controle).toHaveLength(0); // recusou sem criar nada

    const r = await migrar(banco, { ...silencio, marcarBase: true });
    expect(r.novas).toEqual(["001_sessao.sql", "002_convite_familia.sql", "003_apagar_conta.sql", "004_arquivos.sql", "005_reducao_escopo.sql", "006_sem_audio.sql", "007_planos_novos.sql"]);
    const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM usuario WHERE email = 'helena@exemplo.com'");
    expect(n).toBe(1); // o dado de antes continua lá
    const [[{ planos }]] = await conn.query("SELECT COUNT(*) AS planos FROM plano");
    expect(planos).toBe(4); // e o catálogo não foi duplicado
    const [sess] = await conn.query("SHOW TABLES LIKE 'sessao'");
    expect(sess).toHaveLength(1);
  });

  it("banco antigo (sem planos): recusa marcar e não altera nada", async () => {
    const banco = { ...config.banco, database: AUX[1] };
    await conn.query(`CREATE DATABASE \`${AUX[1]}\``);
    await conn.query(`CREATE TABLE \`${AUX[1]}\`.usuario (id_usuario INT PRIMARY KEY, nome VARCHAR(120))`);
    await expect(migrar(banco, { ...silencio, marcarBase: true })).rejects.toThrow(/não bate/);
    const [tabs] = await conn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = ?", [AUX[1]]);
    expect(tabs).toHaveLength(1);
  });
});
