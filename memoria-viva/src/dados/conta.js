// Conta de demonstração da Maria. Dados fictícios.
// Tudo num objeto só, para as próximas etapas (conversa, guardar, linha da vida) reaproveitarem.

export const CONTA = {
  // Dados do perfil: a Maria pode editar (ficam salvos no navegador, ver efeitos.js).
  pessoa: {
    id: "maria",
    nome: "Maria", // como gosta de ser chamada (aparece na saudação)
    nomeCompleto: "Maria de Lourdes Ferreira",
    // Perfil de demonstração preenchido (fictício), para mostrar a plataforma cheia. Numa conta real, fica vazio até a pessoa contar.
    nascimento: "1938-05-14",
    cidadeNatal: "Campinas, SP",
    cidadeAtual: "Campinas, SP",
    profissao: "Costureira aposentada",
    genero: "f", // do briefing (esposa, mãe e avó): usado para escrever os parentescos na Família
    bio: "Costureira de mão cheia e contadora de causo de mão cheia também. Criei quatro filhos com a Singer ligada e o rádio tocando. Gosto de casa cheia, de café passado na hora e de uma boa prosa na janela.",
    foto: "/img/maria/hoje.jpg",
    capa: "ladrilho", // id de CAPAS (foto ilustrativa)
    interesses: ["costura", "cozinhar", "plantas", "cafe", "musica", "criancas", "janela"], // ids de GOSTOS
    outrosGostos: ["Novela das seis", "Palavras cruzadas", "Missa de domingo"],
    favoritos: { comida: "Bolo de fubá com erva-doce", musica: "Carinhoso, de Pixinguinha", lugar: "A janela da Rua Barão de Jaguara" },
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
  // texto: o relato de quem contou (na demonstração, fictício). extra: dados da receita (ingredientes, preparo...) ou da música
  // comentarios: [{ de: id, texto, lembro? }]: os da família, que já vêm na demonstração
  memorias: [
    {
      id: "reencontro", ano: 2022, quando: "2022", titulo: "O reencontro da família", lugar: "Fortaleza, CE", tipo: "foto",
      origem: { tipo: "familia", por: "juliana" }, status: "aguardando", etiquetas: ["reuniao", "viagem", "terceira-idade"],
      pessoas: ["antonio", "juliana", "carlos", "lucas", "camila", "beatriz", "thiago"],
      foto: "/img/maria/2022-reencontro.jpg", alt: "Maria no centro de um grupo sorridente de filhos e netos", legenda: "Fortaleza, 2022",
      texto: "Foi a primeira vez em doze anos que conseguimos juntar todo mundo. A mãe chorou quando o Lucas chegou de surpresa direto do aeroporto, ainda com a mala na mão.",
      publicadaHaDias: 0,
      emocionaram: ["carlos", "camila"],
      comentarios: [
        { de: "thiago", texto: "Repara que eu tô na ponta do pé pra parecer mais alto que o tio Lucas." },
        { de: "beatriz", texto: "A vó fez a gente tirar onze fotos até ninguém sair de olho fechado. Essa é a décima primeira." },
        { de: "lucas", texto: "Eu me lembro também.", lembro: true },
      ],
    },
    {
      id: "jardim", ano: 1990, quando: "Por volta de 1990", titulo: "Eu e Antônio no jardim", lugar: "Belo Horizonte, MG", tipo: "foto",
      origem: { tipo: "familia", por: "carlos" }, status: "aguardando", etiquetas: ["adulta", "viagem"],
      pessoas: ["antonio"],
      sugestaoIA: { campo: "data", texto: "Pelas roupas e pela cor da foto, parece ser do começo dos anos 1990." },
      foto: "/img/maria/1982-bodas.jpg", alt: "Maria e Antônio abraçados diante de uma buganvília florida", legenda: "Belo Horizonte, c. 1990",
      texto: "Achei essa no álbum verde da tia Neusa. Acho que foi na casa dela em BH, na viagem de férias que a gente fez de ônibus.",
      publicadaHaDias: 1,
      emocionaram: ["juliana"],
      comentarios: [
        { de: "camila", texto: "A buganvília da tia Neusa! Ela conversava com as plantas todo dia de manhã e jurava que era por isso que floresciam." },
        { de: "antonio", texto: "Essa camisa eu tenho até hoje. A Maria já tentou doar três vezes." },
      ],
    },
    {
      id: "casamento", ano: 1957, quando: "1957", titulo: "O dia do casamento", lugar: "Igreja do Carmo, Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["casamento", "juventude"],
      pessoas: ["antonio"],
      audio: { duracao: 72 },
      foto: "/img/maria/1957-casamento.jpg", alt: "Maria de noiva, com véu e buquê, ao lado de Antônio de terno", legenda: "Campinas, 1957",
      texto: "O dia em que eu e o meu amado esposo nos casamos. Choveu de manhã e minha mãe disse que era sorte. O Antônio chegou meia hora atrasado porque a caminhonete do padrinho atolou na estrada de terra, e entrou na igreja com a barra da calça cheia de barro.",
      publicadaHaDias: 2,
      emocionaram: ["juliana", "thiago", "lucas", "camila"],
      comentarios: [
        { de: "beatriz", texto: "Vó, conta de novo como foi a festa!" },
        { de: "juliana", texto: "E o vestido foi a própria mãe que costurou, com a renda que a vó Cida guardou por anos numa lata de biscoito." },
        { de: "antonio", texto: "O barro não era tanto assim. Era só um pouquinho." },
      ],
    },
    {
      id: "conselho-cafe", ano: 2015, quando: "2015", titulo: "Receba com café na mesa", tipo: "conselho",
      origem: { tipo: "maria" }, status: "confirmada",
      frase: "Receba cada pessoa com café na mesa e tempo no relógio.", guardadoPara: "os netos",
      publicadaHaDias: 3,
      comentarios: [{ de: "beatriz", texto: "Coloquei essa frase na porta da geladeira da república." }],
    },
    {
      id: "carinhoso", ano: 1962, quando: "Anos 1960", titulo: "Carinhoso", lugar: "Rua Barão de Jaguara, Campinas, SP", tipo: "musica",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["adulta", "filhos-pequenos"],
      pessoas: ["antonio"],
      foto: "/img/sala-azul.jpg", alt: "Sala de parede azul com quadros, mesinha de toalha de crochê e um televisor antigo", legenda: "A nossa sala",
      extra: {
        artista: "Pixinguinha",
        porque: "Tocava no rádio todo domingo depois do almoço, e o Antônio me tirava para dançar no meio da sala.",
        lembranca: "O cheiro de café, as crianças rindo no sofá e o rádio chiando quando passava caminhão na rua.",
      },
      texto: "Era só começar no rádio que o Antônio largava o jornal e me puxava para dançar entre o sofá e a mesinha.",
      publicadaHaDias: 4,
      emocionaram: ["camila", "juliana"],
      comentarios: [
        { de: "camila", texto: "E o pai pisava no pé da mãe toda vez." },
        { de: "antonio", texto: "Pisava de propósito, só pra ela rir." },
      ],
    },
    {
      id: "cozinha", ano: 2010, quando: "2010", titulo: "Uma tarde na cozinha", lugar: "Campinas, SP", tipo: "receita",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["terceira-idade"],
      pessoas: ["thiago", "beatriz"],
      receita: "Bolo de fubá com erva-doce",
      foto: "/img/maria/2010-cozinha.jpg", alt: "Maria de avental vermelho segurando uma forma com bolo de fubá", legenda: "Campinas, 2010",
      texto: "Aprendi com a minha mãe, no fogão a lenha. Hoje faço no forno elétrico, mas o cheiro de erva-doce na casa é o mesmo de quando eu tinha dez anos.",
      extra: {
        quem: "Maria, que aprendeu com a mãe, Dona Cida",
        ocasioes: "Café da tarde de domingo e todo aniversário da família",
        ingredientes: ["3 ovos", "2 xícaras de açúcar", "2 xícaras de fubá", "1 xícara de farinha de trigo", "1 xícara de leite", "½ xícara de óleo", "1 colher de sopa de erva-doce", "1 colher de sopa de fermento em pó"],
        preparo: "Bata os ovos com o açúcar até ficar clarinho.\n\nJunte o óleo e o leite e misture. Depois o fubá, a farinha e a erva-doce, aos poucos, sem parar de mexer.\n\nPor último o fermento, só misturando com a colher.\n\nForma untada com manteiga e fubá, forno quente por uns 40 minutos.",
        segredos: "Não abrir o forno antes dos 30 minutos. A vó Cida batia de colher de pau na mão de quem tentasse.",
      },
      publicadaHaDias: 5,
      emocionaram: ["thiago", "carlos"],
      comentarios: [
        { de: "thiago", texto: "Vó, o meu nunca cresce igual ao seu." },
        { de: "maria", texto: "É porque você abre o forno, Thiago!" },
        { de: "beatriz", texto: "Eu me lembro também.", lembro: true },
      ],
    },
    {
      id: "cafe-das-quatro", ano: 1988, quando: "Anos 1980", titulo: "O café das quatro", lugar: "Campinas, SP", tipo: "receita",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["adulta"],
      pessoas: [],
      receita: "Pão de minuto da Maria",
      foto: "/img/cafe.jpg", alt: "Mesa com toalha azul, cesta de pães caseiros e uma garrafa térmica antiga", legenda: "O café das quatro",
      texto: "Às quatro em ponto a garrafa térmica ia para a mesa. Quem passava na porta entrava, sem precisar de convite.",
      extra: {
        quem: "Maria",
        ocasioes: "Todo dia, às quatro da tarde",
        ingredientes: ["2 xícaras de farinha de trigo", "1 xícara de leite morno", "2 colheres de sopa de açúcar", "2 colheres de sopa de manteiga", "1 ovo", "1 colher de sopa de fermento em pó", "1 pitada de sal"],
        preparo: "Misture tudo com a mão, sem sovar muito, até a massa soltar dos dedos.\n\nFaça bolinhas do tamanho de um ovo e coloque na assadeira untada.\n\nPincele gema por cima e asse em forno médio por uns 20 minutos, até dourar.",
        segredos: "Servir quentinho, com a manteiga derretendo. Pão de minuto frio é pão de outro dia.",
      },
      publicadaHaDias: 6,
      emocionaram: ["lucas"],
      comentarios: [
        { de: "carlos", texto: "O carteiro sabia o horário e passava de propósito às quatro e cinco." },
        { de: "lucas", texto: "E a mãe sempre guardava dois pães embrulhados no pano para o seu Raimundo do gás." },
      ],
    },
    {
      id: "janela", ano: 1984, quando: "1984", titulo: "Na janela da Rua Barão", lugar: "Rua Barão de Jaguara, Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["adulta"],
      pessoas: ["antonio"],
      foto: "/img/janela-casal.jpg", alt: "Um casal debruçado numa janela de madeira verde, olhando a rua", legenda: "A janela de casa",
      texto: "Toda tarde a gente debruçava na janela para ver o movimento. O Antônio sabia a vida de todo mundo da rua, e quem não sabia ia perguntar para ele.",
      publicadaHaDias: 7,
      emocionaram: ["juliana", "lucas"],
      comentarios: [
        { de: "lucas", texto: "O pai chamava isso de “assistir televisão”." },
        { de: "camila", texto: "A vizinha da frente chamava os dois de “jornal da Barão”." },
      ],
    },
    {
      id: "retrato", ano: 1955, quando: "1955", titulo: "Um retrato de juventude", lugar: "Foto Kawano, Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["juventude"],
      pessoas: [],
      foto: "/img/maria/1955-juventude.jpg", alt: "Retrato de Maria jovem, de cabelo curto ondulado, olhando para o lado", legenda: "Campinas, 1955",
      texto: "Eu tinha dezessete anos. Fui ao estúdio do Seu Kawano com um vestido que eu mesma costurei; levei uma semana inteira só no colarinho.",
      publicadaHaDias: 8,
      emocionaram: ["beatriz"],
      comentarios: [
        { de: "camila", texto: "Mãe, a Beatriz é a sua cara nessa foto!" },
        { de: "beatriz", texto: "Agora entendi de onde vem a mania de ficar de ladinho nas fotos." },
      ],
    },
    {
      id: "pipoca", ano: 1996, quando: "1996", titulo: "O Pipoca na janela", lugar: "Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["adulta"],
      pessoas: [],
      foto: "/img/cachorro.jpg", alt: "Um cachorro caramelo sentado no parapeito de uma janela antiga", legenda: "O Pipoca",
      texto: "O Pipoca apareceu na nossa porta num dia de chuva e nunca mais foi embora. Ficava na janela esperando o Antônio voltar do trabalho e latia antes mesmo de o ônibus virar a esquina.",
      publicadaHaDias: 9,
      emocionaram: ["thiago", "beatriz", "antonio"],
      comentarios: [
        { de: "beatriz", texto: "O Pipoca roubava pão de minuto da mesa e escondia debaixo do sofá!" },
        { de: "thiago", texto: "Eu me lembro também.", lembro: true },
      ],
    },
    {
      id: "amarelinha", ano: 1972, quando: "1972", titulo: "Amarelinha na rua de casa", lugar: "Rua Barão de Jaguara, Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["filhos-pequenos"],
      pessoas: ["juliana", "carlos"],
      foto: "/img/amarelinha.jpg", alt: "Crianças brincando de amarelinha riscada no asfalto de uma rua arborizada", legenda: "A rua de casa",
      texto: "Os meninos brincavam na rua até escurecer. Eu gritava da janela na hora da janta e ninguém ouvia, até eu falar que tinha bolo.",
      publicadaHaDias: 11,
      emocionaram: ["juliana", "carlos"],
      comentarios: [
        { de: "juliana", texto: "A camiseta listrada era minha. A Camila vivia pegando escondido." },
        { de: "carlos", texto: "E era eu que riscava a amarelinha com caco de telha, porque giz era coisa de rico." },
      ],
    },
    {
      id: "sinuca", ano: 1983, quando: "Anos 1980", titulo: "A sinuca do bar do Seu Zé", lugar: "Bar do Seu Zé, Campinas, SP", tipo: "foto",
      origem: { tipo: "familia", por: "lucas" }, status: "confirmada", etiquetas: ["adulta"],
      pessoas: ["antonio"],
      foto: "/img/sinuca.jpg", alt: "Mesa de sinuca de pano verde num salão com ventilador de parede", legenda: "Bar do Seu Zé",
      texto: "O pai jogava toda sexta no bar do Seu Zé. Ele jura que nunca perdeu uma partida; o Seu Zé tem outra versão.",
      publicadaHaDias: 13,
      emocionaram: ["carlos"],
      comentarios: [
        { de: "antonio", texto: "Perdi uma vez. Em 1983. Não conta, porque o taco estava torto." },
        { de: "maria", texto: "Ele voltava pra casa dizendo que tinha ido comprar pão. Às onze da noite." },
      ],
    },
    {
      id: "escola", ano: 1975, quando: "1975", titulo: "A escola dos meninos", lugar: "Grupo Escolar Carlos Gomes, Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["escola", "filhos-pequenos", "trabalho"],
      pessoas: ["juliana", "carlos"],
      foto: "/img/escola.jpg", alt: "Sala de aula antiga com carteiras de madeira e azulejos verdes", legenda: "Grupo Escolar Carlos Gomes",
      texto: "Eu costurava os uniformes de metade da sala. As mães pagavam em dinheiro, em ovo, em linha e, às vezes, em fiado.",
      publicadaHaDias: 16,
      emocionaram: ["juliana"],
      comentarios: [
        { de: "juliana", texto: "A diretora, Dona Odete, dizia que eu falava mais que o rádio." },
        { de: "carlos", texto: "E o meu uniforme era sempre dois números maior, “pra durar”." },
      ],
    },
    {
      id: "netos", ano: 2009, quando: "2009", titulo: "Os primeiros retratos dos netos", lugar: "Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["terceira-idade"],
      pessoas: ["beatriz", "thiago"],
      foto: "/img/bebe.jpg", alt: "Dois porta-retratos de bebês sobre a cristaleira, ao lado de um vaso de cristal azul", legenda: "Na cristaleira",
      texto: "Os dois nasceram com três meses de diferença. Coloquei os retratos lado a lado na cristaleira e até hoje ninguém tira dali.",
      publicadaHaDias: 21,
      emocionaram: ["juliana", "carlos"],
      comentarios: [
        { de: "thiago", texto: "Eu sou o mais bonito, claro." },
        { de: "beatriz", texto: "Discordo totalmente." },
      ],
    },
    {
      id: "com-meus-pais", ano: 1943, quando: "1943", titulo: "Com meus pais", lugar: "Campinas, SP", tipo: "foto",
      origem: { tipo: "maria" }, status: "confirmada", etiquetas: ["infancia", "meus-pais"],
      pessoas: ["Dona Cida", "Seu Zeca"],
      foto: "/img/maria/1943-infancia.jpg", alt: "Menina sorrindo, sentada entre a mãe e o pai na porta de casa", legenda: "Campinas, 1943",
      texto: "Eu tinha cinco anos. Meu pai era ferroviário da Mogiana e só tirava o chapéu para fotografia e para missa. O laço no meu cabelo minha mãe fez com retalho de uma toalha de mesa.",
      publicadaHaDias: 25,
      emocionaram: ["carlos", "camila"],
      comentarios: [
        { de: "carlos", texto: "O vô Zeca usou esse mesmo bigode até os noventa anos." },
      ],
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
