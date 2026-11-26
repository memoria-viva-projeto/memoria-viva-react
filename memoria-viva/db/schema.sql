-- Memória Viva · esquema do banco (MySQL 8), versão 5
-- REFERÊNCIA do estado atual do banco = db/migracoes/000_base.sql até 006_sem_audio.sql.
-- Para criar ou atualizar um banco, NÃO rode este arquivo: use  npm run db:migrar
-- (ele cria o banco se faltar, aplica só o que falta e anota tudo em migracao_aplicada).
-- Mudanças desde a versão 3 (migração 005, pedido da mentoria):
--   - só foto e álbum: saíram as tabelas receita, ingrediente, musica, video e conselho, e os links do YouTube;
--   - saiu a tabela data_flexivel: a data fica em colunas na própria tabela (memoria/item_memoria: data_*; pessoa: nasc_* e fal_*);
--   - arquivo guarda só subpasta + nome_arquivo (sem URL); onde fica o armazenamento (local ou S3) vem da tabela configuracao.
-- Mudança da versão 5 (migração 006): sem áudio. arquivo e item_memoria guardam só foto (saiu arquivo.duracao_seg).
-- Gerado a partir de um banco migrado (SHOW CREATE TABLE): as chaves estrangeiras do 000_base têm nome automático (*_ibfk_*).
CREATE DATABASE IF NOT EXISTS memoria_viva CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE memoria_viva;
SET NAMES utf8mb4;

CREATE TABLE `plano` (
  `id_plano` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(30) NOT NULL,
  `valor_mensal` decimal(10,2) NOT NULL,
  `valor_anual` decimal(10,2) DEFAULT NULL,
  `armazenamento_gb` decimal(10,2) NOT NULL,
  `creditos_ia_mes` int NOT NULL,
  `limite_membros` int DEFAULT NULL,
  `ordem` tinyint NOT NULL DEFAULT '0' COMMENT 'Ordem na tela de planos (do menor para o maior)',
  `descricao` varchar(160) DEFAULT NULL COMMENT 'Uma frase: para quem é o plano',
  `recursos` json DEFAULT NULL COMMENT 'Lista (texto) do que o plano libera hoje',
  `em_breve` json DEFAULT NULL COMMENT 'Lista (texto) de benefícios anunciados que ainda não existem no app',
  PRIMARY KEY (`id_plano`)
) COMMENT='Planos disponíveis para as contas';
INSERT INTO plano (
    nome,
    valor_mensal,
    valor_anual,
    armazenamento_gb,
    creditos_ia_mes,
    limite_membros
) VALUES
(
    'Grátis',
    0.00,
    NULL,
    1.00,
    10,
    1
),
(
    'Individual',
    24.90,
    249.00,
    10.00,
    60,
    1
),
(
    'Família',
    49.90,
    499.00,
    50.00,
    150,
    5
),
(
    'Família Ampliada',
    79.90,
    799.00,
    120.00,
    300,
    10
);
-- ordem, descricao, recursos e em_breve de cada plano: ver db/migracoes/008_planos_na_conta.sql


CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(120) NOT NULL,
  `email` varchar(180) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `id_plano` int NOT NULL,
  `ciclo_plano` enum('mensal','anual') DEFAULT NULL COMMENT 'Vazio = plano sem cobrança (Grátis)',
  `plano_desde` datetime DEFAULT NULL COMMENT 'Quando o plano atual começou (UTC)',
  `status` enum('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
  `apagar_em` datetime DEFAULT NULL COMMENT 'UTC; vazio = sem pedido. Nesta data a conta é apagada de vez',
  `tamanho_texto` enum('normal','grande','maior') NOT NULL DEFAULT 'normal' COMMENT 'Ajustes de acessibilidade',
  `tema` enum('auto','claro','escuro') NOT NULL DEFAULT 'auto',
  `alto_contraste` tinyint(1) NOT NULL DEFAULT '0',
  `menos_movimento` tinyint(1) NOT NULL DEFAULT '0',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `id_plano` (`id_plano`),
  KEY `ix_usuario_apagar` (`apagar_em`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_plano`) REFERENCES `plano` (`id_plano`)
) COMMENT='Conta de acesso (login)';

CREATE TABLE `familia` (
  `id_familia` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(60) NOT NULL COMMENT 'Desenha os azulejos da capa',
  `codigo_convite` varchar(16) DEFAULT NULL COMMENT 'Vazio = convites desligados',
  `codigo_criado_em` datetime DEFAULT NULL COMMENT 'UTC; quando o código atual foi gerado',
  `criado_por` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_familia`),
  UNIQUE KEY `uq_familia_codigo` (`codigo_convite`),
  KEY `criado_por` (`criado_por`),
  CONSTRAINT `familia_ibfk_1` FOREIGN KEY (`criado_por`) REFERENCES `usuario` (`id_usuario`)
) COMMENT='Acervo compartilhado de uma família';

CREATE TABLE `arquivo` (
  `id_arquivo` int NOT NULL AUTO_INCREMENT,
  `id_familia` int DEFAULT NULL COMMENT 'Acervo dono do arquivo',
  `tipo` enum('foto') NOT NULL,
  `subpasta` varchar(100) DEFAULT NULL COMMENT 'Pasta dentro do armazenamento, ex.: familias/7',
  `nome_arquivo` varchar(64) DEFAULT NULL COMMENT 'Nome aleatório do arquivo dentro da subpasta',
  `nome_miniatura` varchar(64) DEFAULT NULL COMMENT 'Nome da miniatura (JPEG), na mesma subpasta',
  `mime` varchar(100) DEFAULT NULL COMMENT 'Tipo conferido pelo conteúdo (image/jpeg, image/png...)',
  `tamanho_bytes` bigint DEFAULT NULL,
  `tamanho_miniatura` int DEFAULT NULL,
  `largura` int DEFAULT NULL,
  `altura` int DEFAULT NULL,
  `nome_original` varchar(255) DEFAULT NULL,
  `enviado_por` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_arquivo`),
  UNIQUE KEY `uq_arquivo_nome` (`nome_arquivo`),
  UNIQUE KEY `uq_arquivo_nome_mini` (`nome_miniatura`),
  KEY `enviado_por` (`enviado_por`),
  KEY `ix_arquivo_familia` (`id_familia`),
  KEY `ix_arquivo_criado` (`criado_em`),
  CONSTRAINT `arquivo_ibfk_1` FOREIGN KEY (`enviado_por`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `fk_arquivo_familia` FOREIGN KEY (`id_familia`) REFERENCES `familia` (`id_familia`)
) COMMENT='Foto enviada: só os dados. O conteúdo fica no armazenamento em subpasta/nome';

CREATE TABLE `pessoa` (
  `id_pessoa` int NOT NULL AUTO_INCREMENT,
  `id_familia` int NOT NULL,
  `id_usuario` int DEFAULT NULL COMMENT 'Vazio = ainda sem conta',
  `papel` enum('dona','ajudante','familiar') DEFAULT NULL,
  `nome` varchar(80) DEFAULT NULL COMMENT 'Como chamam',
  `nome_completo` varchar(160) DEFAULT NULL,
  `genero` enum('f','m') DEFAULT NULL COMMENT 'Usado para escrever o parentesco',
  `nasc_modo` enum('dia','mes','ano','decada','periodo','naosei') DEFAULT NULL COMMENT 'Nascimento',
  `nasc_dia` tinyint DEFAULT NULL,
  `nasc_mes` tinyint DEFAULT NULL,
  `nasc_ano` smallint DEFAULT NULL,
  `nasc_ano_fim` smallint DEFAULT NULL,
  `nasc_aprox` tinyint(1) NOT NULL DEFAULT '0',
  `fal_modo` enum('dia','mes','ano','decada','periodo','naosei') DEFAULT NULL COMMENT 'Falecimento',
  `fal_dia` tinyint DEFAULT NULL,
  `fal_mes` tinyint DEFAULT NULL,
  `fal_ano` smallint DEFAULT NULL,
  `fal_ano_fim` smallint DEFAULT NULL,
  `fal_aprox` tinyint(1) NOT NULL DEFAULT '0',
  `faleceu` tinyint(1) NOT NULL DEFAULT '0',
  `id_foto` int DEFAULT NULL,
  `cidade_natal` varchar(120) DEFAULT NULL,
  `cidade_atual` varchar(120) DEFAULT NULL,
  `profissao` varchar(120) DEFAULT NULL,
  `origem` varchar(160) DEFAULT NULL,
  `bio` text,
  `comida_favorita` varchar(120) DEFAULT NULL,
  `musica_favorita` varchar(120) DEFAULT NULL,
  `lugar_favorito` varchar(120) DEFAULT NULL,
  `capa` varchar(40) DEFAULT NULL,
  `cor` varchar(20) DEFAULT NULL,
  `removida_em` datetime DEFAULT NULL COMMENT 'Sai da árvore mas continua nas memórias',
  `criada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pessoa`),
  KEY `id_familia` (`id_familia`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_foto` (`id_foto`),
  CONSTRAINT `pessoa_ibfk_1` FOREIGN KEY (`id_familia`) REFERENCES `familia` (`id_familia`),
  CONSTRAINT `pessoa_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `pessoa_ibfk_5` FOREIGN KEY (`id_foto`) REFERENCES `arquivo` (`id_arquivo`)
) COMMENT='Quem faz parte da família, com ou sem conta';

CREATE TABLE `laco` (
  `id_laco` int NOT NULL AUTO_INCREMENT,
  `id_familia` int NOT NULL,
  `tipo` enum('pais','conjuge','irmaos','primos','cunhados','avos','tios','sogros','outro') NOT NULL,
  `id_de` int NOT NULL,
  `id_para` int NOT NULL,
  `modo` enum('adotivo','criacao') DEFAULT NULL,
  `rotulo` varchar(60) DEFAULT NULL COMMENT 'Só no tipo outro: madrinha',
  `rotulo_volta` varchar(60) DEFAULT NULL COMMENT 'Só no tipo outro: afilhada',
  PRIMARY KEY (`id_laco`),
  KEY `id_familia` (`id_familia`),
  KEY `id_de` (`id_de`),
  KEY `id_para` (`id_para`),
  CONSTRAINT `laco_ibfk_1` FOREIGN KEY (`id_familia`) REFERENCES `familia` (`id_familia`),
  CONSTRAINT `laco_ibfk_2` FOREIGN KEY (`id_de`) REFERENCES `pessoa` (`id_pessoa`),
  CONSTRAINT `laco_ibfk_3` FOREIGN KEY (`id_para`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Parentesco direto entre duas pessoas';

CREATE TABLE `convite` (
  `id_convite` int NOT NULL AUTO_INCREMENT,
  `id_familia` int NOT NULL,
  `id_pessoa` int NOT NULL COMMENT 'Registro que passa a ser da conta nova',
  `email` varchar(180) NOT NULL,
  `token` char(64) NOT NULL,
  `convidado_por` int NOT NULL,
  `status` enum('pendente','aceito','expirado','cancelado') NOT NULL DEFAULT 'pendente',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_em` datetime NOT NULL,
  PRIMARY KEY (`id_convite`),
  UNIQUE KEY `token` (`token`),
  KEY `id_familia` (`id_familia`),
  KEY `id_pessoa` (`id_pessoa`),
  KEY `convidado_por` (`convidado_por`),
  CONSTRAINT `convite_ibfk_1` FOREIGN KEY (`id_familia`) REFERENCES `familia` (`id_familia`),
  CONSTRAINT `convite_ibfk_2` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`),
  CONSTRAINT `convite_ibfk_3` FOREIGN KEY (`convidado_por`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Convite para um familiar criar conta';

CREATE TABLE `pessoa_gosto` (
  `id_pessoa_gosto` int NOT NULL AUTO_INCREMENT,
  `id_pessoa` int NOT NULL,
  `gosto` varchar(80) NOT NULL COMMENT 'costura, cozinhar... ou texto livre',
  PRIMARY KEY (`id_pessoa_gosto`),
  KEY `id_pessoa` (`id_pessoa`),
  CONSTRAINT `pessoa_gosto_ibfk_1` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Interesses do perfil';

CREATE TABLE `memoria` (
  `id_memoria` int NOT NULL AUTO_INCREMENT,
  `id_familia` int NOT NULL,
  `tipo` enum('foto','album') NOT NULL,
  `titulo` varchar(150) DEFAULT NULL,
  `descricao` longtext,
  `data_modo` enum('dia','mes','ano','decada','periodo','naosei') DEFAULT NULL COMMENT 'Como a pessoa lembra a data',
  `data_dia` tinyint DEFAULT NULL,
  `data_mes` tinyint DEFAULT NULL,
  `data_ano` smallint DEFAULT NULL COMMENT 'Na década guarda o primeiro ano (1970)',
  `data_ano_fim` smallint DEFAULT NULL COMMENT 'Só no modo período',
  `data_aprox` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Por volta de',
  `lugar` varchar(150) DEFAULT NULL,
  `id_capa` int DEFAULT NULL,
  `enviada_por` int NOT NULL,
  `status` enum('rascunho','aguardando','confirmada') NOT NULL DEFAULT 'rascunho',
  `passo_rascunho` varchar(40) DEFAULT NULL,
  `confirmada_em` datetime DEFAULT NULL,
  `criada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizada_em` datetime DEFAULT NULL,
  `versao` int NOT NULL DEFAULT '1' COMMENT 'Sobe a cada edição (evita apagar a mudança de outra pessoa)',
  PRIMARY KEY (`id_memoria`),
  KEY `id_familia` (`id_familia`),
  KEY `enviada_por` (`enviada_por`),
  KEY `ix_memoria_capa` (`id_capa`),
  CONSTRAINT `memoria_ibfk_1` FOREIGN KEY (`id_familia`) REFERENCES `familia` (`id_familia`),
  CONSTRAINT `memoria_ibfk_3` FOREIGN KEY (`id_capa`) REFERENCES `arquivo` (`id_arquivo`),
  CONSTRAINT `memoria_ibfk_4` FOREIGN KEY (`enviada_por`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Uma lembrança guardada';

CREATE TABLE `item_memoria` (
  `id_item` int NOT NULL AUTO_INCREMENT,
  `id_memoria` int NOT NULL,
  `tipo` enum('foto') NOT NULL,
  `anexo` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Vai junto (não é a foto principal)',
  `id_arquivo` int DEFAULT NULL,
  `ordem` smallint NOT NULL DEFAULT '0',
  `legenda` varchar(255) DEFAULT NULL,
  `data_modo` enum('dia','mes','ano','decada','periodo','naosei') DEFAULT NULL COMMENT 'Vazio = vale a da memória',
  `data_dia` tinyint DEFAULT NULL,
  `data_mes` tinyint DEFAULT NULL,
  `data_ano` smallint DEFAULT NULL COMMENT 'Na década guarda o primeiro ano (1970)',
  `data_ano_fim` smallint DEFAULT NULL COMMENT 'Só no modo período',
  `data_aprox` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Por volta de',
  `lugar` varchar(150) DEFAULT NULL,
  `observacao` text,
  PRIMARY KEY (`id_item`),
  KEY `id_memoria` (`id_memoria`),
  KEY `ix_item_arquivo` (`id_arquivo`),
  CONSTRAINT `item_memoria_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`),
  CONSTRAINT `item_memoria_ibfk_2` FOREIGN KEY (`id_arquivo`) REFERENCES `arquivo` (`id_arquivo`)
) COMMENT='Foto dentro de uma memória';

CREATE TABLE `item_etiqueta` (
  `id_item` int NOT NULL,
  `etiqueta` varchar(40) NOT NULL,
  PRIMARY KEY (`id_item`,`etiqueta`),
  CONSTRAINT `item_etiqueta_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `item_memoria` (`id_item`)
) COMMENT='Etiquetas de tempo de uma foto: Infância, Natal...';

CREATE TABLE `marcacao` (
  `id_marcacao` int NOT NULL AUTO_INCREMENT,
  `id_item` int NOT NULL,
  `id_pessoa` int DEFAULT NULL COMMENT 'Vazio = pessoa sem cadastro',
  `nome_livre` varchar(80) DEFAULT NULL COMMENT 'Mãe, Pai...',
  `pos_x` decimal(5,4) DEFAULT NULL COMMENT '0 a 1',
  `pos_y` decimal(5,4) DEFAULT NULL COMMENT '0 a 1',
  PRIMARY KEY (`id_marcacao`),
  KEY `id_item` (`id_item`),
  KEY `id_pessoa` (`id_pessoa`),
  CONSTRAINT `marcacao_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `item_memoria` (`id_item`),
  CONSTRAINT `marcacao_ibfk_2` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Pessoa marcada num ponto da foto';

CREATE TABLE `memoria_pessoa` (
  `id_memoria_pessoa` int NOT NULL AUTO_INCREMENT,
  `id_memoria` int NOT NULL,
  `id_pessoa` int DEFAULT NULL,
  `nome_livre` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`id_memoria_pessoa`),
  KEY `id_memoria` (`id_memoria`),
  KEY `id_pessoa` (`id_pessoa`),
  CONSTRAINT `memoria_pessoa_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`),
  CONSTRAINT `memoria_pessoa_ibfk_2` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Quem aparece na memória';

CREATE TABLE `memoria_etiqueta` (
  `id_memoria` int NOT NULL,
  `etiqueta` varchar(40) NOT NULL,
  PRIMARY KEY (`id_memoria`,`etiqueta`),
  CONSTRAINT `memoria_etiqueta_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`)
) COMMENT='Etiquetas de tempo: Infância, Natal...';

CREATE TABLE `comentario` (
  `id_comentario` int NOT NULL AUTO_INCREMENT,
  `id_memoria` int NOT NULL,
  `id_pessoa` int NOT NULL,
  `texto` text NOT NULL,
  `eu_lembro` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Eu me lembro também',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comentario`),
  KEY `id_memoria` (`id_memoria`),
  KEY `id_pessoa` (`id_pessoa`),
  CONSTRAINT `comentario_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`),
  CONSTRAINT `comentario_ibfk_2` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Comentário da família numa memória';

CREATE TABLE `reacao` (
  `id_memoria` int NOT NULL,
  `id_pessoa` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_memoria`,`id_pessoa`),
  KEY `id_pessoa` (`id_pessoa`),
  CONSTRAINT `reacao_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`),
  CONSTRAINT `reacao_ibfk_2` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Quem se emocionou com a memória';

CREATE TABLE `compartilhamento` (
  `id_memoria` int NOT NULL,
  `id_pessoa` int NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_memoria`,`id_pessoa`),
  KEY `id_pessoa` (`id_pessoa`),
  CONSTRAINT `compartilhamento_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`),
  CONSTRAINT `compartilhamento_ibfk_2` FOREIGN KEY (`id_pessoa`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Com quem a dona escolheu mostrar cada memória';

CREATE TABLE `sugestao_ia` (
  `id_sugestao` int NOT NULL AUTO_INCREMENT,
  `id_memoria` int NOT NULL,
  `id_item` int DEFAULT NULL,
  `campo` enum('data','lugar','pessoas','titulo') NOT NULL,
  `texto` text NOT NULL,
  `status` enum('pendente','aceita','recusada') NOT NULL DEFAULT 'pendente',
  `respondida_por` int DEFAULT NULL,
  `criada_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sugestao`),
  KEY `id_memoria` (`id_memoria`),
  KEY `id_item` (`id_item`),
  KEY `respondida_por` (`respondida_por`),
  CONSTRAINT `sugestao_ia_ibfk_1` FOREIGN KEY (`id_memoria`) REFERENCES `memoria` (`id_memoria`),
  CONSTRAINT `sugestao_ia_ibfk_2` FOREIGN KEY (`id_item`) REFERENCES `item_memoria` (`id_item`),
  CONSTRAINT `sugestao_ia_ibfk_3` FOREIGN KEY (`respondida_por`) REFERENCES `pessoa` (`id_pessoa`)
) COMMENT='Palpite da IA que só vale depois de aceito';

CREATE TABLE `sessao` (
  `id_sessao` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `token_hash` char(64) NOT NULL COMMENT 'SHA-256 do código do cookie; o código em si nunca é guardado',
  `criada_em` datetime NOT NULL COMMENT 'UTC',
  `ultimo_uso_em` datetime NOT NULL COMMENT 'UTC; usado para renovar a validade',
  `expira_em` datetime NOT NULL COMMENT 'UTC; depois disso a sessão não vale mais',
  PRIMARY KEY (`id_sessao`),
  UNIQUE KEY `uq_sessao_token` (`token_hash`),
  KEY `ix_sessao_usuario` (`id_usuario`),
  KEY `ix_sessao_expira` (`expira_em`),
  CONSTRAINT `fk_sessao_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) COMMENT='Sessão de login (o navegador guarda o código; aqui fica só o hash)';

CREATE TABLE `configuracao` (
  `chave` varchar(60) NOT NULL,
  `valor` varchar(500) DEFAULT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`chave`)
) COMMENT='Configurações do sistema que podem mudar sem trocar o código (nunca senhas ou chaves de acesso)';

INSERT INTO configuracao (chave, valor, descricao) VALUES
('armazenamento', 'local', 'Onde ficam as fotos: local (pasta ARQUIVOS_PASTA do servidor) ou s3'),
('s3_bucket', NULL, 'Nome do bucket (só com armazenamento = s3)'),
('s3_endereco', NULL, 'Endereço do serviço. Vazio = AWS. Preencha para R2, Backblaze ou MinIO'),
('s3_regiao', NULL, 'Região do bucket, ex.: sa-east-1');
