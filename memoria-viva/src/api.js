// Conversa com o servidor (pasta server/). Toda tela usa esta função.
// O cookie de sessão vai junto sozinho; a página nunca vê nem guarda o código da sessão.

export class ErroDaApi extends Error {
  constructor(status, codigo, mensagem, campos = {}) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.campos = campos; // { email: "Já existe uma conta..." } para mostrar no campo certo
  }
}

const SEM_SERVIDOR = "Não conseguimos falar com o Memória Viva agora. Confira sua internet e tente de novo em instantes.";

/** api("/auth/entrar", { corpo: { email, senha } }) → resposta em JSON, ou lança ErroDaApi. */
export async function api(caminho, { metodo, corpo } = {}) {
  let r;
  try {
    r = await fetch(`/api${caminho}`, {
      method: metodo || (corpo ? "POST" : "GET"),
      credentials: "same-origin",
      headers: corpo ? { "Content-Type": "application/json" } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroDaApi(0, "SEM_CONEXAO", SEM_SERVIDOR);
  }
  if (r.status === 204) return null;
  const dados = await r.json().catch(() => null);
  if (r.ok) return dados;
  const e = dados?.erro;
  // a sessão acabou no meio do uso (venceu ou saiu em outra aba): volta para entrar e, depois, para esta página.
  // As rotas de /auth tratam o 401 sozinhas (senha errada, conferir quem está logado).
  if (r.status === 401 && !caminho.startsWith("/auth/")) {
    const aqui = window.location.pathname + window.location.search;
    window.location.href = `/entrar?sessao=encerrada&voltar=${encodeURIComponent(aqui)}`;
    return new Promise(() => {}); // a página vai trocar: não mostra erro nenhum até lá
  }
  throw new ErroDaApi(r.status, e?.codigo || "ERRO", e?.mensagem || SEM_SERVIDOR, e?.campos);
}
