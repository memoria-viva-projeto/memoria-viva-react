// Configuração do servidor, lida das variáveis de ambiente (arquivo .env.local, que não vai para o git).
// Tudo passa por uma validação: se faltar algo obrigatório, o servidor nem sobe e diz o que falta.
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const Esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORTA: z.coerce.number().int().positive().default(3001),

  DB_HOST: z.string().default("localhost"),
  DB_PORTA: z.coerce.number().int().positive().default(3306),
  DB_USUARIO: z.string().min(1, "Preencha DB_USUARIO no .env.local (ex.: root)."),
  DB_SENHA: z.string().default(""),
  DB_NOME: z.string().regex(/^[A-Za-z0-9_]+$/, "DB_NOME só pode ter letras, números e _.").default("memoria_viva"),
  // banco só dos testes: é apagado e recriado a cada "npm test", por isso o nome precisa terminar em _teste
  DB_NOME_TESTE: z.string().regex(/^[A-Za-z0-9_]+_teste$/, "DB_NOME_TESTE precisa terminar em _teste.").default("memoria_viva_teste"),

  SESSAO_DIAS: z.coerce.number().int().positive().default(14),
  CORS_ORIGENS: z.string().default("http://localhost:5173,http://localhost:4173"),
  // onde ficam as fotos. FORA da pasta public/: lá, qualquer um abriria sem login.
  // Vazio: a pasta "armazenamento" do projeto (e, nos testes, uma pasta temporária que é apagada depois).
  ARQUIVOS_PASTA: z.string().optional(),
});

/** Lê e valida a configuração. Em teste, o banco usado é sempre o DB_NOME_TESTE. */
export function lerConfig(env = process.env) {
  const r = Esquema.safeParse(env);
  if (!r.success) {
    const linhas = r.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuração inválida (confira o .env.local):\n${linhas}`);
  }
  const c = r.data;
  if (c.DB_NOME === c.DB_NOME_TESTE) throw new Error("DB_NOME e DB_NOME_TESTE não podem ser o mesmo banco.");
  return {
    ambiente: c.NODE_ENV,
    porta: c.API_PORTA,
    banco: {
      host: c.DB_HOST,
      port: c.DB_PORTA,
      user: c.DB_USUARIO,
      password: c.DB_SENHA,
      database: c.NODE_ENV === "test" ? c.DB_NOME_TESTE : c.DB_NOME,
    },
    bancoTeste: c.DB_NOME_TESTE,
    sessaoDias: c.SESSAO_DIAS,
    corsOrigens: c.CORS_ORIGENS.split(",").map((o) => o.trim()).filter(Boolean),
    arquivosPasta: c.ARQUIVOS_PASTA
      ? resolve(c.ARQUIVOS_PASTA)
      : c.NODE_ENV === "test"
        ? join(tmpdir(), `memoria-viva-teste-arquivos-${process.pid}`)
        : fileURLToPath(new URL("../armazenamento/", import.meta.url)),
  };
}
