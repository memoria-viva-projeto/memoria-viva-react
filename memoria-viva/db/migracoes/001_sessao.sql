-- 001 · Sessões de login.
-- Por quê: o servidor precisa lembrar quem entrou e conseguir encerrar essa entrada (sair).
-- O navegador guarda um código aleatório num cookie HttpOnly; aqui fica só o hash SHA-256 dele.
-- Se alguém copiar esta tabela, não consegue entrar com o que está nela.
-- Só cria uma tabela nova: não altera nem apaga nada do que já existe.

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
