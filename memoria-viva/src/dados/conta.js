// Conta de demonstração da Maria. Dados fictícios.
// Tudo num objeto só, para as próximas etapas (conversa, guardar, linha da vida) reaproveitarem.

export const CONTA = {
  // Dados do perfil: a Maria pode editar (ficam salvos no navegador, ver efeitos.js).
  pessoa: {
    id: "maria",
    nome: "Maria", // como gosta de ser chamada (aparece na saudação)
    nomeCompleto: "Maria de Lourdes Ferreira",
    // Nada sobre a vida dela é inventado: o que não veio dela (ou do briefing) fica vazio até ela contar.
    nascimento: "",
    cidadeNatal: "",
    cidadeAtual: "",
    profissao: "Costureira aposentada",
    genero: "f", // do briefing (esposa, mãe e avó): usado para escrever os parentescos na Família
    bio: "",
    foto: "/img/maria/hoje.jpg",
    capa: "ladrilho", // id de CAPAS (foto ilustrativa)
    interesses: [], // ids de GOSTOS
    outrosGostos: [],
    favoritos: { comida: "", musica: "", lugar: "" },
    ajudante: "juliana", // quem da família ajuda a cuidar do perfil
    demonstracao: true,
  },

  familia: [
    { id: "antonio", nome: "Antônio", relacao: "marido", cor: "anil" },
    { id: "juliana", nome: "Juliana", relacao: "filha", filhos: ["beatriz"], cor: "urucum" },
    { id: "carlos", nome: "Carlos", relacao: "filho", filhos: ["thiago"], cor: "samambaia" },
    { id: "lucas", nome: "Lucas", relacao: "filho", cor: "azulejo" },
    { id: "camila", nome: "Camila", relacao: "filha", cor: "turquesa" },
    { id: "beatriz", nome: "Beatriz", relacao: "neta", pais: ["juliana"], cor: "gema" },
    { id: "thiago", nome: "Thiago", relacao: "neto", pais: ["carlos"], cor: "barro" },
  ],

  // origem.tipo: "maria" (contada por ela) | "familia" (enviada por alguém; origem.por = id)
  // status: "confirmada" | "aguardando" (nada da família ou da IA vale sem a Maria confirmar)
  // pessoas: ids da família ou, para quem não tem cadastro, o nome escrito
  // publicadaHaDias: só para o protótipo mostrar "há 2 dias"
  // texto: só quando a própria pessoa contou (nunca inventar o relato)
  memorias: [
    {
      id: "reencontro", ano: 2022, quando: "2022", titulo: "O reencontro da família", lugar: "Fortaleza, CE", tipo: "foto",
      origem: { tipo: "familia", por: "juliana" }, status: "aguardando",
      pessoas: ["antonio", "juliana", "carlos", "lucas", "camila", "beatriz", "thiago"],
      foto: "/img/maria/2022-reencontro.jpg", alt: "Maria no centro de um grupo sorridente de filhos e netos", legenda: "Fortaleza, 2022",
      publicadaHaDias: 0,
      emocionaram: [],
      comentarios: [],
    },
    {
      id: "jardim", ano: 1990, quando: "Por volta de 1990", titulo: "Eu e Antônio no jardim", lugar: "Belo Horizonte, MG", tipo: "foto",
      origem: { tipo: "familia", por: "carlos" }, status: "aguardando",
      pessoas: ["antonio"],
      sugestaoIA: { campo: "data", texto: "Pelas roupas e pela cor da foto, parece ser do começo dos anos 1990." },
      foto: "/img/maria/1982-bodas.jpg", alt: "Maria e Antônio abraçados diante de uma buganvília florida", legenda: "Belo Horizonte, c. 1990",
      publicadaHaDias: 1,
      emocionaram: [],
      comentarios: [],
    },
    {
      id: "casamento", ano: 1957, quando: "1957", titulo: "O dia do casamento", lugar: "Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada",
      pessoas: ["antonio"],
      audio: { duracao: 72 },
      foto: "/img/maria/1957-casamento.jpg", alt: "Maria de noiva, com véu e buquê, ao lado de Antônio de terno", legenda: "Campinas, 1957",
      texto: "O dia em que eu e o meu amado esposo nos casamos.",
      publicadaHaDias: 2,
      emocionaram: ["juliana", "thiago", "lucas", "camila"],
      comentarios: [{ de: "beatriz", texto: "Vó, conta de novo como foi a festa!" }],
    },
    {
      id: "conselho-cafe", ano: 2015, quando: "2015", titulo: "Receba com café na mesa", tipo: "conselho",
      origem: { tipo: "maria" }, status: "confirmada",
      frase: "Receba cada pessoa com café na mesa e tempo no relógio.", guardadoPara: "os netos",
      publicadaHaDias: 3,
    },
    {
      id: "cozinha", ano: 2010, quando: "2010", titulo: "Uma tarde na cozinha", lugar: "Campinas, SP", tipo: "receita",
      origem: { tipo: "maria" }, status: "confirmada",
      pessoas: [],
      receita: "Bolo de fubá com erva-doce",
      foto: "/img/maria/2010-cozinha.jpg", alt: "Maria de avental vermelho segurando uma forma com bolo de fubá", legenda: "Campinas, 2010",
      publicadaHaDias: 5,
      emocionaram: [],
      comentarios: [],
    },
    {
      id: "retrato", ano: 1955, quando: "1955", titulo: "Um retrato de juventude", lugar: "Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada",
      pessoas: [],
      foto: "/img/maria/1955-juventude.jpg", alt: "Retrato de Maria jovem, de cabelo curto ondulado, olhando para o lado", legenda: "Campinas, 1955",
      publicadaHaDias: 8,
      emocionaram: [],
      comentarios: [],
    },
    {
      id: "com-meus-pais", ano: 1943, quando: "1943", titulo: "Com meus pais", lugar: "Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada",
      pessoas: ["Mãe", "Pai"],
      foto: "/img/maria/1943-infancia.jpg", alt: "Menina sorrindo, sentada entre a mãe e o pai na porta de casa", legenda: "Campinas, 1943",
      publicadaHaDias: 15,
      emocionaram: [],
      comentarios: [],
    },
  ],

  // Perguntas da "pergunta do dia": uma por vez, curtas, sem pressa.
  perguntas: [
    "Quem estava com você nesse dia?",
    "Que cheiro ou barulho vem à memória?",
    "O que você sentiu ao ver essa foto de novo?",
    "Onde essa foto foi tirada?",
    "Que história ninguém da família conhece sobre esse dia?",
  ],
};

// Fotos do moodboard que representam lugares e gostos (a pessoa escolhe tocando, sem precisar escrever).
export const CAPAS = [
  { id: "ladrilho", nome: "O chão de ladrilho", foto: "/img/ladrilho-estrela.jpg" },
  { id: "quintal", nome: "O quintal", foto: "/img/quintal.jpg" },
  { id: "janela", nome: "A janela de casa", foto: "/img/janela.jpg" },
  { id: "sala", nome: "A sala", foto: "/img/sala-turquesa.jpg" },
  { id: "cozinha", nome: "A cozinha", foto: "/img/cozinha.jpg" },
  { id: "varal", nome: "O varal de fotos", foto: "/img/varal.jpg" },
];

export const GOSTOS = [
  { id: "costura", nome: "Costura", icone: "costura" },
  { id: "cozinhar", nome: "Cozinhar", foto: "/img/cozinha.jpg" },
  { id: "plantas", nome: "Plantas e quintal", foto: "/img/quintal.jpg" },
  { id: "cafe", nome: "Café com os amigos", foto: "/img/cafe.jpg" },
  { id: "musica", nome: "Música e rádio", foto: "/img/sala-azul.jpg" },
  { id: "retratos", nome: "Fotos de família", foto: "/img/retratos.jpg" },
  { id: "janela", nome: "Prosa na janela", foto: "/img/janela-casal.jpg" },
  { id: "bichos", nome: "Bichos de estimação", foto: "/img/cachorro.jpg" },
  { id: "criancas", nome: "Crianças e netos", foto: "/img/bebe.jpg" },
  { id: "rua", nome: "Brincadeiras de rua", foto: "/img/amarelinha.jpg" },
  { id: "sinuca", nome: "Jogos e sinuca", foto: "/img/sinuca.jpg" },
];

/** Idade a partir da data de nascimento (AAAA-MM-DD). */
export function idade(nascimento, hoje = new Date()) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos -= 1;
  return anos >= 0 && anos < 130 ? anos : null;
}

/** "Casada com Antônio · 4 filhos · 2 netos", a partir da família cadastrada. */
export function resumoFamilia() {
  const f = CONTA.familia;
  const conjuge = f.find((p) => p.relacao === "marido" || p.relacao === "esposa");
  const filhos = f.filter((p) => p.relacao === "filho" || p.relacao === "filha").length;
  const netos = f.filter((p) => p.relacao === "neto" || p.relacao === "neta").length;
  return [conjuge && `Casada com ${conjuge.nome}`, filhos && `${filhos} filhos`, netos && `${netos} netos`].filter(Boolean).join(" · ");
}

/** Pessoa da família pelo id; a própria Maria aparece como "Você". */
export function pessoa(id) {
  if (id === CONTA.pessoa.id) return { id, nome: "Você", foto: CONTA.pessoa.foto };
  return CONTA.familia.find((p) => p.id === id) || { id, nome: id };
}

/** Números do legado, tirados das memórias (nunca metas). */
export function legado(memorias) {
  const decadas = new Set(memorias.map((m) => Math.floor(m.ano / 10)));
  const cidades = new Set(memorias.filter((m) => m.lugar).map((m) => m.lugar));
  return { lembrancas: memorias.length, decadas: decadas.size, cidades: cidades.size };
}
