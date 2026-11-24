// Conversa com o servidor (pasta server/). Toda tela usa esta função.
// O cookie de sessão vai junto sozinho; a página nunca vê nem guarda o código da sessão.

export class ErroDaApi extends Error {
  constructor(status, codigo, mensagem, campos = {}, dados = {}) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.campos = campos; // { email: "Já existe uma conta..." } para mostrar no campo certo
    this.dados = dados; // informação extra (ex.: { apagarEm } quando a conta vai ser apagada)
  }
}

const SEM_SERVIDOR = "Não conseguimos falar com o Memória Viva agora. Confira sua internet e tente de novo em instantes.";

/** A sessão acabou no meio do uso: volta para entrar e, depois, para esta página. */
function sessaoEncerrada() {
  const aqui = window.location.pathname + window.location.search;
  window.location.href = `/entrar?sessao=encerrada&voltar=${encodeURIComponent(aqui)}`;
  return new Promise(() => {}); // a página vai trocar: não mostra erro nenhum até lá
}

/**
 * Envia um arquivo (Blob) como corpo da requisição, contando o andamento.
 * enviarArquivo("/familias/3/arquivos?tipo=foto", blob, { onProgresso: (enviados, total) => ... }) → JSON da resposta.
 * Usa XMLHttpRequest porque o fetch ainda não informa o andamento do envio.
 */
export function enviarArquivo(caminho, blob, { metodo = "POST", onProgresso } = {}) {
  return new Promise((ok, falhou) => {
    const x = new XMLHttpRequest();
    x.open(metodo, `/api${caminho}`);
    x.withCredentials = true;
    x.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    if (onProgresso) x.upload.onprogress = (e) => e.lengthComputable && onProgresso(e.loaded, e.total);
    x.onerror = () => falhou(new ErroDaApi(0, "SEM_CONEXAO", "O envio parou no meio. Confira sua internet e tente de novo."));
    x.onabort = () => falhou(new ErroDaApi(0, "CANCELADO", "O envio foi cancelado."));
    x.onload = () => {
      let dados = null;
      try { dados = JSON.parse(x.responseText); } catch { /* sem corpo */ }
      if (x.status >= 200 && x.status < 300) return ok(dados);
      if (x.status === 401) return sessaoEncerrada();
      const e = dados?.erro;
      falhou(new ErroDaApi(x.status, e?.codigo || "ERRO", e?.mensagem || SEM_SERVIDOR, e?.campos, e?.dados));
    };
    x.send(blob);
  });
}

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
  if (r.status === 401 && !caminho.startsWith("/auth/")) return sessaoEncerrada();
  throw new ErroDaApi(r.status, e?.codigo || "ERRO", e?.mensagem || SEM_SERVIDOR, e?.campos, e?.dados);
}
