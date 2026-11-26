// Regras dos planos. Aqui não há SQL (fica em dados/) nem HTTP (fica em rotas/).
//
// - O catálogo vem só do banco (tabela plano): preço, espaço, pessoas, conversas e os textos da tela.
// - Os limites que o servidor APLICA são dois, sempre pelo plano da DONA do acervo:
//     espaço (servicos/arquivos.js, no envio de fotos) e pessoas (servicos/convites.js, nos convites).
//   "Conversas por mês" e os itens "em breve" são só informação: a IA guiada e esses recursos ainda não existem.
// - Trocar de plano é uma SIMULAÇÃO: não há pagamento, cartão nem cobrança. Só muda o plano da conta.
// - Plano menor do que o uso (decisão aprovada: "permite e congela"): a troca acontece, nada é apagado e ninguém
//   sai do acervo; só os novos envios e convites ficam parados até o uso caber no plano.
import { emTransacao } from "../db.js";
import { ErroApi } from "../erros.js";
import * as arquivos from "../dados/arquivos.js";
import * as convites from "../dados/convites.js";
import * as planos from "../dados/planos.js";

const GB = 1024 ** 3;

/**
 * Plano "de família": mais de uma pessoa no acervo (ou sem limite). É ele que libera convidar a família E o feed
 * da família (a vista de Minhas memórias com os comentários de todos). Uma regra só para as duas coisas.
 */
export const liberaFamilia = (p) => p.limite_membros == null || p.limite_membros > 1;
const lista = (v) => (Array.isArray(v) ? v : typeof v === "string" ? JSON.parse(v) : []);
const dinheiro = (v) => (v == null ? null : Number(v));

/** Linha do banco → o que a tela recebe. */
export function formatar(p) {
  return {
    id: p.id_plano,
    nome: p.nome,
    valorMensal: dinheiro(p.valor_mensal),
    valorAnual: dinheiro(p.valor_anual),
    gratis: Number(p.valor_mensal) === 0,
    espacoGb: Number(p.armazenamento_gb),
    conversasMes: p.creditos_ia_mes,
    limitePessoas: p.limite_membros, // null = sem limite
    convidaFamilia: liberaFamilia(p),
    feedFamilia: liberaFamilia(p), // o feed da família só existe nos planos Família (a tela aplica: os comentários ficam no navegador)
    descricao: p.descricao,
    recursos: lista(p.recursos),
    emBreve: lista(p.em_breve),
  };
}

/** O ciclo que vale para o plano: Grátis não tem; pago é mensal, ou anual se o plano tiver preço anual. */
export function cicloPara(plano, pedido) {
  if (Number(plano.valor_mensal) === 0) return null;
  const ciclo = pedido || "mensal";
  if (ciclo === "anual" && plano.valor_anual == null) {
    throw new ErroApi(400, "CICLO_INVALIDO", `O plano ${plano.nome} não tem opção anual.`, { ciclo: "Este plano é só mensal." });
  }
  return ciclo;
}

/** O plano que a conta pediu (ou null), conferindo que ele existe. */
export async function planoValido(db, idPlano) {
  const p = await planos.buscar(db, idPlano);
  if (!p) throw new ErroApi(400, "PLANO_INVALIDO", "Este plano não existe. Escolha um dos planos da lista.", { idPlano: "Escolha um plano da lista." });
  return p;
}

export async function listar(pool) {
  return (await planos.listar(pool)).map(formatar);
}

/** O plano da conta, os acervos em que ela está e quanto de cada limite já foi usado. */
export async function daConta(pool, idUsuario) {
  const p = await planos.daConta(pool, idUsuario);
  if (!p) return null;
  const acervos = [];
  for (const a of await planos.acervosDaConta(pool, idUsuario)) {
    const { limite: limitePessoas } = await convites.limiteDaFamilia(pool, a.id_familia);
    const pessoas = await convites.contarMembros(pool, a.id_familia);
    const espaco = await arquivos.espaco(pool, a.id_familia);
    acervos.push({
      id: a.id_familia,
      nome: a.nome,
      papel: a.papel,
      dona: a.nome_dona,
      plano: a.plano_dona, // o plano que vale neste acervo (o da dona)
      pessoas: { usadas: pessoas, limite: limitePessoas, passou: limitePessoas != null && pessoas > limitePessoas },
      espaco: { usadoBytes: espaco.usado, limiteBytes: espaco.limite, passou: espaco.limite != null && espaco.usado > espaco.limite },
    });
  }
  return {
    plano: formatar(p),
    ciclo: p.ciclo_plano,
    desde: p.plano_desde,
    acervos,
  };
}

/** Troca simulada. Devolve o plano novo e, se o uso passar do plano, os avisos do que ficou parado. */
export async function mudar(pool, { idUsuario, idPlano, ciclo }) {
  await emTransacao(pool, async (conn) => {
    const novo = await planoValido(conn, idPlano);
    const cicloNovo = cicloPara(novo, ciclo);
    const atual = await planos.daConta(conn, idUsuario);
    if (!atual) throw new ErroApi(404, "NAO_ENCONTRADO", "Conta não encontrada.");
    if (atual.id_plano === novo.id_plano && (atual.ciclo_plano ?? null) === cicloNovo) {
      throw new ErroApi(409, "MESMO_PLANO", `Você já está no plano ${novo.nome}${cicloNovo ? ` ${cicloNovo}` : ""}.`);
    }
    await planos.mudarDaConta(conn, { idUsuario, idPlano: novo.id_plano, ciclo: cicloNovo });
  });
  const conta = await daConta(pool, idUsuario);
  return { ...conta, avisos: avisosDeUso(conta) };
}

/** O que ficou parado nos acervos da própria conta (só os que ela é dona: é o plano dela que vale lá). */
export function avisosDeUso(conta) {
  const avisos = [];
  for (const a of conta.acervos.filter((x) => x.papel === "dona")) {
    if (a.pessoas.passou) {
      avisos.push(`O acervo ${a.nome} tem ${a.pessoas.usadas} pessoas e o plano ${conta.plano.nome} permite ${a.pessoas.limite}. Ninguém sai, mas novos convites ficam parados até caber no plano.`);
    }
    if (a.espaco.passou) {
      avisos.push(`O acervo ${a.nome} usa ${gb(a.espaco.usadoBytes)} e o plano ${conta.plano.nome} tem ${gb(a.espaco.limiteBytes)}. Nenhuma foto é apagada, mas novos envios ficam parados até caber no plano.`);
    }
  }
  return avisos;
}

const gb = (bytes) => `${(bytes / GB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB`;

// ---- mensagens de limite (as mesmas em todo o servidor) ----
export const erroSemConvite = () =>
  new ErroApi(409, "PLANO_SEM_CONVITE", "Seu plano é só para você. Para convidar a família, escolha um plano Família na aba Planos.");

export const erroFamiliaCheia = () =>
  new ErroApi(409, "FAMILIA_CHEIA", "Esta família já está com todos os lugares do plano. Fale com quem te convidou: dá para ganhar mais lugares mudando de plano.");

export const erroSemEspaco = (limiteBytes) =>
  new ErroApi(507, "ESPACO_CHEIO", `O espaço do plano acabou (${gb(limiteBytes)}). Apague alguma foto ou veja os planos com mais espaço.`);
