-- Memória Viva · esquema do banco (MySQL 8), versão 3
-- REFERÊNCIA do estado atual do banco = db/migracoes/000_base.sql + 001_sessao.sql + 002_convite_familia.sql.
-- Para criar ou atualizar um banco, NÃO rode este arquivo: use  npm run db:migrar
-- (ele cria o banco se faltar, aplica só o que falta e anota tudo em migracao_aplicada).
-- Mudanças desde a versão 2: tabela plano, usuario.id_plano (memoria_vivabd.sql) e tabela sessao (001).
CREATE DATABASE IF NOT EXISTS memoria_viva CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE memoria_viva;
SET NAMES utf8mb4;

CREATE TABLE plano (
  id_plano INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(30) NOT NULL,
  valor_mensal DECIMAL(10,2) NOT NULL,
  valor_anual DECIMAL(10,2) NULL,
  armazenamento_gb DECIMAL(10,2) NOT NULL,
  creditos_ia_mes INT NOT NULL,
  limite_membros INT NULL,
  PRIMARY KEY (id_plano)
) COMMENT = 'Planos disponíveis para as contas';

INSERT INTO plano (nome, valor_mensal, valor_anual, armazenamento_gb, creditos_ia_mes, limite_membros) VALUES
('Gratuito', 0.00, NULL, 0.50, 10, 1),
('Silver', 17.99, 179.90, 8.00, 120, 1),
('Gold', 25.99, 259.90, 25.00, 350, 1),
('Diamond', 39.99, 399.90, 60.00, 800, 1),
('Família', 69.99, 699.90, 80.00, 500, 5),
('Família Plus', 99.99, 999.90, 150.00, 1000, 10);


CREATE TABLE usuario (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  id_plano INT NOT NULL,
  status ENUM('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
  tamanho_texto ENUM('normal','grande','maior') NOT NULL DEFAULT 'normal' COMMENT 'Ajustes de acessibilidade',
  tema ENUM('auto','claro','escuro') NOT NULL DEFAULT 'auto',
  alto_contraste BOOLEAN NOT NULL DEFAULT false,
  menos_movimento BOOLEAN NOT NULL DEFAULT false,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  FOREIGN KEY (id_plano) REFERENCES plano(id_plano)
) COMMENT = 'Conta de acesso (login)';


CREATE TABLE familia (
  id_familia INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(60) NOT NULL COMMENT 'Desenha os azulejos da capa',
  codigo_convite VARCHAR(16) NULL COMMENT 'Vazio = convites desligados',
  codigo_criado_em DATETIME NULL COMMENT 'UTC; quando o código atual foi gerado',
  criado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_familia),
  UNIQUE KEY uq_familia_codigo (codigo_convite),
  FOREIGN KEY (criado_por) REFERENCES usuario(id_usuario)
) COMMENT = 'Acervo compartilhado de uma família';


CREATE TABLE data_flexivel (
  id_data INT NOT NULL AUTO_INCREMENT,
  modo ENUM('dia','mes','ano','decada','periodo','naosei') NOT NULL,
  dia TINYINT NULL,
  mes TINYINT NULL,
  ano SMALLINT NULL COMMENT 'Na década guarda o primeiro ano (1970)',
  ano_fim SMALLINT NULL COMMENT 'Só no modo período',
  aprox BOOLEAN NOT NULL DEFAULT false COMMENT 'Por volta de',
  PRIMARY KEY (id_data)
) COMMENT = 'Data como a pessoa lembra (dia exato, ano, década, período ou não sei)';


CREATE TABLE arquivo (
  id_arquivo INT NOT NULL AUTO_INCREMENT,
  tipo ENUM('foto','video','audio') NOT NULL,
  url VARCHAR(500) NOT NULL,
  url_miniatura VARCHAR(500) NULL,
  largura INT NULL,
  altura INT NULL,
  duracao_seg INT NULL,
  nome_original VARCHAR(255) NULL,
  enviado_por INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_arquivo),
  FOREIGN KEY (enviado_por) REFERENCES usuario(id_usuario)
) COMMENT = 'Foto, vídeo ou áudio enviado';


CREATE TABLE pessoa (
  id_pessoa INT NOT NULL AUTO_INCREMENT,
  id_familia INT NOT NULL,
  id_usuario INT NULL COMMENT 'Vazio = ainda sem conta',
  papel ENUM('dona','ajudante','familiar') NULL,
  nome VARCHAR(80) NULL COMMENT 'Como chamam',
  nome_completo VARCHAR(160) NULL,
  genero ENUM('f','m') NULL COMMENT 'Usado para escrever o parentesco',
  id_nascimento INT NULL,
  id_falecimento INT NULL,
  faleceu BOOLEAN NOT NULL DEFAULT false,
  id_foto INT NULL,
  cidade_natal VARCHAR(120) NULL,
  cidade_atual VARCHAR(120) NULL,
  profissao VARCHAR(120) NULL,
  origem VARCHAR(160) NULL,
  bio TEXT NULL,
  comida_favorita VARCHAR(120) NULL,
  musica_favorita VARCHAR(120) NULL,
  lugar_favorito VARCHAR(120) NULL,
  capa VARCHAR(40) NULL,
  cor VARCHAR(20) NULL,
  removida_em DATETIME NULL COMMENT 'Sai da árvore mas continua nas memórias',
  criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pessoa),
  FOREIGN KEY (id_familia) REFERENCES familia(id_familia),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
  FOREIGN KEY (id_nascimento) REFERENCES data_flexivel(id_data),
  FOREIGN KEY (id_falecimento) REFERENCES data_flexivel(id_data),
  FOREIGN KEY (id_foto) REFERENCES arquivo(id_arquivo)
) COMMENT = 'Quem faz parte da família, com ou sem conta';


CREATE TABLE laco (
  id_laco INT NOT NULL AUTO_INCREMENT,
  id_familia INT NOT NULL,
  tipo ENUM('pais','conjuge','irmaos','primos','cunhados','avos','tios','sogros','outro') NOT NULL,
  id_de INT NOT NULL,
  id_para INT NOT NULL,
  modo ENUM('adotivo','criacao') NULL,
  rotulo VARCHAR(60) NULL COMMENT 'Só no tipo outro: madrinha',
  rotulo_volta VARCHAR(60) NULL COMMENT 'Só no tipo outro: afilhada',
  PRIMARY KEY (id_laco),
  FOREIGN KEY (id_familia) REFERENCES familia(id_familia),
  FOREIGN KEY (id_de) REFERENCES pessoa(id_pessoa),
  FOREIGN KEY (id_para) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Parentesco direto entre duas pessoas';


CREATE TABLE convite (
  id_convite INT NOT NULL AUTO_INCREMENT,
  id_familia INT NOT NULL,
  id_pessoa INT NOT NULL COMMENT 'Registro que passa a ser da conta nova',
  email VARCHAR(180) NOT NULL,
  token CHAR(64) NOT NULL UNIQUE,
  convidado_por INT NOT NULL,
  status ENUM('pendente','aceito','expirado','cancelado') NOT NULL DEFAULT 'pendente',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em DATETIME NOT NULL,
  PRIMARY KEY (id_convite),
  FOREIGN KEY (id_familia) REFERENCES familia(id_familia),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa),
  FOREIGN KEY (convidado_por) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Convite para um familiar criar conta';


CREATE TABLE pessoa_gosto (
  id_pessoa_gosto INT NOT NULL AUTO_INCREMENT,
  id_pessoa INT NOT NULL,
  gosto VARCHAR(80) NOT NULL COMMENT 'costura, cozinhar... ou texto livre',
  PRIMARY KEY (id_pessoa_gosto),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Interesses do perfil';


CREATE TABLE memoria (
  id_memoria INT NOT NULL AUTO_INCREMENT,
  id_familia INT NOT NULL,
  tipo ENUM('foto','album','musica','receita','video','conselho') NOT NULL,
  titulo VARCHAR(150) NULL,
  descricao LONGTEXT NULL,
  id_data INT NULL,
  lugar VARCHAR(150) NULL,
  id_capa INT NULL,
  enviada_por INT NOT NULL,
  status ENUM('rascunho','aguardando','confirmada') NOT NULL DEFAULT 'rascunho',
  passo_rascunho VARCHAR(40) NULL,
  confirmada_em DATETIME NULL,
  criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizada_em DATETIME NULL,
  PRIMARY KEY (id_memoria),
  FOREIGN KEY (id_familia) REFERENCES familia(id_familia),
  FOREIGN KEY (id_data) REFERENCES data_flexivel(id_data),
  FOREIGN KEY (id_capa) REFERENCES arquivo(id_arquivo),
  FOREIGN KEY (enviada_por) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Uma lembrança guardada';


CREATE TABLE item_memoria (
  id_item INT NOT NULL AUTO_INCREMENT,
  id_memoria INT NOT NULL,
  tipo ENUM('foto','video','audio','youtube') NOT NULL,
  id_arquivo INT NULL,
  youtube_id VARCHAR(20) NULL,
  youtube_titulo VARCHAR(200) NULL,
  youtube_canal VARCHAR(120) NULL,
  ordem SMALLINT NOT NULL DEFAULT 0,
  legenda VARCHAR(255) NULL,
  id_data INT NULL COMMENT 'Vazio = vale a da memória',
  lugar VARCHAR(150) NULL,
  observacao TEXT NULL,
  PRIMARY KEY (id_item),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria),
  FOREIGN KEY (id_arquivo) REFERENCES arquivo(id_arquivo),
  FOREIGN KEY (id_data) REFERENCES data_flexivel(id_data)
) COMMENT = 'Foto, vídeo, áudio ou link do YouTube dentro de uma memória';


CREATE TABLE marcacao (
  id_marcacao INT NOT NULL AUTO_INCREMENT,
  id_item INT NOT NULL,
  id_pessoa INT NULL COMMENT 'Vazio = pessoa sem cadastro',
  nome_livre VARCHAR(80) NULL COMMENT 'Mãe, Pai...',
  pos_x DECIMAL(5,4) NULL COMMENT '0 a 1',
  pos_y DECIMAL(5,4) NULL COMMENT '0 a 1',
  PRIMARY KEY (id_marcacao),
  FOREIGN KEY (id_item) REFERENCES item_memoria(id_item),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Pessoa marcada num ponto da foto';


CREATE TABLE memoria_pessoa (
  id_memoria_pessoa INT NOT NULL AUTO_INCREMENT,
  id_memoria INT NOT NULL,
  id_pessoa INT NULL,
  nome_livre VARCHAR(80) NULL,
  PRIMARY KEY (id_memoria_pessoa),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Quem aparece na memória';


CREATE TABLE memoria_etiqueta (
  id_memoria INT NOT NULL,
  etiqueta VARCHAR(40) NOT NULL,
  PRIMARY KEY (id_memoria, etiqueta),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria)
) COMMENT = 'Etiquetas de tempo: Infância, Natal...';


CREATE TABLE receita (
  id_memoria INT NOT NULL,
  quem_fazia VARCHAR(120) NULL,
  ocasioes VARCHAR(255) NULL,
  preparo LONGTEXT NULL,
  segredos TEXT NULL,
  PRIMARY KEY (id_memoria),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria)
) COMMENT = 'Detalhes de uma memória do tipo receita';


CREATE TABLE ingrediente (
  id_ingrediente INT NOT NULL AUTO_INCREMENT,
  id_memoria INT NOT NULL,
  ordem SMALLINT NOT NULL DEFAULT 0,
  texto VARCHAR(200) NOT NULL,
  PRIMARY KEY (id_ingrediente),
  FOREIGN KEY (id_memoria) REFERENCES receita(id_memoria)
) COMMENT = 'Ingredientes da receita, em ordem';


CREATE TABLE musica (
  id_memoria INT NOT NULL,
  artista VARCHAR(120) NULL,
  porque TEXT NULL,
  lembranca TEXT NULL,
  quem_ouvia VARCHAR(120) NULL,
  momento VARCHAR(150) NULL,
  PRIMARY KEY (id_memoria),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria)
) COMMENT = 'Detalhes de uma memória do tipo música';


CREATE TABLE video (
  id_memoria INT NOT NULL,
  contexto TEXT NULL,
  PRIMARY KEY (id_memoria),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria)
) COMMENT = 'Detalhes de uma memória do tipo vídeo';


CREATE TABLE conselho (
  id_memoria INT NOT NULL,
  frase TEXT NOT NULL,
  guardado_para VARCHAR(120) NULL,
  PRIMARY KEY (id_memoria),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria)
) COMMENT = 'Detalhes de uma memória do tipo conselho';


CREATE TABLE comentario (
  id_comentario INT NOT NULL AUTO_INCREMENT,
  id_memoria INT NOT NULL,
  id_pessoa INT NOT NULL,
  texto TEXT NOT NULL,
  eu_lembro BOOLEAN NOT NULL DEFAULT false COMMENT 'Eu me lembro também',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_comentario),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Comentário da família numa memória';


CREATE TABLE reacao (
  id_memoria INT NOT NULL,
  id_pessoa INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_memoria, id_pessoa),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Quem se emocionou com a memória';


CREATE TABLE compartilhamento (
  id_memoria INT NOT NULL,
  id_pessoa INT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_memoria, id_pessoa),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria),
  FOREIGN KEY (id_pessoa) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Com quem a dona escolheu mostrar cada memória';


CREATE TABLE sugestao_ia (
  id_sugestao INT NOT NULL AUTO_INCREMENT,
  id_memoria INT NOT NULL,
  id_item INT NULL,
  campo ENUM('data','lugar','pessoas','titulo') NOT NULL,
  texto TEXT NOT NULL,
  status ENUM('pendente','aceita','recusada') NOT NULL DEFAULT 'pendente',
  respondida_por INT NULL,
  criada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_sugestao),
  FOREIGN KEY (id_memoria) REFERENCES memoria(id_memoria),
  FOREIGN KEY (id_item) REFERENCES item_memoria(id_item),
  FOREIGN KEY (respondida_por) REFERENCES pessoa(id_pessoa)
) COMMENT = 'Palpite da IA que só vale depois de aceito';


CREATE TABLE sessao (
  id_sessao INT NOT NULL AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  token_hash CHAR(64) NOT NULL COMMENT 'SHA-256 do código do cookie; o código em si nunca é guardado',
  criada_em DATETIME NOT NULL COMMENT 'UTC',
  ultimo_uso_em DATETIME NOT NULL COMMENT 'UTC; usado para renovar a validade',
  expira_em DATETIME NOT NULL COMMENT 'UTC; depois disso a sessão não vale mais',
  PRIMARY KEY (id_sessao),
  UNIQUE KEY uq_sessao_token (token_hash),
  KEY ix_sessao_usuario (id_usuario),
  KEY ix_sessao_expira (expira_em),
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) COMMENT = 'Sessão de login (o navegador guarda o código; aqui fica só o hash)';
