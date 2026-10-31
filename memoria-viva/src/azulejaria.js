// Azulejaria: gera azulejos a partir de um texto (ex.: nome da família).
// Mesmo texto = mesmo desenho.

const C = { u: "#D35400", g: "#F1C40F", a: "#2980B9", n: "#1E375A", p: "#F9F7F1", t: "#5E9C96" };
const PARES = [[C.p, C.u], [C.n, C.g], [C.p, C.a], [C.g, C.u], [C.u, C.p], [C.p, C.n], [C.t, C.p], [C.g, C.n], [C.n, C.u], [C.p, C.t]];

export const reduzirMovimento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function hash(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function aleatorio(seed) {
  let x = seed || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

/** Desenha uma peça (7 formatos) numa posição do canvas. */
export function desenharPeca(g, k, x, y, s, fundo, cor, giro) {
  g.save();
  g.translate(x + s / 2, y + s / 2); g.rotate((giro * Math.PI) / 2); g.translate(-s / 2, -s / 2);
  g.fillStyle = fundo; g.fillRect(-0.3, -0.3, s + 0.6, s + 0.6);
  g.fillStyle = cor; g.beginPath();
  switch (k) {
    case 0: g.moveTo(0, 0); g.arc(0, 0, s, 0, Math.PI / 2); g.closePath(); break;           // quarto de círculo
    case 1: g.arc(s / 2, s, s / 2, Math.PI, 0); break;                                         // meia-lua
    case 2: g.moveTo(0, 0); g.lineTo(s, 0); g.lineTo(0, s); g.closePath(); break;              // triângulo
    case 3: g.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2); break;                               // círculo
    case 4: g.rect(0, s * 0.18, s, s * 0.2); g.rect(0, s * 0.62, s, s * 0.2); break;           // listras
    case 5: g.arc(0, 0, s * 0.92, 0, Math.PI / 2); g.arc(0, 0, s * 0.52, Math.PI / 2, 0, true); g.closePath(); break; // arco
    case 6: g.moveTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.lineTo(0, s / 2); g.closePath(); break; // losango
  }
  g.fill(); g.restore();
}

/** Plano de N peças para um texto. */
export function planejar(texto, n) {
  const R = aleatorio(hash(texto.trim().toLowerCase() || "memória viva"));
  const ks = [0, 1, 2].map(() => Math.floor(R() * 7));
  const pal = [0, 1, 2].map(() => PARES[Math.floor(R() * PARES.length)]);
  return Array.from({ length: n }, () => {
    const q = R();
    const k = q < 0.4 ? ks[0] : q < 0.75 ? ks[1] : q < 0.93 ? ks[2] : Math.floor(R() * 7);
    const [fundo, cor] = pal[Math.floor(R() * 3)];
    return { k, fundo, cor, giro: Math.floor(R() * 4) };
  });
}
