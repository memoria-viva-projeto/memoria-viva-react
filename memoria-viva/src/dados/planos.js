// Cópia de reserva do catálogo de planos, só para a DEMONSTRAÇÃO funcionar sem servidor (ex.: site publicado sem a API).
// A fonte de verdade é o banco (tabela plano, migrações 007 e 008): com servidor, a tela usa GET /api/planos.
// O teste server/testes/planos.test.js confere que esta cópia é IGUAL ao que a API devolve: mudou o banco,
// atualize aqui (o teste avisa).
export const PLANOS_RESERVA = [
  {
    "id": 1,
    "nome": "Grátis",
    "valorMensal": 0,
    "valorAnual": null,
    "gratis": true,
    "espacoGb": 1,
    "conversasMes": 10,
    "limitePessoas": 1,
    "convidaFamilia": false,
    "feedFamilia": false,
    "descricao": "Para começar o acervo e conhecer o Memória Viva.",
    "recursos": [
      "Árvore da memória, pergunta do dia, biblioteca e linha do tempo",
      "O acervo é só seu"
    ],
    "emBreve": [
      "Exportar o acervo inteiro quando quiser"
    ]
  },
  {
    "id": 2,
    "nome": "Individual",
    "valorMensal": 24.9,
    "valorAnual": 249,
    "gratis": false,
    "espacoGb": 10,
    "conversasMes": 60,
    "limitePessoas": 1,
    "convidaFamilia": false,
    "feedFamilia": false,
    "descricao": "Para quem guarda as lembranças sozinho e precisa de mais espaço.",
    "recursos": [
      "Tudo do Grátis",
      "Dez vezes mais espaço para as fotos",
      "O acervo é só seu"
    ],
    "emBreve": [
      "Livro do acervo em PDF",
      "Espaço extra de 25 GB por R$ 7,90 por mês, sem trocar de plano"
    ]
  },
  {
    "id": 5,
    "nome": "Família",
    "valorMensal": 49.9,
    "valorAnual": 499,
    "gratis": false,
    "espacoGb": 50,
    "conversasMes": 150,
    "limitePessoas": 5,
    "convidaFamilia": true,
    "feedFamilia": true,
    "descricao": "Para a família toda ver o acervo e lembrar junto.",
    "recursos": [
      "Árvore da memória, pergunta do dia, biblioteca e linha do tempo",
      "Convide até 5 pessoas da família para ver o acervo e a árvore",
      "Feed da família, com os comentários de todos",
      "O espaço é compartilhado pelo acervo"
    ],
    "emBreve": [
      "Permissões por familiar",
      "Livro do acervo em PDF",
      "Espaço extra de 25 GB por R$ 7,90 por mês, sem trocar de plano"
    ]
  },
  {
    "id": 6,
    "nome": "Família Ampliada",
    "valorMensal": 79.9,
    "valorAnual": 799,
    "gratis": false,
    "espacoGb": 120,
    "conversasMes": 300,
    "limitePessoas": 10,
    "convidaFamilia": true,
    "feedFamilia": true,
    "descricao": "Para famílias grandes, com vários ramos.",
    "recursos": [
      "Tudo do Família",
      "Convide até 10 pessoas da família para ver o acervo e a árvore",
      "O espaço é compartilhado pelo acervo"
    ],
    "emBreve": [
      "Permissões por ramo da família",
      "Livro do acervo em PDF",
      "Espaço extra de 25 GB por R$ 7,90 por mês, sem trocar de plano"
    ]
  }
]
;
