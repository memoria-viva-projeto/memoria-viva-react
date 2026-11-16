// Árvore da Memória: as regras de crescimento.
// Modo demo: conta as memórias da conta de demonstração (as que não foram excluídas) + as que a pessoa guardou
// neste navegador. Guardar faz a árvore crescer; excluir faz ela recuar.
// Quando houver servidor e login, troque `contarMemorias` e `lerVisto/salvarVisto` pelo banco — o resto continua igual.

import { CONTA } from "../../dados/conta.js";

export const ESTAGIOS = [
  { min: 0, nome: "A primeira muda", curto: "Muda",
    desc: "Você criou sua conta e plantou uma pequena muda. Toda história começa assim.",
    frase: "Sua muda acabou de ser plantada.", libera: "os primeiros galhos e folhas" },
  { min: 1, nome: "Os primeiros registros", curto: "Primeiros registros",
    desc: "Você começou a guardar suas lembranças. O caule cresce e surgem as primeiras folhas.",
    frase: "Sua árvore está brotando.", libera: "a copa e as primeiras flores" },
  { min: 10, nome: "Criando raízes", curto: "Raízes",
    desc: "Novas memórias fazem a árvore ganhar galhos, copa e as primeiras flores.",
    frase: "Sua árvore está começando a florescer.", libera: "uma copa cheia de flores" },
  { min: 22, nome: "Uma história florescendo", curto: "Florescendo",
    desc: "A copa se enche. Cada flor é uma lembrança que agora está guardada.",
    frase: "Sua história está florescendo.", libera: "os primeiros frutos" },
  { min: 36, nome: "Árvore da Memória completa", curto: "Completa",
    desc: "Uma árvore madura, com flores e frutos: a forma da sua história.",
    frase: "Sua árvore está cheia de vida. E ela continua com você.", libera: null },
];

/** Memórias que contam: as da demonstração + as guardadas (rascunhos ficam em outro lugar e não entram). */
export const contarMemorias = (memorias, guardadas) => memorias.length + guardadas.length;

/**
 * Onde a árvore está: estágio (0–4), quanto falta para o próximo e `p` (0–1),
 * o crescimento contínuo usado no desenho (0,25 por estágio; cada memória acrescenta um pouco).
 */
export function progresso(total) {
  let i = 0;
  while (i < ESTAGIOS.length - 1 && total >= ESTAGIOS[i + 1].min) i++;
  const atual = ESTAGIOS[i], prox = ESTAGIOS[i + 1] || null;
  const fracao = prox ? (total - atual.min) / (prox.min - atual.min) : 1;
  const p = prox ? (i + fracao) / (ESTAGIOS.length - 1) : 1;
  return { total, i, atual, prox, fracao, faltam: prox ? prox.min - total : 0, p };
}

// o último estágio que a pessoa já viu (para celebrar só uma vez quando ela chega a um novo)
const chave = () => `mv-arvore-${CONTA.pessoa.id || "conta"}`;
export function lerVisto() {
  try { const v = JSON.parse(localStorage.getItem(chave()) || "null"); return typeof v?.estagio === "number" ? v.estagio : null; } catch { return null; }
}
export function salvarVisto(estagio, total) {
  try { localStorage.setItem(chave(), JSON.stringify({ estagio, total, em: Date.now() })); } catch { /* sem guardar: só não celebra */ }
}
