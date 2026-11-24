-- 002 · Código de convite da família.
-- Por quê: a dona compartilha UM código (ex.: MV-7K3P-Q9XD) e quem tiver o código entra na família,
-- dentro do limite de membros do plano dela. Trocar o código invalida o antigo na hora;
-- deixar vazio desliga os convites.
-- A tabela convite (convite por pessoa, com e-mail) continua como está, sem uso por enquanto.
-- Só acrescenta colunas: não altera nem apaga nada do que já existe.

ALTER TABLE familia
  ADD COLUMN codigo_convite VARCHAR(16) NULL COMMENT 'Vazio = convites desligados' AFTER nome,
  ADD COLUMN codigo_criado_em DATETIME NULL COMMENT 'UTC; quando o código atual foi gerado' AFTER codigo_convite,
  ADD UNIQUE KEY uq_familia_codigo (codigo_convite);
