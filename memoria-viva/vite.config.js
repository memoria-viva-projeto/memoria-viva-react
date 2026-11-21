import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Todo /api vai para o servidor da API (npm run api).
  // Para o navegador, tela e API ficam no mesmo endereço: o cookie de sessão funciona sem complicação.
  const proxy = { "/api": `http://localhost:${env.API_PORTA || 3001}` };
  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
