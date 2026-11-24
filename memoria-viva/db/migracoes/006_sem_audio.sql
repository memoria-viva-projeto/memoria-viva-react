-- 006 · Sem áudio (pedido da mentoria, continuação da 005).
-- Por quê: o projeto guarda só fotos e álbuns. O áudio que ia junto da memória sai também.
--   - Os itens de áudio são APAGADOS das memórias (com as marcações, etiquetas e sugestões da IA que eram deles).
--   - Os arquivos de áudio saem do banco (o armazenamento é limpo pela faxina de arquivos sem dono, em até 24 h).
--   - arquivo.tipo e item_memoria.tipo passam a aceitar só 'foto'; a coluna arquivo.duracao_seg sai.
-- ATENÇÃO: esta migração apaga dados (os áudios guardados). Faça backup antes (mysqldump).

-- o que aponta para os itens de áudio (ordem das chaves estrangeiras)
DELETE s FROM sugestao_ia s JOIN item_memoria it ON it.id_item = s.id_item WHERE it.tipo = 'audio';
DELETE mc FROM marcacao mc JOIN item_memoria it ON it.id_item = mc.id_item WHERE it.tipo = 'audio';
DELETE ie FROM item_etiqueta ie JOIN item_memoria it ON it.id_item = ie.id_item WHERE it.tipo = 'audio';
DELETE FROM item_memoria WHERE tipo = 'audio';

-- arquivos de áudio: ninguém mais aponta para eles
UPDATE memoria SET id_capa = NULL WHERE id_capa IN (SELECT id_arquivo FROM arquivo WHERE tipo = 'audio');
UPDATE pessoa SET id_foto = NULL WHERE id_foto IN (SELECT id_arquivo FROM arquivo WHERE tipo = 'audio');
DELETE FROM arquivo WHERE tipo = 'audio';

ALTER TABLE item_memoria
  MODIFY COLUMN tipo ENUM('foto') NOT NULL,
  MODIFY COLUMN anexo BOOLEAN NOT NULL DEFAULT false COMMENT 'Vai junto (não é a foto principal)';
ALTER TABLE item_memoria COMMENT = 'Foto dentro de uma memória';
ALTER TABLE arquivo
  MODIFY COLUMN tipo ENUM('foto') NOT NULL,
  MODIFY COLUMN mime VARCHAR(100) NULL COMMENT 'Tipo conferido pelo conteúdo (image/jpeg, image/png...)',
  DROP COLUMN duracao_seg;
ALTER TABLE arquivo COMMENT = 'Foto enviada: só os dados. O conteúdo fica no armazenamento em subpasta/nome';
UPDATE configuracao SET descricao = 'Onde ficam as fotos: local (pasta ARQUIVOS_PASTA do servidor) ou s3' WHERE chave = 'armazenamento';
