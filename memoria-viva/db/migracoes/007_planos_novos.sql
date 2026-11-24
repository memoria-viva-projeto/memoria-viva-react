-- 007 · Planos novos (antes o PR #3 tinha editado a 000_base direto, o que travava bancos já criados).
-- De → para:
--   Gratuito     → Grátis            R$ 0,00                     1 GB    10 créditos   1 pessoa
--   Silver       → Individual        R$ 24,90 · R$ 249,00/ano    10 GB   60 créditos   1 pessoa
--   Família      → Família           R$ 49,90 · R$ 499,00/ano    50 GB   150 créditos  5 pessoas
--   Família Plus → Família Ampliada  R$ 79,90 · R$ 799,00/ano    120 GB  300 créditos  10 pessoas
--   Gold e Diamond saem: quem estava neles passa para o Individual (o único plano só para uma pessoa pago).
-- Nenhuma conta é apagada. Os ids dos planos que ficam não mudam.

UPDATE plano SET nome = 'Grátis', valor_mensal = 0.00, valor_anual = NULL,
  armazenamento_gb = 1.00, creditos_ia_mes = 10, limite_membros = 1
WHERE nome = 'Gratuito';

UPDATE plano SET nome = 'Individual', valor_mensal = 24.90, valor_anual = 249.00,
  armazenamento_gb = 10.00, creditos_ia_mes = 60, limite_membros = 1
WHERE nome = 'Silver';

UPDATE plano SET valor_mensal = 49.90, valor_anual = 499.00,
  armazenamento_gb = 50.00, creditos_ia_mes = 150, limite_membros = 5
WHERE nome = 'Família';

UPDATE plano SET nome = 'Família Ampliada', valor_mensal = 79.90, valor_anual = 799.00,
  armazenamento_gb = 120.00, creditos_ia_mes = 300, limite_membros = 10
WHERE nome = 'Família Plus';

-- Gold e Diamond: primeiro as contas mudam de plano, depois os planos saem
UPDATE usuario
SET id_plano = (SELECT id_plano FROM (SELECT id_plano FROM plano WHERE nome = 'Individual') AS p)
WHERE id_plano IN (SELECT id_plano FROM (SELECT id_plano FROM plano WHERE nome IN ('Gold', 'Diamond')) AS q);

DELETE FROM plano WHERE nome IN ('Gold', 'Diamond');
