-- 004 · Arquivos (fotos, vídeos, áudios) guardados no servidor e ligados às memórias.
-- Por quê: até aqui as fotos ficavam só no navegador. Agora o conteúdo vai para um armazenamento do servidor
-- (por enquanto uma pasta no disco, fora da pasta pública) e o banco guarda só os dados do arquivo.
--   - arquivo.chave: o nome interno no armazenamento (aleatório). Nunca é um endereço público nem temporário:
--     o arquivo só sai por /api/arquivos/:id, que confere quem pode ver.
--   - arquivo.id_familia: o acervo dono do arquivo (para conferir quem pode usar e somar o espaço do plano).
--   - item_memoria.anexo: foto ou áudio que vai "junto" (não é a foto principal).
--   - item_etiqueta: etiquetas de tempo de cada foto ("Natal", "Infância").
--   - memoria.versao: sobe a cada edição; quem edita manda a versão que abriu e, se outra edição chegou antes,
--     o servidor recusa em vez de apagar a mudança da outra pessoa sem avisar.
-- A tabela arquivo nunca foi usada antes, mas a migração não apaga nada: só acrescenta e afrouxa url para opcional.

ALTER TABLE arquivo
  MODIFY COLUMN url VARCHAR(500) NULL COMMENT 'Endereço externo, se houver. Os arquivos do servidor saem por /api/arquivos/:id',
  ADD COLUMN id_familia INT NULL COMMENT 'Acervo dono do arquivo' AFTER id_arquivo,
  ADD COLUMN chave VARCHAR(64) NULL COMMENT 'Nome interno no armazenamento (aleatório)' AFTER tipo,
  ADD COLUMN chave_miniatura VARCHAR(64) NULL COMMENT 'Nome interno da miniatura (JPEG)' AFTER chave,
  ADD COLUMN mime VARCHAR(100) NULL COMMENT 'Tipo conferido pelo conteúdo (image/jpeg, video/mp4...)' AFTER chave_miniatura,
  ADD COLUMN tamanho_bytes BIGINT NULL AFTER mime,
  ADD COLUMN tamanho_miniatura INT NULL AFTER tamanho_bytes,
  ADD UNIQUE KEY uq_arquivo_chave (chave),
  ADD UNIQUE KEY uq_arquivo_chave_mini (chave_miniatura),
  ADD KEY ix_arquivo_familia (id_familia),
  ADD KEY ix_arquivo_criado (criado_em),
  ADD CONSTRAINT fk_arquivo_familia FOREIGN KEY (id_familia) REFERENCES familia(id_familia);

ALTER TABLE item_memoria
  ADD COLUMN anexo BOOLEAN NOT NULL DEFAULT false COMMENT 'Vai junto (não é a foto/vídeo principal)' AFTER tipo,
  ADD KEY ix_item_arquivo (id_arquivo);

CREATE TABLE item_etiqueta (
  id_item INT NOT NULL,
  etiqueta VARCHAR(40) NOT NULL,
  PRIMARY KEY (id_item, etiqueta),
  FOREIGN KEY (id_item) REFERENCES item_memoria(id_item)
) COMMENT = 'Etiquetas de tempo de uma foto: Infância, Natal...';

ALTER TABLE memoria
  ADD COLUMN versao INT NOT NULL DEFAULT 1 COMMENT 'Sobe a cada edição (evita apagar a mudança de outra pessoa)' AFTER atualizada_em,
  ADD KEY ix_memoria_capa (id_capa);
