-- 008 · Planos na conta: o catálogo ganha os textos da tela de planos, e a conta guarda o ciclo e desde quando
-- está no plano. Não apaga nada: as contas continuam no plano em que estão.
--
-- Os números de cada plano (preço, espaço, conversas, pessoas) continuam nas colunas da 000/007.
-- Aqui entram só os textos, para a tela, o cadastro e o perfil lerem tudo da mesma fonte (o banco).
--   recursos  = o que o plano libera HOJE no app (o servidor aplica os limites de espaço e de pessoas);
--   em_breve  = benefícios do relatório de planos que ainda não existem no app. A tela mostra com o selo
--               "em breve" e nada é cobrado nem bloqueado por eles.
-- Fora do escopo (pedido da mentoria) e por isso fora daqui: voz, vídeo, receita e música.

ALTER TABLE plano
  ADD COLUMN ordem TINYINT NOT NULL DEFAULT 0 COMMENT 'Ordem na tela de planos (do menor para o maior)',
  ADD COLUMN descricao VARCHAR(160) NULL COMMENT 'Uma frase: para quem é o plano',
  ADD COLUMN recursos JSON NULL COMMENT 'Lista (texto) do que o plano libera hoje',
  ADD COLUMN em_breve JSON NULL COMMENT 'Lista (texto) de benefícios anunciados que ainda não existem no app';

UPDATE plano SET ordem = 1,
  descricao = 'Para começar o acervo e conhecer o Memória Viva.',
  recursos = JSON_ARRAY('Árvore da memória, pergunta do dia, biblioteca e linha do tempo', 'O acervo é só seu'),
  em_breve = JSON_ARRAY('Exportar o acervo inteiro quando quiser')
WHERE nome = 'Grátis';

UPDATE plano SET ordem = 2,
  descricao = 'Para quem guarda as lembranças sozinho e precisa de mais espaço.',
  recursos = JSON_ARRAY('Tudo do Grátis', 'Dez vezes mais espaço para as fotos', 'O acervo é só seu'),
  em_breve = JSON_ARRAY('Livro do acervo em PDF', 'Espaço extra de 25 GB por R$ 7,90 por mês, sem trocar de plano')
WHERE nome = 'Individual';

UPDATE plano SET ordem = 3,
  descricao = 'Para a família toda ver o acervo e lembrar junto.',
  recursos = JSON_ARRAY('Árvore da memória, pergunta do dia, biblioteca e linha do tempo', 'Convide até 5 pessoas da família para ver o acervo e a árvore', 'Feed da família, com os comentários de todos', 'O espaço é compartilhado pelo acervo'),
  em_breve = JSON_ARRAY('Permissões por familiar', 'Livro do acervo em PDF', 'Espaço extra de 25 GB por R$ 7,90 por mês, sem trocar de plano')
WHERE nome = 'Família';

UPDATE plano SET ordem = 4,
  descricao = 'Para famílias grandes, com vários ramos.',
  recursos = JSON_ARRAY('Tudo do Família', 'Convide até 10 pessoas da família para ver o acervo e a árvore', 'O espaço é compartilhado pelo acervo'),
  em_breve = JSON_ARRAY('Permissões por ramo da família', 'Livro do acervo em PDF', 'Espaço extra de 25 GB por R$ 7,90 por mês, sem trocar de plano')
WHERE nome = 'Família Ampliada';

-- A conta: ciclo de cobrança escolhido (simulado: não há pagamento) e desde quando está no plano atual.
-- Grátis não tem ciclo (fica vazio). As contas que já existem: plano_desde = quando a conta foi criada.
ALTER TABLE usuario
  ADD COLUMN ciclo_plano ENUM('mensal','anual') NULL COMMENT 'Vazio = plano sem cobrança (Grátis)' AFTER id_plano,
  ADD COLUMN plano_desde DATETIME NULL COMMENT 'Quando o plano atual começou (UTC)' AFTER ciclo_plano;

UPDATE usuario u
  JOIN plano p ON p.id_plano = u.id_plano
   SET u.plano_desde = u.criado_em,
       u.ciclo_plano = IF(p.valor_mensal > 0, 'mensal', NULL);
