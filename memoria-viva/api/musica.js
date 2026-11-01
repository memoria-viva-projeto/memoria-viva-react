// Música: pesquisa no YouTube (YouTube Data API v3) e dados de um link colado (oEmbed).
// Roda no servidor: a chave fica em YOUTUBE_API_KEY e nunca vai para o navegador.
// Na Vercel, este arquivo vira /api/musica sozinho; no "npm run dev" e no "npm run preview",
// o vite.config.js usa este mesmo arquivo.
//
//   GET /api/musica?acao=disponivel   → { busca: true|false }
//   GET /api/musica?acao=busca&q=...  → { resultados: [{ id, titulo, canal, capa }] }
//   GET /api/musica?acao=link&url=... → { id, titulo, canal, capa }
//
// Cota gratuita do YouTube: 10.000 unidades por dia; cada pesquisa custa 100 (≈ 100 pesquisas/dia).
// Por isso as pesquisas repetidas ficam guardadas por 6 horas.

const cache = new Map();
const SEIS_HORAS = 6 * 60 * 60 * 1000;

const capa = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Id do vídeo a partir de qualquer endereço do YouTube (watch, youtu.be, shorts, embed, music). */
export function idDoYoutube(url) {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/) || [])[1] || "";
    }
    return /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const decodificar = (t) => t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function buscar(q, chave) {
  const em = cache.get(q);
  if (em && Date.now() - em.t < SEIS_HORAS) return em.r;
  const p = new URLSearchParams({
    part: "snippet", type: "video", videoEmbeddable: "true", videoCategoryId: "10", maxResults: "8", // 10 = Música
    regionCode: "BR", relevanceLanguage: "pt", safeSearch: "strict", q, key: chave,
  });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${p}`);
  if (!r.ok) throw Object.assign(new Error("youtube"), { status: r.status });
  const dados = await r.json();
  const resultados = (dados.items || []).map((it) => ({
    id: it.id.videoId,
    titulo: decodificar(it.snippet.title),
    canal: decodificar(it.snippet.channelTitle),
    capa: it.snippet.thumbnails?.high?.url || capa(it.id.videoId),
  }));
  cache.set(q, { t: Date.now(), r: resultados });
  return resultados;
}

async function link(url) {
  const id = idDoYoutube(url);
  if (!id) return null;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (!r.ok) return { id, titulo: "", canal: "", capa: capa(id) };
    const d = await r.json();
    return { id, titulo: d.title || "", canal: d.author_name || "", capa: capa(id) };
  } catch {
    return { id, titulo: "", canal: "", capa: capa(id) };
  }
}

function responder(res, status, corpo) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

export default async function handler(req, res, chave = process.env.YOUTUBE_API_KEY) {
  const u = new URL(req.url, "http://localhost");
  const acao = u.searchParams.get("acao");
  try {
    if (acao === "disponivel") return responder(res, 200, { busca: !!chave });
    if (acao === "busca") {
      const q = (u.searchParams.get("q") || "").trim().slice(0, 100);
      if (!chave) return responder(res, 503, { erro: "sem-chave" });
      if (!q) return responder(res, 400, { erro: "vazio" });
      return responder(res, 200, { resultados: await buscar(q, chave) });
    }
    if (acao === "link") {
      const r = await link(u.searchParams.get("url") || "");
      return r ? responder(res, 200, r) : responder(res, 400, { erro: "link" });
    }
    return responder(res, 404, { erro: "acao" });
  } catch (e) {
    return responder(res, 502, { erro: e.status === 403 ? "cota" : "youtube" });
  }
}
