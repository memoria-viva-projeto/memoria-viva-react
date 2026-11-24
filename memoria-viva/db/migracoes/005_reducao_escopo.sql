-- 005 · Redução de escopo (pedido da mentoria).
-- Por quê: o projeto foca no principal, que são fotos e álbuns com a história da família.
--   1. A tabela data_flexivel sai. A data "do jeito que a pessoa lembra" (dia, mês, ano, década, período, "por volta de")
--      passa a ficar em colunas na própria tabela: memoria e item_memoria (data_*) e pessoa (nasc_* e fal_*).
--      As datas que já existiam são copiadas antes de a tabela sair.
--   2. Música, receita, vídeo e conselho saem. As memórias desses tipos são APAGADAS, com tudo o que era delas.
--      Os itens de vídeo e os links do YouTube saem também; os arquivos de vídeo saem do banco (o disco é limpo pela
--      faxina de arquivos sem dono, em até 24 h).
--   3. Arquivos: a tabela arquivo guarda só a subpasta e o nome do arquivo no armazenamento (nunca uma URL).
--      Onde fica o armazenamento (pasta local ou S3: bucket, região, endereço) vem da nova tabela configuracao.
--      As chaves de acesso da nuvem NÃO ficam no banco: ficam nas variáveis de ambiente do servidor.
-- ATENÇÃO: esta migração apaga dados (memórias dos tipos removidos) e tabelas. Faça backup antes (mysqldump).

-- ---------- 1. Datas nas próprias tabelas ----------

ALTER TABLE memoria
  ADD COLUMN data_modo ENUM('dia','mes','ano','decada','periodo','naosei') NULL COMMENT 'Como a pessoa lembra a data' AFTER descricao,
  ADD COLUMN data_dia TINYINT NULL AFTER data_modo,
  ADD COLUMN data_mes TINYINT NULL AFTER data_dia,
  ADD COLUMN data_ano SMALLINT NULL COMMENT 'Na década guarda o primeiro ano (1970)' AFTER data_mes,
  ADD COLUMN data_ano_fim SMALLINT NULL COMMENT 'Só no modo período' AFTER data_ano,
  ADD COLUMN data_aprox BOOLEAN NOT NULL DEFAULT false COMMENT 'Por volta de' AFTER data_ano_fim;

ALTER TABLE item_memoria
  ADD COLUMN data_modo ENUM('dia','mes','ano','decada','periodo','naosei') NULL COMMENT 'Vazio = vale a da memória' AFTER legenda,
  ADD COLUMN data_dia TINYINT NULL AFTER data_modo,
  ADD COLUMN data_mes TINYINT NULL AFTER data_dia,
  ADD COLUMN data_ano SMALLINT NULL COMMENT 'Na década guarda o primeiro ano (1970)' AFTER data_mes,
  ADD COLUMN data_ano_fim SMALLINT NULL COMMENT 'Só no modo período' AFTER data_ano,
  ADD COLUMN data_aprox BOOLEAN NOT NULL DEFAULT false COMMENT 'Por volta de' AFTER data_ano_fim;

ALTER TABLE pessoa
  ADD COLUMN nasc_modo ENUM('dia','mes','ano','decada','periodo','naosei') NULL COMMENT 'Nascimento' AFTER genero,
  ADD COLUMN nasc_dia TINYINT NULL AFTER nasc_modo,
  ADD COLUMN nasc_mes TINYINT NULL AFTER nasc_dia,
  ADD COLUMN nasc_ano SMALLINT NULL AFTER nasc_mes,
  ADD COLUMN nasc_ano_fim SMALLINT NULL AFTER nasc_ano,
  ADD COLUMN nasc_aprox BOOLEAN NOT NULL DEFAULT false AFTER nasc_ano_fim,
  ADD COLUMN fal_modo ENUM('dia','mes','ano','decada','periodo','naosei') NULL COMMENT 'Falecimento' AFTER nasc_aprox,
  ADD COLUMN fal_dia TINYINT NULL AFTER fal_modo,
  ADD COLUMN fal_mes TINYINT NULL AFTER fal_dia,
  ADD COLUMN fal_ano SMALLINT NULL AFTER fal_mes,
  ADD COLUMN fal_ano_fim SMALLINT NULL AFTER fal_ano,
  ADD COLUMN fal_aprox BOOLEAN NOT NULL DEFAULT false AFTER fal_ano_fim;

UPDATE memoria m JOIN data_flexivel d ON d.id_data = m.id_data
   SET m.data_modo = d.modo, m.data_dia = d.dia, m.data_mes = d.mes, m.data_ano = d.ano, m.data_ano_fim = d.ano_fim, m.data_aprox = d.aprox;
UPDATE item_memoria it JOIN data_flexivel d ON d.id_data = it.id_data
   SET it.data_modo = d.modo, it.data_dia = d.dia, it.data_mes = d.mes, it.data_ano = d.ano, it.data_ano_fim = d.ano_fim, it.data_aprox = d.aprox;
UPDATE pessoa p JOIN data_flexivel d ON d.id_data = p.id_nascimento
   SET p.nasc_modo = d.modo, p.nasc_dia = d.dia, p.nasc_mes = d.mes, p.nasc_ano = d.ano, p.nasc_ano_fim = d.ano_fim, p.nasc_aprox = d.aprox;
UPDATE pessoa p JOIN data_flexivel d ON d.id_data = p.id_falecimento
   SET p.fal_modo = d.modo, p.fal_dia = d.dia, p.fal_mes = d.mes, p.fal_ano = d.ano, p.fal_ano_fim = d.ano_fim, p.fal_aprox = d.aprox;

-- As chaves estrangeiras para data_flexivel foram criadas sem nome no 000_base: o nome vem do information_schema.
SET @fk = (SELECT constraint_name FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE() AND table_name = 'memoria' AND column_name = 'id_data' AND referenced_table_name = 'data_flexivel');
SET @sql = CONCAT('ALTER TABLE memoria DROP FOREIGN KEY `', @fk, '`');
PREPARE passo FROM @sql; EXECUTE passo; DEALLOCATE PREPARE passo;

SET @fk = (SELECT constraint_name FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE() AND table_name = 'item_memoria' AND column_name = 'id_data' AND referenced_table_name = 'data_flexivel');
SET @sql = CONCAT('ALTER TABLE item_memoria DROP FOREIGN KEY `', @fk, '`');
PREPARE passo FROM @sql; EXECUTE passo; DEALLOCATE PREPARE passo;

SET @fk = (SELECT constraint_name FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE() AND table_name = 'pessoa' AND column_name = 'id_nascimento' AND referenced_table_name = 'data_flexivel');
SET @sql = CONCAT('ALTER TABLE pessoa DROP FOREIGN KEY `', @fk, '`');
PREPARE passo FROM @sql; EXECUTE passo; DEALLOCATE PREPARE passo;

SET @fk = (SELECT constraint_name FROM information_schema.key_column_usage
            WHERE table_schema = DATABASE() AND table_name = 'pessoa' AND column_name = 'id_falecimento' AND referenced_table_name = 'data_flexivel');
SET @sql = CONCAT('ALTER TABLE pessoa DROP FOREIGN KEY `', @fk, '`');
PREPARE passo FROM @sql; EXECUTE passo; DEALLOCATE PREPARE passo;

ALTER TABLE memoria DROP COLUMN id_data;
ALTER TABLE item_memoria DROP COLUMN id_data;
ALTER TABLE pessoa DROP COLUMN id_nascimento, DROP COLUMN id_falecimento;
DROP TABLE data_flexivel;

-- ---------- 2. Só foto e álbum ----------

-- o que aponta para as memórias que saem e para os itens de vídeo / YouTube (ordem das chaves estrangeiras)
DELETE s FROM sugestao_ia s JOIN memoria m ON m.id_memoria = s.id_memoria
 WHERE m.tipo IN ('musica','receita','video','conselho');
DELETE s FROM sugestao_ia s JOIN item_memoria it ON it.id_item = s.id_item WHERE it.tipo IN ('video','youtube');
DELETE mc FROM marcacao mc JOIN item_memoria it ON it.id_item = mc.id_item JOIN memoria m ON m.id_memoria = it.id_memoria
 WHERE m.tipo IN ('musica','receita','video','conselho') OR it.tipo IN ('video','youtube');
DELETE ie FROM item_etiqueta ie JOIN item_memoria it ON it.id_item = ie.id_item JOIN memoria m ON m.id_memoria = it.id_memoria
 WHERE m.tipo IN ('musica','receita','video','conselho') OR it.tipo IN ('video','youtube');
DELETE it FROM item_memoria it JOIN memoria m ON m.id_memoria = it.id_memoria
 WHERE m.tipo IN ('musica','receita','video','conselho') OR it.tipo IN ('video','youtube');
DELETE x FROM memoria_pessoa x JOIN memoria m ON m.id_memoria = x.id_memoria WHERE m.tipo IN ('musica','receita','video','conselho');
DELETE x FROM memoria_etiqueta x JOIN memoria m ON m.id_memoria = x.id_memoria WHERE m.tipo IN ('musica','receita','video','conselho');
DELETE x FROM comentario x JOIN memoria m ON m.id_memoria = x.id_memoria WHERE m.tipo IN ('musica','receita','video','conselho');
DELETE x FROM reacao x JOIN memoria m ON m.id_memoria = x.id_memoria WHERE m.tipo IN ('musica','receita','video','conselho');
DELETE x FROM compartilhamento x JOIN memoria m ON m.id_memoria = x.id_memoria WHERE m.tipo IN ('musica','receita','video','conselho');

DROP TABLE ingrediente;
DROP TABLE receita;
DROP TABLE musica;
DROP TABLE video;
DROP TABLE conselho;

DELETE FROM memoria WHERE tipo IN ('musica','receita','video','conselho');

-- arquivos de vídeo: ninguém mais aponta para eles
UPDATE memoria SET id_capa = NULL WHERE id_capa IN (SELECT id_arquivo FROM arquivo WHERE tipo = 'video');
UPDATE pessoa SET id_foto = NULL WHERE id_foto IN (SELECT id_arquivo FROM arquivo WHERE tipo = 'video');
DELETE FROM arquivo WHERE tipo = 'video';

ALTER TABLE memoria MODIFY COLUMN tipo ENUM('foto','album') NOT NULL;
ALTER TABLE item_memoria
  MODIFY COLUMN tipo ENUM('foto','audio') NOT NULL,
  DROP COLUMN youtube_id,
  DROP COLUMN youtube_titulo,
  DROP COLUMN youtube_canal;
ALTER TABLE item_memoria COMMENT = 'Foto ou áudio dentro de uma memória';
ALTER TABLE arquivo MODIFY COLUMN tipo ENUM('foto','audio') NOT NULL;

-- ---------- 3. Arquivos: subpasta + nome; onde fica o armazenamento vem da configuração ----------

CREATE TABLE configuracao (
  chave VARCHAR(60) NOT NULL,
  valor VARCHAR(500) NULL,
  descricao VARCHAR(255) NULL,
  PRIMARY KEY (chave)
) COMMENT = 'Configurações do sistema que podem mudar sem trocar o código (nunca senhas ou chaves de acesso)';

INSERT INTO configuracao (chave, valor, descricao) VALUES
('armazenamento', 'local', 'Onde ficam fotos e áudios: local (pasta ARQUIVOS_PASTA do servidor) ou s3'),
('s3_bucket', NULL, 'Nome do bucket (só com armazenamento = s3)'),
('s3_regiao', NULL, 'Região do bucket, ex.: sa-east-1'),
('s3_endereco', NULL, 'Endereço do serviço. Vazio = AWS. Preencha para R2, Backblaze ou MinIO');

ALTER TABLE arquivo
  ADD COLUMN subpasta VARCHAR(100) NULL COMMENT 'Pasta dentro do armazenamento, ex.: familias/7' AFTER tipo,
  ADD COLUMN nome_arquivo VARCHAR(64) NULL COMMENT 'Nome aleatório do arquivo dentro da subpasta' AFTER subpasta,
  ADD COLUMN nome_miniatura VARCHAR(64) NULL COMMENT 'Nome da miniatura (JPEG), na mesma subpasta' AFTER nome_arquivo;

-- arquivos já enviados: estavam em <2 primeiras letras do nome>/<nome>
UPDATE arquivo SET subpasta = LEFT(chave, 2), nome_arquivo = chave WHERE chave IS NOT NULL;
-- a miniatura antiga só continua se estiver na mesma subpasta; as outras saem (a foto inteira aparece no lugar)
UPDATE arquivo SET nome_miniatura = chave_miniatura WHERE chave_miniatura IS NOT NULL AND LEFT(chave_miniatura, 2) = LEFT(chave, 2);
UPDATE arquivo SET tamanho_miniatura = NULL WHERE nome_miniatura IS NULL;

ALTER TABLE arquivo
  DROP INDEX uq_arquivo_chave,
  DROP INDEX uq_arquivo_chave_mini,
  DROP COLUMN chave,
  DROP COLUMN chave_miniatura,
  DROP COLUMN url,
  DROP COLUMN url_miniatura,
  ADD UNIQUE KEY uq_arquivo_nome (nome_arquivo),
  ADD UNIQUE KEY uq_arquivo_nome_mini (nome_miniatura);
ALTER TABLE arquivo COMMENT = 'Foto ou áudio enviado: só os dados. O conteúdo fica no armazenamento em subpasta/nome';
