// Código de convite da família e as famílias em que a conta entrou (tudo no servidor).
// A dona vê, gera, troca e desliga o código; quem entrou pelo código só vê as memórias e a árvore.
import { api } from "../../api.js";
import { sessao } from "../../dados/conta.js";
import { carregarDoServidor } from "./memoriasServidor.js";

export const verConvite = () => api(`/familias/${sessao.idFamilia}/convite`);
export const gerarConvite = () => api(`/familias/${sessao.idFamilia}/convite`, { metodo: "POST" });
export const desligarConvite = () => api(`/familias/${sessao.idFamilia}/convite`, { metodo: "DELETE" });

/** Entra numa família pelo código; a família passa a aparecer na conta. */
export async function entrarComCodigo(codigo) {
  const f = await api("/convites/entrar", { corpo: { codigo } });
  sessao.familias = [...sessao.familias.filter((x) => x.id !== f.id), f];
  return f;
}

/** As famílias em que a conta entrou pelo código (o acervo dela mesma não entra aqui). */
export const familiasComoMembro = () => sessao.familias.filter((f) => f.papel !== "dona");

/** O que um membro vê de uma família: as memórias (no formato das telas) e as pessoas da árvore. */
export async function abrirFamiliaDeOutro(idFamilia) {
  const [memorias, arvore] = await Promise.all([carregarDoServidor(idFamilia), api(`/familias/${idFamilia}/arvore`)]);
  return { memorias, pessoas: arvore.pessoas.filter((p) => !p.removida) };
}
