// Perfil e ajustes da conta com login, guardados no SERVIDOR (abrem em qualquer aparelho).
// O perfil é a pessoa "dona" da família (PATCH /api/pessoas/:id); os ajustes ficam na conta
// (PATCH /api/conta/ajustes). A foto do perfil continua só neste aparelho até o servidor receber arquivos.
import { api } from "../../api.js";
import { GOSTOS, sessao } from "../../dados/conta.js";

const IDS_GOSTOS = new Set(GOSTOS.map((g) => g.id));
const texto = (v) => (v == null ? "" : String(v));
const dois = (n) => String(n).padStart(2, "0");

// ---------- ajustes ----------

export const ajustesDaApi = (a) => ({ texto: a.tamanhoTexto, tema: a.tema, contraste: a.altoContraste, menosMovimento: a.menosMovimento });

export const salvarAjustesNoServidor = (a) =>
  api("/conta/ajustes", {
    metodo: "PATCH",
    corpo: { tamanhoTexto: a.texto, tema: a.tema, altoContraste: Boolean(a.contraste), menosMovimento: Boolean(a.menosMovimento) },
  });

// ---------- perfil ----------

// a tela guarda o nascimento como "AAAA-MM-DD", com partes vazias ("1957-06-", "-06-12")
export function nascimentoParaServidor(s) {
  const [ano, mes, dia] = (s || "").split("-");
  if (ano && mes && dia) return { modo: "dia", dia, mes, ano };
  if (mes && dia) return { modo: "dia", dia, mes }; // aniversário sem o ano
  if (ano && mes) return { modo: "mes", mes, ano };
  if (ano) return { modo: "ano", ano };
  return null; // só o dia, sem o mês, não diz nada
}
function nascimentoDaApi(d) {
  if (!d || !["dia", "mes", "ano"].includes(d.modo)) return "";
  return `${d.ano ?? ""}-${d.mes ? dois(d.mes) : ""}-${d.dia && d.modo === "dia" ? dois(d.dia) : ""}`;
}

/** O perfil da dona, como o servidor tem (sem a foto, que fica neste aparelho). */
export async function carregarPerfil() {
  const a = await api(`/familias/${sessao.idFamilia}/arvore`);
  const eu = a.pessoas.find((p) => p.voce);
  if (!eu) return {};
  sessao.idPessoa = eu.id;
  const gostos = eu.gostos || [];
  return {
    // contas antigas guardaram o nome completo como "como chamam": aí vale o primeiro nome (o mesmo de antes)
    ...(eu.nome && eu.nome !== eu.nomeCompleto ? { nome: eu.nome } : {}),
    ...(eu.nomeCompleto ? { nomeCompleto: eu.nomeCompleto } : {}),
    nascimento: nascimentoDaApi(eu.nascimento),
    cidadeNatal: texto(eu.cidadeNatal), cidadeAtual: texto(eu.cidadeAtual), profissao: texto(eu.profissao), bio: texto(eu.bio),
    ...(eu.capa ? { capa: eu.capa } : {}),
    interesses: gostos.filter((g) => IDS_GOSTOS.has(g)),
    outrosGostos: gostos.filter((g) => !IDS_GOSTOS.has(g)),
    favoritos: { comida: texto(eu.favoritos?.comida), musica: texto(eu.favoritos?.musica), lugar: texto(eu.favoritos?.lugar) },
  };
}

/**
 * Guarda o perfil na pessoa dela no próprio acervo e, do mesmo jeito, nas famílias em que entrou pelo código
 * (lá ela muda só a própria pessoa). Se uma família de outra pessoa falhar, o perfil dela continua guardado.
 */
export async function salvarPerfilNoServidor(p) {
  const corpo = corpoDoPerfil(p);
  const r = await api(`/pessoas/${sessao.idPessoa}`, { metodo: "PATCH", corpo });
  const outras = (sessao.familias || []).filter((f) => f.papel !== "dona" && f.idPessoa);
  await Promise.allSettled(outras.map((f) => api(`/pessoas/${f.idPessoa}`, { metodo: "PATCH", corpo })));
  return r;
}

function corpoDoPerfil(p) {
  return {
    nome: p.nome || "", nomeCompleto: p.nomeCompleto || "", nascimento: nascimentoParaServidor(p.nascimento),
    cidadeNatal: p.cidadeNatal || "", cidadeAtual: p.cidadeAtual || "", profissao: p.profissao || "", bio: p.bio || "",
    capa: p.capa || null,
    gostos: [...(p.interesses || []), ...(p.outrosGostos || [])].map((g) => String(g).trim()).filter(Boolean),
    favoritos: { comida: p.favoritos?.comida || "", musica: p.favoritos?.musica || "", lugar: p.favoritos?.lugar || "" },
  };
}
