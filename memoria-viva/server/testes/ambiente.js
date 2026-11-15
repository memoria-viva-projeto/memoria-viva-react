// Roda antes de cada arquivo de teste: lê o .env.local (se existir) e força o modo de teste.
// Em modo de teste, lerConfig() usa SEMPRE o DB_NOME_TESTE, nunca o banco de verdade.
try {
  process.loadEnvFile(process.env.MV_ENV_ARQUIVO || ".env.local");
} catch {
  /* sem .env.local: os testes de banco serão pulados */
}
process.env.NODE_ENV = "test";
