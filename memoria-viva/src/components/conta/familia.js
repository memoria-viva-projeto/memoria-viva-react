// Família da pessoa dona da conta: quem é quem e como cada um se liga aos outros.
// Fica no navegador (IndexedDB, loja "familia"), só para esta conta: não é pública e não exige que
// os parentes tenham conta. Nada é presumido: o que não se sabe fica em branco ("a contar").
//
// pessoa: { id, nome (como chamam), nomeCompleto, genero: "f"|"m"|"", foto (endereço) | fotoArq (arquivo guardado),
//           nascimento, falecimento (datas flexíveis, como nas memórias), faleceu, origem, bio, outras, cor, removida,
//           criadaEm (ISO; null na família de demonstração), conta, compartilhado }
//   conta: { estado: "sem-conta" | "convite" | "vinculada", contaId } — hoje todo familiar é "sem-conta": é só um
//          registro da Maria. Quando a pessoa tiver conta, este mesmo registro passa a ser dela (os laços continuam).
//   compartilhado: ids das memórias que a Maria escolheu mostrar a essa pessoa. Vazio = não vê nada (nada é automático).
//   categoria: "familia" | "amigos" | "importantes" | "outros". Só a família entra na árvore; o parentesco dela vem dos laços.
//   vinculo: para quem não é da família, o que a pessoa é para a Maria, com as palavras dela ("amiga de infância", "madrinha").
//   fotoRecorte: { origem } quando a foto é um recorte (aproximado, escolhido pela Maria) de uma foto de grupo.
// laço:   { id, tipo, de, para, modo, rotulo, rotuloVolta }
//   "pais"    de é mãe/pai de para (modo: "" | "adotivo" | "criacao" — madrasta/padrasto)
//   "conjuge" "irmaos" "primos" "cunhados" (valem para os dois lados)
//   "avos"    de é avó/avô de para        "tios" de é tia/tio de para        "sogros" de é sogra/sogro de para
//   "outro"   vínculo com nome livre: de é [rotulo] de para; para é [rotuloVolta] de de ("madrinha" / "afilhada")

import { CONTA } from "../../dados/conta.js";
import { gravarFamilia, lerFamilia, novoId } from "./guardados.js";

export const EU = CONTA.pessoa.id;
// a família do briefing, copiada antes de a conta passar a usar a família guardada
const BRIEFING = CONTA.familia.map((p) => ({ ...p }));
const GENERO = { marido: "m", esposa: "f", filha: "f", filho: "m", neta: "f", neto: "m" };

/** Primeira vez: monta a família de demonstração só com o que o briefing diz. */
const VERSAO = 2;

function semente() {
  const pessoas = BRIEFING.map((p) => ({
    id: p.id, nome: p.nome, nomeCompleto: "", genero: GENERO[p.relacao] || "", cor: p.cor, demo: true,
    nascimento: null, falecimento: null, faleceu: false, origem: "", bio: "", outras: "",
  }));
  const lacos = [];
  const ligar = (tipo, de, para) => lacos.push({ id: novoId("laco"), tipo, de, para, modo: "", rotulo: "" });
  BRIEFING.forEach((p) => {
    if (p.relacao === "marido" || p.relacao === "esposa") ligar("conjuge", EU, p.id);
    if (p.relacao === "filho" || p.relacao === "filha") ligar("pais", EU, p.id);
    (p.pais || []).forEach((pai) => ligar("pais", pai, p.id));
  });
  return atualizar({ pessoas, lacos });
}

/**
 * Traz uma família guardada por versões anteriores para o formato atual, sem perder nada:
 * campos novos com o valor seguro (sem conta, nada compartilhado) e, na versão 2, Antônio como pai dos filhos da demonstração.
 */
function atualizar(f) {
  const pessoas = f.pessoas.map((p) => ({ criadaEm: null, conta: { estado: "sem-conta", contaId: null }, compartilhado: [], categoria: "familia", vinculo: "", ...p }));
  let lacos = f.lacos;
  if ((f.versao || 1) < 2) {
    // na versão 1, "outro" guardava ao contrário (para era [rotulo] de de)
    lacos = lacos.map((l) => (l.tipo === "outro" ? { ...l, de: l.para, para: l.de, rotuloVolta: "" } : l));
    const conjuge = pessoas.find((p) => p.demo && !p.removida && lacos.some((l) => l.tipo === "conjuge" && [l.de, l.para].includes(EU) && [l.de, l.para].includes(p.id)));
    const filhos = conjuge ? pessoas.filter((p) => p.demo && !p.removida && lacos.some((l) => l.tipo === "pais" && l.de === EU && l.para === p.id && !l.modo)) : [];
    filhos.forEach((c) => {
      const pais = lacos.filter((l) => l.tipo === "pais" && l.para === c.id);
      if (pais.length === 1) lacos = [...lacos, { id: novoId("laco"), tipo: "pais", de: conjuge.id, para: c.id, modo: "", rotulo: "" }];
    });
  }
  return { pessoas, lacos, versao: VERSAO };
}

/** Abre a família guardada. Se o navegador não deixar, mostra a de demonstração mesmo assim (naoSalva: avisar). */
export async function carregarFamilia() {
  let f;
  try { f = await lerFamilia(); }
  catch { return { ...semente(), naoSalva: true }; }
  if (f) {
    const atual = atualizar(f);
    if ((f.versao || 1) < VERSAO) gravarFamilia(atual).catch(() => {}); // na próxima vez já abre atualizada
    return atual;
  }
  const nova = semente();
  try { await gravarFamilia(nova); } catch { return { ...nova, naoSalva: true }; }
  return nova;
}
export const salvarFamilia = (f) => gravarFamilia(f);

// ---------------- parentescos ----------------

// [id, nome, tipo do laço, gênero, modo, a nova pessoa é "de" (acima/ao lado) ou "para" (abaixo)]
// O gênero vazio (Cônjuge, Outros familiares) vem da pergunta "Ela / Ele"; os outros já dizem o gênero.
export const RELACOES = [
  ["Família próxima", [["mae", "Mãe", "pais", "f", "", "de"], ["pai", "Pai", "pais", "m", "", "de"],
    ["conjuge", "Cônjuge", "conjuge", "", "", "para"],
    ["filho", "Filho", "pais", "m", "", "para"], ["filha", "Filha", "pais", "f", "", "para"],
    ["irmao", "Irmão", "irmaos", "m", "", "para"], ["irma", "Irmã", "irmaos", "f", "", "para"]]],
  ["Outras gerações", [["avo-m", "Avô", "avos", "m", "", "de"], ["avo-f", "Avó", "avos", "f", "", "de"],
    ["neto", "Neto", "avos", "m", "", "para"], ["neta", "Neta", "avos", "f", "", "para"]]],
  ["Família extensa", [["tio", "Tio", "tios", "m", "", "de"], ["tia", "Tia", "tios", "f", "", "de"],
    ["primo", "Primo", "primos", "m", "", "para"], ["prima", "Prima", "primos", "f", "", "para"],
    ["sobrinho", "Sobrinho", "tios", "m", "", "para"], ["sobrinha", "Sobrinha", "tios", "f", "", "para"]]],
  ["Outros vínculos", [["padrasto", "Padrasto", "pais", "m", "criacao", "de"], ["madrasta", "Madrasta", "pais", "f", "criacao", "de"],
    ["pai-adotivo", "Pai adotivo", "pais", "m", "adotivo", "de"], ["mae-adotiva", "Mãe adotiva", "pais", "f", "adotivo", "de"],
    ["enteado", "Enteado", "pais", "m", "criacao", "para"], ["enteada", "Enteada", "pais", "f", "criacao", "para"],
    ["filho-adotivo", "Filho adotivo", "pais", "m", "adotivo", "para"], ["filha-adotiva", "Filha adotiva", "pais", "f", "adotivo", "para"],
    ["sogro", "Sogro", "sogros", "m", "", "de"], ["sogra", "Sogra", "sogros", "f", "", "de"],
    ["genro", "Genro", "sogros", "m", "", "para"], ["nora", "Nora", "sogros", "f", "", "para"],
    ["cunhado", "Cunhado", "cunhados", "m", "", "para"], ["cunhada", "Cunhada", "cunhados", "f", "", "para"],
    ["outro", "Outros familiares", "outro", "", "", "de"]]],
];
export const RELACAO = Object.fromEntries(RELACOES.flatMap(([, l]) => l.map((r) => [r[0], r])));
const SIMETRICOS = ["conjuge", "irmaos", "primos", "cunhados"];

const g3 = (gen, f, m, n) => (gen === "f" ? f : gen === "m" ? m : n);

/** Como x se chama em relação a y, por um laço direto ("Mãe", "Neta", "Marido"...). null se não há laço direto. */
export function lacoDireto(f, x, y) {
  const p = (id) => (id === EU ? CONTA.pessoa : f.pessoas.find((q) => q.id === id) || {});
  const gx = p(x).genero;
  for (const l of f.lacos) {
    const ida = l.de === x && l.para === y, volta = l.de === y && l.para === x;
    if (!ida && !volta) continue;
    if (l.tipo === "pais" && ida) {
      if (l.modo === "adotivo") return g3(gx, "Mãe adotiva", "Pai adotivo", "Mãe ou pai adotivo");
      if (l.modo === "criacao") return g3(gx, "Madrasta", "Padrasto", "Madrasta ou padrasto");
      return g3(gx, "Mãe", "Pai", "Mãe ou pai");
    }
    if (l.tipo === "pais" && volta) {
      if (l.modo === "adotivo") return g3(gx, "Filha adotiva", "Filho adotivo", "Filho adotivo");
      if (l.modo === "criacao") return g3(gx, "Enteada", "Enteado", "Enteado");
      return g3(gx, "Filha", "Filho", "Filho ou filha");
    }
    if (l.tipo === "conjuge") return g3(gx, "Esposa", "Marido", "Cônjuge");
    if (l.tipo === "irmaos") return g3(gx, "Irmã", "Irmão", "Irmão ou irmã");
    if (l.tipo === "primos") return g3(gx, "Prima", "Primo", "Primo ou prima");
    if (l.tipo === "avos") return ida ? g3(gx, "Avó", "Avô", "Avó ou avô") : g3(gx, "Neta", "Neto", "Neto ou neta");
    if (l.tipo === "tios") return ida ? g3(gx, "Tia", "Tio", "Tia ou tio") : g3(gx, "Sobrinha", "Sobrinho", "Sobrinho ou sobrinha");
    if (l.tipo === "sogros") return ida ? g3(gx, "Sogra", "Sogro", "Sogra ou sogro") : g3(gx, "Nora", "Genro", "Genro ou nora");
    if (l.tipo === "cunhados") return g3(gx, "Cunhada", "Cunhado", "Cunhado ou cunhada");
    if (l.tipo === "outro") return (ida ? l.rotulo : l.rotuloVolta) || "Outro vínculo";
  }
  return null;
}

/** Qual opção do seletor descreve o laço entre x e y ("x é [opção] de y"). "" se não há laço direto. */
export function relacaoDe(f, x, y) {
  const l = f.lacos.find((q) => (q.de === x && q.para === y) || (q.de === y && q.para === x));
  if (!l) return "";
  const gx = (x === EU ? CONTA.pessoa : f.pessoas.find((q) => q.id === x) || {}).genero;
  const lado = l.de === x ? "de" : "para";
  const cabem = Object.values(RELACAO).filter(([, , tipo, , modo, ld]) => tipo === l.tipo && modo === (l.modo || "") && (SIMETRICOS.includes(tipo) || ld === lado));
  return (cabem.find((r) => r[3] === gx) || cabem.find((r) => !r[3]) || cabem[0] || [""])[0];
}

// "x é [a] de v" e "v é [b] de mim" → x é ... de mim (os casos mais comuns)
const COMPOSTOS = {
  "Filho|Filho": ["Neta", "Neto", "Neto ou neta"], "Cônjuge|Filho": ["Nora", "Genro", "Genro ou nora"],
  "Pai|Pai": ["Avó", "Avô", "Avó ou avô"], "Irmão|Pai": ["Tia", "Tio", "Tia ou tio"], "Filho|Irmão": ["Sobrinha", "Sobrinho", "Sobrinho ou sobrinha"],
  "Filho|Tio": ["Prima", "Primo", "Primo ou prima"], "Pai|Cônjuge": ["Sogra", "Sogro", "Sogro ou sogra"],
  "Irmão|Cônjuge": ["Cunhada", "Cunhado", "Cunhado ou cunhada"], "Cônjuge|Irmão": ["Cunhada", "Cunhado", "Cunhado ou cunhada"],
  "Filho|Neto": ["Bisneta", "Bisneto", "Bisneto ou bisneta"], "Pai|Avô": ["Bisavó", "Bisavô", "Bisavó ou bisavô"],
};
const familiaDe = (rotulo) => {
  if (!rotulo) return null;
  if (/^(Mãe|Pai|Madrasta|Padrasto)/.test(rotulo)) return "Pai";
  if (/^(Filh|Entead)/.test(rotulo)) return "Filho";
  if (/^(Esposa|Marido|Cônjuge)/.test(rotulo)) return "Cônjuge";
  if (/^Irm/.test(rotulo)) return "Irmão";
  if (/^Net/.test(rotulo)) return "Neto";
  if (/^Av/.test(rotulo)) return "Avô";
  if (/^Ti/.test(rotulo)) return "Tio";
  if (/^Sogr/.test(rotulo)) return "Sogro";
  if (/^(Genro|Nora)/.test(rotulo)) return "Genro";
  return null;
};

// ---------------- categorias (família, amigos...) ----------------

// [id, nome do grupo, uma pessoa assim, ícone, explicação curta, sugestões de vínculo]
export const CATEGORIAS = [
  ["familia", "Família", "Familiar", "familia", "Parentes de sangue, por casamento ou de criação. Entram na árvore.", []],
  ["amigos", "Amigos", "Amizade", "coracao", "Amizades de qualquer fase da vida.",
    ["Melhor amiga", "Melhor amigo", "Amiga de infância", "Amigo de infância", "Amiga próxima", "Amigo próximo", "Vizinha querida", "Vizinho querido", "Comadre", "Compadre"]],
  ["importantes", "Pessoas importantes", "Pessoa importante", "estrela", "Quem marcou a sua vida: madrinhas, padrinhos, afilhados.",
    ["Madrinha", "Padrinho", "Afilhada", "Afilhado", "Pessoa muito querida"]],
  ["outros", "Outros vínculos", "Outro vínculo", "link", "Colegas, professores, vizinhos, gente de uma fase da vida.",
    ["Colega de trabalho", "Colega de escola", "Professora", "Professor", "Vizinha", "Vizinho"]],
];
export const CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c[0], c]));
export const categoriaDe = (p) => (p && CATEGORIA[p.categoria] ? p.categoria : "familia");
export const ehFamilia = (p) => categoriaDe(p) === "familia";

/** Como a pessoa se chama em relação a quem é dona da conta. */
export function parentesco(f, id) {
  if (id === EU) return "Você";
  const pessoa = f.pessoas.find((q) => q.id === id);
  if (pessoa && !ehFamilia(pessoa)) return pessoa.vinculo || CATEGORIA[categoriaDe(pessoa)][2];
  const direto = lacoDireto(f, id, EU);
  if (direto) return direto;
  // caminho mais curto até "eu" (busca em largura); com dois passos, tenta um nome conhecido
  const vizinhos = (a) => f.lacos.flatMap((l) => (l.de === a ? [l.para] : l.para === a ? [l.de] : []));
  const veio = new Map([[id, null]]);
  const fila = [id];
  while (fila.length && !veio.has(EU)) {
    const a = fila.shift();
    vizinhos(a).forEach((b) => { if (!veio.has(b)) { veio.set(b, a); fila.push(b); } });
  }
  if (!veio.has(EU)) return "Família";
  const caminho = [EU];
  while (caminho[0] !== id) caminho.unshift(veio.get(caminho[0]));
  const via = caminho[1];
  const a = lacoDireto(f, id, via), b = lacoDireto(f, via, EU);
  const nome = COMPOSTOS[`${familiaDe(a)}|${familiaDe(b)}`];
  const gx = (f.pessoas.find((q) => q.id === id) || {}).genero;
  if (nome) return g3(gx, ...nome);
  return `${a} de ${nomeDe(f, via)}`;
}

/** Nome para mostrar; sem nome, o parentesco ("Sua mãe — nome a contar"). */
export function nomeDe(f, id) {
  if (id === EU) return CONTA.pessoa.nome;
  const p = f.pessoas.find((q) => q.id === id);
  if (!p) return id;
  return p.nome || p.nomeCompleto || `${parentesco(f, id)} (nome a contar)`;
}

/** O que ainda falta contar sobre a pessoa (para mostrar "a completar", sem cobrar). */
export const faltaContar = (p) => [!p.nome && !p.nomeCompleto && "nome", !p.foto && !p.fotoArq && "foto", !p.nascimento?.modo && "quando nasceu", !p.bio && "história"].filter(Boolean);

// ---------------- mudar a família ----------------

/**
 * Liga duas pessoas: "outra é [relação] de ancora" (ex.: ligar(f, "juliana", "x", "filha") → x é filha de Juliana).
 * Troca o laço que já houver entre as duas. Se a relação diz o gênero (Filho, Avó...), o cadastro de "outra" passa
 * a ter esse gênero, para o parentesco aparecer igual em toda parte. Para "outro": rotulo = o que outra é de ancora;
 * rotuloVolta = o que ancora é de outra (opcional).
 */
export function ligar(f, ancora, outra, rel, rotulo = "", rotuloVolta = "") {
  const [, , tipo, gen, modo, lado] = RELACAO[rel];
  const [de, para] = lado === "de" ? [outra, ancora] : [ancora, outra];
  const outro = tipo === "outro";
  const lacos = f.lacos.filter((l) => !((l.de === ancora && l.para === outra) || (l.de === outra && l.para === ancora)));
  const pessoas = gen && outra !== EU ? f.pessoas.map((p) => (p.id === outra ? { ...p, genero: gen } : p)) : f.pessoas;
  return { ...f, pessoas, lacos: [...lacos, { id: novoId("laco"), tipo, de, para, modo, rotulo: outro ? rotulo : "", rotuloVolta: outro ? rotuloVolta : "" }] };
}
export const desligar = (f, a, b) => ({ ...f, lacos: f.lacos.filter((l) => !((l.de === a && l.para === b) || (l.de === b && l.para === a))) });

/** Nova pessoa (ou mudanças numa que já existe). O gênero vem da relação escolhida, se ainda não se sabe. */
export function guardarPessoa(f, p) {
  const existe = f.pessoas.some((q) => q.id === p.id);
  return { ...f, pessoas: existe ? f.pessoas.map((q) => (q.id === p.id ? p : q)) : [...f.pessoas, p] };
}
/** Tirar da família: some da árvore, mas o nome continua nas memórias em que a pessoa foi marcada. */
export const removerPessoa = (f, id) => ({
  ...f,
  pessoas: f.pessoas.map((p) => (p.id === id ? { ...p, removida: true } : p)),
  lacos: f.lacos.filter((l) => l.de !== id && l.para !== id),
});

export const novaPessoa = (genero = "", categoria = "familia") => ({
  id: novoId("pes"), nome: "", nomeCompleto: "", genero, nascimento: null, falecimento: null, faleceu: false, origem: "", bio: "", outras: "", cor: "linho",
  criadaEm: new Date().toISOString(), conta: { estado: "sem-conta", contaId: null }, compartilhado: [], categoria, vinculo: "",
});

const simples = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** Já existe alguém com esse nome? (para não cadastrar a mesma pessoa duas vezes) */
export const mesmoNome = (f, nome, menos) => (simples(nome) ? f.pessoas.filter((p) => !p.removida && p.id !== menos && (simples(p.nome) === simples(nome) || simples(p.nomeCompleto) === simples(nome))) : []);

// ---------------- gerações (para a árvore) ----------------

/** Geração de cada pessoa em relação a mim (0 = eu; 1 = pais; -1 = filhos...). Laços "outro" ficam na mesma geração. */
export function geracoes(f) {
  const gen = new Map([[EU, 0]]);
  const fila = [EU];
  const passo = { pais: 1, avos: 2, tios: 1, sogros: 1 };
  while (fila.length) {
    const a = fila.shift();
    f.lacos.forEach((l) => {
      let b, d;
      if (l.de === a) { b = l.para; d = -(passo[l.tipo] || 0); }
      else if (l.para === a) { b = l.de; d = passo[l.tipo] || 0; }
      else return;
      if (!gen.has(b)) { gen.set(b, gen.get(a) + d); fila.push(b); }
    });
  }
  return gen;
}

/** Entrou na família há pouco (30 dias)? A família de demonstração não conta como nova. */
export const ehNova = (p) => !!p.criadaEm && Date.now() - new Date(p.criadaEm).getTime() < 30 * 864e5;

/**
 * A família em núcleos, para o início: quem está ao meu lado (cônjuge), uma "casa" para cada filho
 * (com cônjuge e descendentes) e o resto dos parentes. Cada pessoa aparece uma vez só.
 */
export function nucleos(f) {
  const vivos = new Set(f.pessoas.filter((p) => !p.removida && ehFamilia(p)).map((p) => p.id));
  const filhosDe = (id) => f.lacos.filter((l) => l.tipo === "pais" && l.de === id && vivos.has(l.para)).map((l) => l.para);
  const conjugesDe = (id) => f.lacos.filter((l) => l.tipo === "conjuge" && (l.de === id || l.para === id)).map((l) => (l.de === id ? l.para : l.de)).filter((x) => vivos.has(x));
  const usados = new Set([EU]);
  const ladoDeMim = conjugesDe(EU);
  ladoDeMim.forEach((x) => usados.add(x));
  const meusFilhos = [...new Set(filhosDe(EU))];
  meusFilhos.forEach((x) => usados.add(x));
  const casas = meusFilhos.map((filho) => {
    const membros = [];
    const juntar = (x) => { if (!usados.has(x)) { usados.add(x); membros.push(x); } };
    const descer = (x) => filhosDe(x).forEach((c) => { juntar(c); conjugesDe(c).forEach(juntar); descer(c); });
    conjugesDe(filho).forEach(juntar);
    descer(filho);
    return { id: filho, membros };
  });
  return { ladoDeMim, casas, resto: [...vivos].filter((x) => !usados.has(x)) };
}

/** Quem não é da família, por categoria (amigos, pessoas importantes, outros vínculos), na ordem em que entraram. */
export const porCategoria = (f) => CATEGORIAS.slice(1).map(([cat]) => [cat, f.pessoas.filter((p) => !p.removida && categoriaDe(p) === cat).map((p) => p.id)]);

/** Atualiza a lista usada no resto da conta (marcar pessoas, avatares, "Quem aparece"): uma pessoa, um registro. */
export function aplicarNaConta(f) {
  CONTA.familia.length = 0;
  f.pessoas.forEach((p) => { // inclui quem saiu da família: o nome continua nas memórias
    CONTA.familia.push({
      id: p.id, nome: nomeDe(f, p.id), relacao: p.removida ? "" : parentesco(f, p.id).toLowerCase(), cor: p.cor || "linho",
      foto: p.foto, fotoArq: p.fotoArq, removida: p.removida,
      pais: f.lacos.filter((l) => l.tipo === "pais" && l.para === p.id).map((l) => l.de),
    });
  });
}
