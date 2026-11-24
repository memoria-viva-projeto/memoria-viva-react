// Testes do servidor (npm test). Arquivo separado do vite.config.js para não carregar o React nem o plugin de música.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/testes/**/*.test.js"],
    environment: "node",
    env: { NODE_ENV: "test" },
    setupFiles: ["server/testes/ambiente.js"],
    globalSetup: ["server/testes/preparar-banco.js"],
    fileParallelism: false, // os testes de banco dividem o mesmo banco de teste: um arquivo por vez
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
