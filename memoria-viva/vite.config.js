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
  return { plugins: [react(), apiMusica(env.YOUTUBE_API_KEY)] };
});
