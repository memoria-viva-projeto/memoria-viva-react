// Planos na tela. Com login, tudo vem do servidor (GET /api/planos, GET e POST /api/conta/plano), que guarda o
// plano no banco e aplica os limites. Na demonstração da Maria (sem login), a troca vale só neste navegador,
// como as outras mudanças da demonstração. Não existe pagamento: a troca é sempre uma simulação.
import { api } from "../../api.js";
import { PLANOS_RESERVA } from "../../dados/planos.js";
import { sessao } from "../../dados/conta.js";

const CHAVE_DEMO = "mv-demo-plano";
const PLANO_DEMO = "Família Ampliada"; // a Maria tem uma família grande na demonstração
const GB = 1024 ** 3;

/** O catálogo. Sem servidor (ex.: site publicado só com o front), usa a cópia de reserva. */
export async function carregarCatalogo() {
  try {
    return await api("/planos");
  } catch {
    return PLANOS_RESERVA;
  }
}

function lerDemo() {
  try { return JSON.parse(localStorage.getItem(CHAVE_DEMO) || "null"); } catch { return null; }
}

/** O plano da conta: { plano, ciclo, desde, acervos[] } (na demonstração, acervos vem vazio). */
export async function carregarMeuPlano(real, catalogo) {
  if (real) return api("/conta/plano");
  const salvo = lerDemo();
  const plano = catalogo.find((p) => p.id === salvo?.idPlano) || catalogo.find((p) => p.nome === PLANO_DEMO) || catalogo[0];
  return { plano, ciclo: plano.gratis ? null : salvo?.ciclo || "mensal", desde: salvo?.desde || null, acervos: [], demonstracao: true };
}

/**
 * O plano da conta libera o feed da família? Com login, quem diz é o servidor (vem na sessão: plano.feedFamilia).
 * Na demonstração, o plano escolhido neste navegador. Os comentários do feed ficam no navegador, então a regra
 * é aplicada aqui, na tela, a partir do que o servidor informa.
 */
export function feedLiberado() {
  if (sessao.idUsuario) return sessao.plano?.feedFamilia !== false; // sem a informação, não esconde nada por engano
  const salvo = lerDemo();
  const p = PLANOS_RESERVA.find((x) => x.id === salvo?.idPlano) || PLANOS_RESERVA.find((x) => x.nome === PLANO_DEMO);
  return p ? p.feedFamilia : true;
}

/** O plano é "de família" (convida a família e tem o feed)? É a mesma regra do servidor (servicos/planos.js). */
export const planoDeFamilia = feedLiberado;

/** Troca simulada. Com login: grava no banco e devolve { plano, ciclo, desde, acervos, avisos }. */
export async function trocarPlano(real, catalogo, idPlano, ciclo) {
  if (real) {
    const r = await api("/conta/plano", { corpo: { idPlano, ...(ciclo ? { ciclo } : {}) } });
    // a sessão da tela passa a valer o plano novo (o feed abre ou fecha sem precisar recarregar)
    sessao.plano = { id: r.plano.id, nome: r.plano.nome, ciclo: r.ciclo, feedFamilia: r.plano.feedFamilia };
    return r;
  }
  const plano = catalogo.find((p) => p.id === idPlano);
  const c = plano.gratis ? null : ciclo || "mensal";
  const desde = new Date().toISOString();
  try { localStorage.setItem(CHAVE_DEMO, JSON.stringify({ idPlano, ciclo: c, desde })); } catch { /* vale até recarregar */ }
  return { plano, ciclo: c, desde, acervos: [], avisos: [], demonstracao: true };
}

/**
 * O que vai ficar parado se a conta for para este plano (só nos acervos em que ela é dona).
 * É só uma prévia para a tela de confirmação: quem decide de verdade é o servidor, com a mesma regra.
 */
export function avisosPrevistos(acervos, plano) {
  const avisos = [];
  for (const a of acervos.filter((x) => x.papel === "dona")) {
    if (plano.limitePessoas != null && a.pessoas.usadas > plano.limitePessoas) {
      avisos.push(`O acervo ${a.nome} tem ${a.pessoas.usadas} pessoas e o ${plano.nome} permite ${plano.limitePessoas}. Ninguém sai, mas novos convites ficam parados.`);
    }
    if (a.espaco.usadoBytes > plano.espacoGb * GB) {
      avisos.push(`O acervo ${a.nome} usa ${tamanho(a.espaco.usadoBytes)} e o ${plano.nome} tem ${plano.espacoGb} GB. Nenhuma foto é apagada, mas novos envios ficam parados.`);
    }
  }
  return avisos;
}

export const reais = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function tamanho(bytes) {
  if (bytes >= GB) return `${(bytes / GB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;
  return `${Math.max(0, Math.round(bytes / 1024 ** 2)).toLocaleString("pt-BR")} MB`;
}

export const pessoasTexto = (p) => (p.limitePessoas === 1 ? "Só você no acervo" : `Até ${p.limitePessoas} pessoas no acervo`);

/** Preço do plano no ciclo pedido: { valor, rotulo, equivalente? }. */
export function preco(plano, ciclo) {
  if (plano.gratis) return { valor: "Grátis", rotulo: "para sempre" };
  if (ciclo === "anual" && plano.valorAnual != null) {
    return { valor: reais(plano.valorAnual), rotulo: "por ano", equivalente: `equivale a ${reais(plano.valorAnual / 12)} por mês` };
  }
  return { valor: reais(plano.valorMensal), rotulo: "por mês" };
}
