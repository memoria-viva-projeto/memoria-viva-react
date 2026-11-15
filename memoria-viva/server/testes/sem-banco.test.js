// Testes que NÃO precisam de MySQL: validação, senha, token, configuração e formato dos erros.
import request from "supertest";
import { describe, expect, it } from "vitest";
import { criarApp } from "../app.js";
import { lerConfig } from "../config.js";
import { conferir, gerarHash } from "../servicos/senha.js";
import { hashToken, novoToken } from "../servicos/token.js";
import { Cadastro } from "../validacao/auth.js";
import { DataFlexivel } from "../validacao/memorias.js";

const ENV = { NODE_ENV: "test", DB_USUARIO: "teste" };
// pool falso: qualquer consulta falha, como se o banco estivesse fora do ar
const poolFora = { query: () => Promise.reject(Object.assign(new Error("fora"), { code: "ECONNREFUSED" })), execute: () => Promise.reject(new Error("fora")) };
const appSemBanco = (extra) => criarApp({ pool: poolFora, config: lerConfig(ENV), limiteTentativas: 1000, ...extra });

describe("validação do cadastro (mesmas regras da tela)", () => {
  const ok = { nome: "Maria", email: "  Maria@Exemplo.com ", senha: "costura1957", familia: "Família de Maria" };

  it("aceita dados válidos e normaliza o e-mail", () => {
    expect(Cadastro.parse(ok).email).toBe("maria@exemplo.com");
  });
  it.each([
    ["curta", "abc123", "pelo menos 8"],
    ["sem número", "costurando", "um número"],
    ["sem letra", "12345678", "uma letra"],
  ])("recusa senha %s", (_n, senha, trecho) => {
    const r = Cadastro.safeParse({ ...ok, senha });
    expect(r.success).toBe(false);
    expect(r.error.issues.map((i) => i.message).join(" ")).toContain(trecho);
  });
  it("aceita letra com acento como letra", () => {
    expect(Cadastro.safeParse({ ...ok, senha: "çãéíõú12" }).success).toBe(true);
  });
  it("recusa e-mail sem domínio e família vazia", () => {
    expect(Cadastro.safeParse({ ...ok, email: "maria@" }).success).toBe(false);
    expect(Cadastro.safeParse({ ...ok, familia: "   " }).success).toBe(false);
  });
});

describe("data flexível (mesmas regras da tela)", () => {
  const ok = (d) => DataFlexivel.parse(d);
  it("aceita números como texto, como a tela guarda", () => {
    expect(ok({ modo: "ano", ano: "1975", aprox: true })).toMatchObject({ ano: 1975, aprox: true });
  });
  it("guarda só o que vale para o modo", () => {
    expect(ok({ modo: "mes", dia: 12, mes: 6, ano: 1957, anoFim: 1990, aprox: true })).toEqual({
      modo: "mes", dia: null, mes: 6, ano: 1957, anoFim: null, decada: null, aprox: false,
    });
  });
  it("modo sem nada preenchido vira 'sem data'; 'não sei' continua", () => {
    expect(ok({ modo: "ano", ano: "" })).toBeNull();
    expect(ok({ modo: "naosei" })).toMatchObject({ modo: "naosei" });
  });
  it("aceita 29/02 sem ano e em ano bissexto; recusa em ano comum", () => {
    expect(ok({ modo: "dia", dia: 29, mes: 2 })).toBeTruthy();
    expect(ok({ modo: "dia", dia: 29, mes: 2, ano: 1960 })).toBeTruthy();
    expect(DataFlexivel.safeParse({ modo: "dia", dia: 29, mes: 2, ano: 1961 }).success).toBe(false);
  });
  it("recusa dia sem mês, década quebrada e ano antes de 1800", () => {
    expect(DataFlexivel.safeParse({ modo: "dia", dia: 5 }).success).toBe(false);
    expect(DataFlexivel.safeParse({ modo: "decada", decada: 1975 }).success).toBe(false);
    expect(DataFlexivel.safeParse({ modo: "ano", ano: 1700 }).success).toBe(false);
  });
});

describe("memória sem login", () => {
  it("criar, listar e abrir pedem login (401)", async () => {
    const app = appSemBanco();
    expect((await request(app).get("/api/memorias/1")).status).toBe(401);
    expect((await request(app).get("/api/familias/1/memorias")).status).toBe(401);
    expect((await request(app).post("/api/familias/1/memorias").send({ tipo: "foto" })).status).toBe(401);
  });
});

describe("senha e token", () => {
  it("guarda a senha como hash Argon2id e confere certo", async () => {
    const h = await gerarHash("costura1957");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(h).not.toContain("costura1957");
    expect(await conferir(h, "costura1957")).toBe(true);
    expect(await conferir(h, "costura1958")).toBe(false);
    expect(await conferir("lixo", "costura1957")).toBe(false);
  });
  it("gera códigos de sessão diferentes e guarda só o hash", () => {
    const a = novoToken();
    expect(a).not.toBe(novoToken());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toBe(a);
  });
});

describe("configuração", () => {
  it("exige DB_USUARIO", () => {
    expect(() => lerConfig({ NODE_ENV: "test" })).toThrow(/DB_USUARIO/);
  });
  it("em teste usa sempre o banco _teste", () => {
    expect(lerConfig({ ...ENV, DB_NOME: "memoria_viva" }).banco.database).toBe("memoria_viva_teste");
    expect(() => lerConfig({ ...ENV, DB_NOME_TESTE: "memoria_viva" })).toThrow(/_teste/);
  });
});

describe("respostas de erro padronizadas", () => {
  it("saúde responde 503 quando o banco está fora", async () => {
    const r = await request(appSemBanco()).get("/api/saude");
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ ok: false, banco: "sem conexão" });
  });
  it("cadastro inválido → 400 com os campos", async () => {
    const r = await request(appSemBanco()).post("/api/auth/cadastro").send({ nome: "", email: "x", senha: "1" });
    expect(r.status).toBe(400);
    expect(r.body.erro.codigo).toBe("DADOS_INVALIDOS");
    expect(Object.keys(r.body.erro.campos).sort()).toEqual(["email", "familia", "nome", "senha"]);
  });
  it("JSON quebrado → 400 JSON_INVALIDO", async () => {
    const r = await request(appSemBanco()).post("/api/auth/entrar").set("Content-Type", "application/json").send("{ruim");
    expect(r.status).toBe(400);
    expect(r.body.erro.codigo).toBe("JSON_INVALIDO");
  });
  it("sessão sem cookie → 401 NAO_AUTENTICADO", async () => {
    const r = await request(appSemBanco()).get("/api/auth/sessao");
    expect(r.status).toBe(401);
    expect(r.body.erro.codigo).toBe("NAO_AUTENTICADO");
  });
  it("endereço inexistente → 404 no mesmo formato", async () => {
    const r = await request(appSemBanco()).get("/api/nada");
    expect(r.status).toBe(404);
    expect(r.body.erro.codigo).toBe("NAO_ENCONTRADO");
  });
  it("muitas tentativas de entrar → 429", async () => {
    const app = appSemBanco({ limiteTentativas: 2 });
    await request(app).post("/api/auth/entrar").send({});
    await request(app).post("/api/auth/entrar").send({});
    const r = await request(app).post("/api/auth/entrar").send({});
    expect(r.status).toBe(429);
    expect(r.body.erro.codigo).toBe("MUITAS_TENTATIVAS");
  });
  it("CORS libera só os endereços configurados", async () => {
    const app = appSemBanco();
    const bom = await request(app).get("/api/saude").set("Origin", "http://localhost:5173");
    expect(bom.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(bom.headers["access-control-allow-credentials"]).toBe("true");
    const ruim = await request(app).get("/api/saude").set("Origin", "https://site-estranho.com");
    expect(ruim.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
