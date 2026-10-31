import { reduzirMovimento } from "../../azulejaria.js";

export const PROXIMA_ETAPA = "Esta parte chega na próxima etapa.";

/** Movimento do sistema OU o ajuste "Menos movimento". */
export const menosMovimento = () =>
  reduzirMovimento() || document.documentElement.dataset.movimento === "menos";

// ---- ajustes, salvos no navegador ----
const CHAVE = "mv-ajustes-v2"; // v2: o padrão passou a ser o tema claro
export const AJUSTES_PADRAO = { texto: "normal", tema: "claro", contraste: false, menosMovimento: false };

export function lerAjustes() {
  try {
    return { ...AJUSTES_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") };
  } catch {
    return AJUSTES_PADRAO;
  }
}

export function salvarAjustes(a) {
  try { localStorage.setItem(CHAVE, JSON.stringify(a)); } catch { /* navegador sem armazenamento: segue sem salvar */ }
}

export function aplicarAjustes(a) {
  const d = document.documentElement.dataset;
  d.texto = a.texto;
  d.tema = a.tema;
  d.contraste = a.contraste ? "alto" : "normal";
  d.movimento = a.menosMovimento ? "menos" : "normal";
}

// ---- perfil editado, salvo no navegador ----
const CHAVE_PERFIL = "mv-perfil";
export const CAMPOS_PERFIL = ["nome", "nomeCompleto", "nascimento", "cidadeNatal", "cidadeAtual", "profissao", "bio", "foto", "capa", "interesses", "outrosGostos", "favoritos"];

export function lerPerfil() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_PERFIL) || "{}");
  } catch {
    return {};
  }
}

/** Devolve false quando o navegador não deixou guardar (ex.: foto grande demais). */
export function salvarPerfil(p) {
  const so = Object.fromEntries(CAMPOS_PERFIL.map((c) => [c, p[c]]));
  try { localStorage.setItem(CHAVE_PERFIL, JSON.stringify(so)); return true; } catch { return false; }
}

/** Reduz a foto escolhida para um quadrado de 360 px (cabe no armazenamento do navegador). */
export function reduzirFoto(arquivo) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height), t = 360;
      const cv = document.createElement("canvas");
      cv.width = cv.height = t;
      cv.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, t, t);
      URL.revokeObjectURL(img.src);
      ok(cv.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = erro;
    img.src = URL.createObjectURL(arquivo);
  });
}

// ---- confete de azulejos ----
const PECAS = [
  (a, b) => `radial-gradient(circle at 0 0, ${b} 0 70%, ${a} 71%)`,          // quarto de círculo
  (a, b) => `linear-gradient(135deg, ${b} 0 50%, ${a} 50%)`,                   // triângulo
  (a, b) => `radial-gradient(circle, ${b} 0 32%, ${a} 34%)`,                   // círculo
  (a, b) => `linear-gradient(${a} 0 20%, ${b} 20% 40%, ${a} 40% 60%, ${b} 60% 80%, ${a} 80%)`, // listras
];
const CORES = [["#F9F7F1", "#D35400"], ["#1E375A", "#F1C40F"], ["#F9F7F1", "#2980B9"], ["#F1C40F", "#D35400"], ["#1E375A", "#F9F7F1"]];

/** Solta azulejinhos a partir de um elemento (ao confirmar ou guardar uma memória). */
export function confete(origem) {
  if (!origem || menosMovimento()) return;
  const r = origem.getBoundingClientRect();
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const camada = document.createElement("div");
  camada.className = "confete";
  camada.setAttribute("aria-hidden", "true");
  document.body.appendChild(camada);

  const voos = Array.from({ length: 22 }, (_, i) => {
    const p = document.createElement("span");
    const [a, b] = CORES[i % CORES.length];
    p.style.background = PECAS[i % PECAS.length](a, b);
    p.style.left = `${x0}px`;
    p.style.top = `${y0}px`;
    camada.appendChild(p);
    const ang = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 110;
    const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.7 - 60;
    const giro = (Math.random() - 0.5) * 540;
    return p.animate(
      [
        { transform: "translate(-50%,-50%) scale(.4) rotate(0deg)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${giro / 2}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 120}px)) scale(.9) rotate(${giro}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
    ).finished;
  });
  Promise.allSettled(voos).then(() => camada.remove());
}
