import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import musica from "./api/musica.js";

// /api/musica no "npm run dev" e no "npm run preview" (na Vercel, a pasta api/ já vira função).
// A chave do YouTube vem de .env.local (YOUTUBE_API_KEY, sem o prefixo VITE_: não vai para o navegador).
function apiMusica(chave) {
  const ligar = (server) => {
    server.middlewares.use("/api/musica", (req, res) => {
      req.url = `/api/musica${req.url}`;
      musica(req, res, chave);
    });
  };
  return { name: "api-musica", configureServer: ligar, configurePreviewServer: ligar };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // O resto de /api (contas, e depois memórias) vai para o servidor da API (npm run api).
  // Para o navegador, tela e API ficam no mesmo endereço: o cookie de sessão funciona sem complicação.
  // /api/musica continua respondida aqui mesmo (plugin acima), então funciona até com a API desligada.
  const proxy = { "/api": `http://localhost:${env.API_PORTA || 3001}` };
  return { plugins: [react(), apiMusica(env.YOUTUBE_API_KEY)], server: { proxy }, preview: { proxy } };
});
