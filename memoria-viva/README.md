# Memória Viva

Plataforma para guardar as fotos da família e as histórias por trás delas. Público de 17 a 80+ anos.
Cada memória é uma **foto** ou um **álbum** (várias fotos contadas de uma vez), com data, lugar e quem aparece.
(Receita, música, vídeo, áudio e conselho saíram do projeto a pedido da mentoria: migrações 005 e 006.)

O projeto tem três peças, que em produção ficam **no mesmo domínio**:

| Peça | O que é | Onde está |
|---|---|---|
| Front-end | React 18 + Vite, CSS puro. Vira arquivos estáticos em `dist/` | `src/`, `public/`, `index.html` |
| Back-end (API) | Node + Express 5, um processo único na porta 3001 | `server/` |
| Banco | MySQL 8, criado e atualizado por migrações | `db/migracoes/` |

Além disso, a API guarda as fotos num **armazenamento**: uma pasta do disco (desenvolvimento) ou um
bucket **S3** na nuvem (produção). Qual dos dois vem da tabela `configuracao` do banco.

```
navegador ──HTTPS──► proxy (nginx) ──┬── /            → arquivos de dist/ (rotas desconhecidas → index.html)
                                     └── /api/*       → API Node :3001 ──┬── MySQL 8
                                                                         └── armazenamento: pasta local ou bucket S3
```

---

## 1. Estrutura de pastas

```
index.html                 página base do Vite (carrega Google Fonts)
public/                    favicon e imagens servidas como estão (public/img/: fotos e logo)
src/
  main.jsx, App.jsx        entrada; App escolhe a página pelo caminho (/, /entrar, /cadastro, /conta...)
  components/              seções da landing (Hero, Pelicula, ComoFunciona, Numero, Comecar, Rodape...)
  components/conta/        área logada (memórias, família, árvore, perfil, ajustes, conversar...)
  api.js                   única porta de saída para a API (fetch em /api/..., envio de arquivos com progresso)
  styles.css               tokens de cor/tipografia (:root) + estilos gerais
  conta.css, memorias.css, familia.css, guardar.css   estilos da área logada
  azulejaria.js            gerador dos azulejos
server/                    API (detalhes em server/README.md)
  index.js                 liga o servidor, tarefas automáticas, desligamento
  app.js                   monta o Express: CORS, JSON, cookie, sessão, rotas, erros
  config.js                lê e valida as variáveis de ambiente
  db.js                    pool do MySQL (sempre em UTC) e transações
  armazenamento.js         onde os arquivos enviados ficam (pasta local ou S3, escolhido pela tabela configuracao)
  middleware/  rotas/  validacao/  servicos/  dados/   camadas da API
  testes/                  Vitest + supertest
  migrar.js, verificar-banco.js, apagar-vencidas.js, mudar-plano.js, mysql-local.js   scripts npm
db/
  migracoes/               000_base.sql ... 006_sem_audio.sql (quem cria o banco de verdade)
  schema.sql, banco-memoria-viva.csv   documentação do esquema
.claude/skills/            skills da IA usadas no desenvolvimento (não vão para produção)
apresentacao/              slides do pitch (não vão para produção)
vite.config.js             build do front + proxy de /api no desenvolvimento
vitest.config.js           testes do servidor
vercel.json                antigo (da época só de front): ver "Pendências"
```

---

## 2. Requisitos

| Item | Versão | Observação |
|---|---|---|
| Node.js | **22.9 ou mais novo** (desenvolvido no 24) | os scripts usam `--env-file-if-exists` |
| MySQL | **8.0 ou mais novo** | MariaDB não serve: as migrações usam a collation `utf8mb4_0900_ai_ci` |
| npm | o que vem com o Node | |

Dependências (`package.json`): express 5, mysql2, @node-rs/argon2 (hash de senha, binário nativo já pronto
para Windows, Linux e macOS), @aws-sdk/client-s3 (armazenamento na nuvem), zod, cors, cookie-parser,
express-rate-limit; no front, react 18 e vite 5.

---

## 3. Variáveis de ambiente

A API lê tudo do ambiente e confere ao ligar (`server/config.js`): se faltar algo obrigatório, não sobe e diz o
que falta. Os scripts `npm run ...` também leem o arquivo `.env.local` da raiz, se existir. O modelo é o
`.env.example`. **O `.env.local` nunca vai para o git.**

Nenhuma variável vai para o navegador (não há prefixo `VITE_`): o build do front não precisa delas.

| Variável | Padrão | Produção | Para quê |
|---|---|---|---|
| `NODE_ENV` | `development` | **`production`** | liga o cookie `Secure` (só HTTPS) e bloqueia o `db:plano` |
| `API_PORTA` | `3001` | `3001` | porta da API |
| `DB_HOST` | `localhost` | endereço do MySQL | |
| `DB_PORTA` | `3306` | `3306` | |
| `DB_USUARIO` | (obrigatória) | usuário próprio do site, não root | |
| `DB_SENHA` | vazio | a senha dele | |
| `DB_NOME` | `memoria_viva` | `memoria_viva` | só letras, números e `_` |
| `DB_NOME_TESTE` | `memoria_viva_teste` | não precisa | banco do `npm test`; **é apagado a cada rodada**; precisa terminar em `_teste` |
| `CORS_ORIGENS` | `http://localhost:5173,http://localhost:4173` | `https://seu-dominio.com.br` | endereços que podem chamar a API (vírgula separa vários) |
| `SESSAO_DIAS` | `14` | `14` | dias logado sem usar o site (cada uso renova) |
| `ARQUIVOS_PASTA` | pasta `armazenamento/` do projeto | só com armazenamento local: caminho absoluto fora do projeto | pasta das fotos |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | vazio | com armazenamento S3 (ou vazio, se o servidor tiver papel IAM) | acesso ao bucket. **Nunca** vão para o banco |

O **endereço do armazenamento** (local ou S3, bucket, região, endereço do serviço) não é variável de ambiente:
fica na tabela `configuracao` do banco (seção 5).

---

## 4. Rodar no computador (desenvolvimento)

Comandos para o PowerShell, na pasta do projeto:

```powershell
npm install
Copy-Item .env.example .env.local   # abra o .env.local e preencha DB_USUARIO e DB_SENHA (ou use o db:local)
npm run db:verificar                # só olha o banco e diz o que encontrou; não muda nada
npm run db:migrar                   # cria o banco (se faltar) e aplica as migrações pendentes
npm run api                         # API em http://localhost:3001 (deixe este terminal aberto)
npm run dev                         # em OUTRO terminal: o site em http://localhost:5173, que repassa /api para a API
npm test                            # testes (usam o banco memoria_viva_teste, recriado a cada vez)
```

Sem saber a senha do MySQL da máquina? `npm run db:local` liga um MySQL só do projeto na porta 3307, sem senha
(no `.env.local`: `DB_HOST=127.0.0.1`, `DB_PORTA=3307`, `DB_SENHA=` vazio). Precisa do MySQL Server 8 instalado
em `C:\Program Files\MySQL` (ou o caminho do `mysqld` em `MYSQLD`). Deixe o terminal aberto; Ctrl+C desliga.

### Todos os scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | front em modo desenvolvimento (Vite), com `/api` repassado para a API |
| `npm run build` | gera o front de produção em `dist/` |
| `npm run preview` | serve o `dist/` localmente, também repassando `/api` |
| `npm run api` | API em modo desenvolvimento (`--watch`, reinicia ao salvar). **Não usar em produção** |
| `npm run db:local` | MySQL só do projeto na porta 3307 (Windows) |
| `npm run db:verificar` | mostra o estado do banco, sem alterar nada |
| `npm run db:migrar` | cria o banco se faltar e aplica as migrações pendentes |
| `npm run db:marcar-base` | para banco criado à mão com o esquema base: anota a `000_base` como aplicada |
| `npm run db:plano -- email "Família"` | troca o plano de uma conta. Só desenvolvimento: recusa com `NODE_ENV=production` |
| `npm run db:apagar-vencidas` | apaga já as contas cujo prazo de 30 dias acabou (a API faz isso sozinha a cada hora) |
| `npm test` | testes do servidor (Vitest) |

---

## 5. Banco de dados

O banco é criado e atualizado **só pelas migrações**, com `npm run db:migrar`. Cada arquivo de `db/migracoes/`
roda uma vez por banco, em ordem; o que já rodou fica na tabela `migracao_aplicada` (com o SHA-256 do arquivo, para
avisar se alguém editar uma migração já aplicada). Rodar de novo só aplica o que faltar.

| Migração | O que faz |
|---|---|
| `000_base.sql` | esquema base e o catálogo de planos |
| `001_sessao.sql` | tabela `sessao` (login; guarda só o hash do código do cookie) |
| `002_convite_familia.sql` | código de convite fixo da família |
| `003_apagar_conta.sql` | `usuario.apagar_em` (pedido de exclusão com 30 dias para desistir) |
| `004_arquivos.sql` | arquivos no servidor, ligados às memórias; etiquetas por foto; `memoria.versao` |
| `005_reducao_escopo.sql` | **apaga** as memórias de receita, música, vídeo e conselho e essas tabelas; tira a `data_flexivel` (a data vai para colunas da própria tabela); `arquivo` passa a guardar só subpasta + nome; cria a tabela `configuracao` |
| `006_sem_audio.sql` | **apaga** os áudios guardados nas memórias; `arquivo` e `item_memoria` ficam só com foto; sai `arquivo.duracao_seg` |
| `007_planos_novos.sql` | planos novos: Grátis, Individual, Família e Família Ampliada. Quem estava no Gold ou no Diamond passa para o Individual; nenhuma conta é apagada |

A 005 e a 006 são as únicas migrações que apagam dados. Faça um `mysqldump` antes de aplicá-las num banco com dados de verdade.

Tabelas: `plano`, `usuario`, `familia`, `pessoa`, `laco`, `convite`, `pessoa_gosto`, `memoria`, `item_memoria`,
`arquivo`, `marcacao`, `memoria_pessoa`, `memoria_etiqueta`, `item_etiqueta`, `comentario`, `reacao`,
`compartilhamento`, `sugestao_ia`, `sessao`, `configuracao`, `migracao_aplicada`.

**Datas.** A data "do jeito que a pessoa lembra" (dia exato, só o mês, só o ano, "por volta de", década, período ou
"não sei") fica em colunas da própria tabela: `memoria.data_*` e `item_memoria.data_*` (`modo`, `dia`, `mes`, `ano`,
`ano_fim`, `aprox`), e `pessoa.nasc_*` / `pessoa.fal_*`. Na década, `_ano` guarda o primeiro ano (1970).

**Tabela `configuracao`** (chave → valor). Muda sem trocar o código; nunca guarda senha nem chave de acesso:

| chave | valor | para quê |
|---|---|---|
| `armazenamento` | `local` (padrão) ou `s3` | onde ficam as fotos |
| `s3_bucket` | ex. `memoria-viva-fotos` | nome do bucket (só com `s3`) |
| `s3_regiao` | ex. `sa-east-1` | região do bucket |
| `s3_endereco` | vazio = AWS | preencha para Cloudflare R2, Backblaze B2 ou MinIO |

Para ligar o S3: `UPDATE configuracao SET valor = 's3' WHERE chave = 'armazenamento';` (e preencha bucket e região),
defina as chaves de acesso no ambiente e reinicie a API. A API lê a tabela ao ligar.

Planos (vêm da `000_base`):

| Plano | Mensal (R$) | Anual (R$) | Espaço | Créditos de IA/mês | Pessoas na família |
|---|---|---|---|---|---|
| Grátis | 0,00 | — | 1 GB | 10 | 1 |
| Individual | 24,90 | 249,00 | 10 GB | 60 | 1 |
| Família | 49,90 | 499,00 | 50 GB | 150 | 5 |
| Família Ampliada | 79,90 | 799,00 | 120 GB | 300 | 10 |

Detalhes:
- Charset `utf8mb4`, collation `utf8mb4_0900_ai_ci`. Todas as datas em **UTC** (cada conexão faz
  `SET time_zone = '+00:00'`); o fuso do servidor não interfere.
- O usuário do banco precisa de CREATE, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE e DELETE no banco do site
  (as migrações criam tabelas e chaves estrangeiras). Exemplo:
  ```sql
  CREATE DATABASE memoria_viva CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
  CREATE USER 'memoria_viva'@'localhost' IDENTIFIED BY '<senha forte>';
  GRANT ALL PRIVILEGES ON memoria_viva.* TO 'memoria_viva'@'localhost';
  ```
- Para mudar o banco: crie o próximo arquivo numerado (`007_...sql`), nunca edite um já aplicado, e atualize
  `db/schema.sql` e `db/banco-memoria-viva.csv`. Nada de `DROP` ou `TRUNCATE` (a 005 e a 006 foram a exceção, combinadas com o grupo).
- Se o `db:verificar` disser que o banco foi criado à mão com o esquema base, rode `db:marcar-base` antes do
  `db:migrar`.

---

## 6. API

Caminho de uma requisição: `rotas/` (endereço) → `validacao/` (zod) → `servicos/` (regras e acesso) →
`dados/` (SQL, sempre com `?`) → MySQL. A lista completa de endereços, regras de acesso e decisões está em
[server/README.md](server/README.md). Resumo:

| Grupo | Endereços |
|---|---|
| Saúde | `GET /api/saude` → `{"ok":true,"banco":"conectado"}` ou 503 |
| Conta | `/api/auth/cadastro`, `/entrar`, `/sessao`, `/sair`, `/desistir-apagar`; `/api/conta/ajustes`, `/api/conta/apagar` |
| Memórias | `/api/familias/:id/memorias`, `/api/memorias/:id`, `/api/familias/:id/linha` (linha da vida) |
| Família | `/api/familias/:id/arvore`, `/api/familias/:id/pessoas`, `/api/pessoas/:id`, `/api/familias/:id/lacos`, `/api/lacos/:id` |
| Convites | `/api/familias/:id/convite`, `/api/convites/conferir`, `/api/convites/entrar` |
| Arquivos | `POST /api/familias/:id/arquivos?tipo=foto`, `GET /api/arquivos/:id`, `PUT /api/arquivos/:id/miniatura`, `DELETE /api/arquivos/:id` |

Erros sempre no formato `{ "erro": { "codigo", "mensagem", "campos"? } }`.

### Sessão e segurança
- Senhas guardadas só como hash **Argon2id**.
- Login cria um código aleatório que vai no cookie **`mv_sessao`** (HttpOnly, SameSite=Lax, Secure em produção,
  dura `SESSAO_DIAS`). No banco fica só o hash dele.
- Por isso o front chama sempre o caminho relativo `/api/...`: **front e API precisam estar no mesmo domínio.**
- Limite de 10 tentativas a cada 15 minutos por endereço IP em login, cadastro, desistir de apagar, apagar conta e
  convites (`express-rate-limit`, guardado na memória do processo).
- Quem não tem acesso a algo recebe 404, igual a algo que não existe.
- Logs: uma linha por requisição (método, caminho, status, tempo). Sem corpo, cookies, e-mails ou senhas.

### Arquivos enviados
- Cada arquivo vai para `familias/<id do acervo>/<nome aleatório>` no armazenamento (pasta local ou bucket S3).
  A tabela `arquivo` guarda só `subpasta` e `nome_arquivo` (e `nome_miniatura`, na mesma subpasta): nunca uma URL.
  Arquivos de antes da migração 005 continuam na subpasta antiga (as 2 primeiras letras do nome).
- O conteúdo sai apenas por `GET /api/arquivos/:id`, que confere quem pode ver. O bucket fica **privado** e a
  pasta local **nunca** pode ficar dentro de `public/`, `dist/` ou de algo que o servidor web sirva direto.
- Formatos conferidos pelo conteúdo: foto JPEG, PNG, WebP, GIF · miniatura JPEG.
- Limites por arquivo: foto 20 MB, miniatura 2 MB. O total do acervo respeita o espaço do plano da dona.
- No S3, o arquivo é conferido na memória do servidor (tamanho e tipo) antes de ir para o bucket.
- Tudo o que mexe no armazenamento está em `server/armazenamento.js` (duas versões com as mesmas funções).

### Tarefas automáticas (dentro do processo da API, sem cron)
| Quando | O quê |
|---|---|
| ao ligar e a cada 6 h | apaga sessões vencidas |
| ao ligar e a cada 1 h | apaga de vez as contas com pedido de exclusão há mais de 30 dias (LGPD), com famílias e arquivos delas |
| na mesma rodada de 1 h | apaga envios nunca usados há mais de 24 h e arquivos do armazenamento sem linha no banco há mais de 24 h |

---

## 7. Front-end

- Build: `npm run build` → `dist/` (só arquivos estáticos; não precisa de variáveis de ambiente).
- O site usa rotas no navegador. Todo caminho que não for `/api` nem um arquivo existente deve devolver
  `index.html`. Páginas: `/` (landing), `/entrar`, `/cadastro`, `/conta` e as telas dentro dela
  (`/conta/historia`, `/conta/perfil`, `/conta/guardar/...`, `/conta/memoria/<id>`, `/conta/familia/...`,
  `/conta/familias/<id>`, `/conta/arvore`, `/conta/conversar`).
- Sem login, `/conta` mostra a demonstração da Maria.
- Serviço externo que o navegador usa: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). A API só fala com
  o MySQL e, com armazenamento S3, com o bucket.
- Identidade visual e regras de interface: ver [CLAUDE.md](CLAUDE.md).

| Quero mudar... | Arquivo |
|---|---|
| A ordem das seções | `src/App.jsx` |
| Uma seção | `src/components/NomeDaSecao.jsx` |
| Cores, fontes, espaçamentos | `src/styles.css` |
| Fotos | `public/img/` |
| Logo usada no site | `public/marca/` (favicons na raiz de `public/`) |
| Kit completo da marca | `design/marca/` (não vai para o site) |
| Uma rota da API | `server/rotas/` |
| Uma regra (cadastro, login...) | `server/servicos/` |
| Uma consulta SQL | `server/dados/` |
| A estrutura do banco | nova migração em `db/migracoes/` (e atualize `db/schema.sql` e o CSV) |

---

## 8. Produção

### O que é preciso
- Servidor com Node 22.9+, MySQL 8, um proxy reverso com HTTPS (ex.: nginx) e um **bucket S3** (AWS, ou R2/Backblaze/MinIO)
  para as fotos. Sem bucket, dá para usar uma pasta local, desde que o disco seja persistente.
- **Uma única instância da API.** O limite de tentativas de login e as tarefas automáticas ficam na memória do
  processo; duas instâncias atrás de um balanceador quebram isso.
- **HTTPS obrigatório:** com `NODE_ENV=production` o cookie só viaja por HTTPS; sem certificado ninguém entra.
- A API não roda em plataformas só de funções (Vercel, Netlify): ela é um processo contínuo, com tarefas a cada hora.

### Passo a passo
```bash
git clone <repositório> /srv/memoria-viva && cd /srv/memoria-viva
npm ci
# definir as variáveis da seção 3 (arquivo de ambiente do systemd, por exemplo)
npm run db:verificar
npm run db:migrar
npm run build
# ligar a API com: NODE_ENV=production node server/index.js  (via systemd ou pm2)
```
A cada nova versão: `git pull` → `npm ci` → `npm run db:migrar` → `npm run build` → reiniciar a API.

### Exemplo de serviço systemd
```ini
[Unit]
Description=Memoria Viva API
After=network.target mysql.service

[Service]
WorkingDirectory=/srv/memoria-viva
EnvironmentFile=/etc/memoria-viva.env
ExecStart=/usr/bin/node server/index.js
Restart=always
User=memoriaviva

[Install]
WantedBy=multi-user.target
```
O usuário do processo precisa ler, gravar e apagar em `ARQUIVOS_PASTA`. SIGTERM fecha a porta e as conexões com
o banco antes de sair. Logs no stdout (`journalctl -u memoria-viva-api`).

### Exemplo de nginx
```nginx
server {
    listen 443 ssl http2;
    server_name seu-dominio.com.br;
    # ssl_certificate / ssl_certificate_key (ex.: Let's Encrypt)

    root /srv/memoria-viva/dist;

    # envios de até 20 MB (foto), sem guardar o arquivo inteiro no nginx
    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri /index.html;
    }
}

server {
    listen 80;
    server_name seu-dominio.com.br;
    return 301 https://$host$request_uri;
}
```

### Backup
O banco e os arquivos andam juntos: copie os dois no mesmo horário.
```bash
mysqldump --single-transaction --routines memoria_viva > memoria_viva-$(date +%F).sql
# S3: ligue o versionamento do bucket (ou copie com  aws s3 sync s3://<bucket> <destino>)
# pasta local: tar czf arquivos-$(date +%F).tgz -C /var/lib/memoria-viva arquivos
```
Ao restaurar, restaure os dois antes de ligar a API: a faxina de hora em hora apaga arquivos do armazenamento sem
linha no banco. O conteúdo é dado pessoal de famílias (LGPD): backups criptografados e com acesso restrito.

### Conferir que está no ar
- [ ] `npm run db:verificar` mostra as migrações `000` a `007` aplicadas.
- [ ] `https://seu-dominio.com.br/api/saude` responde `{"ok":true,"banco":"conectado"}`.
- [ ] Abrir `https://seu-dominio.com.br/conta` direto na barra de endereço carrega o site (não dá 404).
- [ ] Criar conta, sair e entrar de novo; o cookie `mv_sessao` aparece como Secure e HttpOnly.
- [ ] Guardar uma memória com foto; o arquivo aparece no bucket (ou em `ARQUIVOS_PASTA`) em `familias/<id>/`.
- [ ] O endereço de uma foto aberto numa janela anônima dá 401 ou 404, nunca a imagem.
- [ ] Errar a senha em dois aparelhos diferentes: um não bloqueia o outro.
- [ ] Reiniciar o servidor: a API volta sozinha e as fotos continuam lá.

---

## 9. Pendências conhecidas

| Pendência | Efeito | Onde |
|---|---|---|
| Falta `app.set("trust proxy", 1)` | **Obrigatório antes de produção.** Atrás do nginx a API vê todo mundo com o mesmo IP: o limite de 10 tentativas de login vira um limite único para o site inteiro | `server/app.js` |
| Não há script `start` nem `engines` | em produção use `node server/index.js` direto | `package.json` |
| `vercel.json` desatualizado | descreve um deploy só de front, que não serve mais | raiz |
| Ainda não há pagamento | toda conta nasce no Gráts, que não permite convidar ninguém; em produção, trocar plano só por SQL (`UPDATE usuario SET id_plano = ...`) | — |

---

## Com IA
`CLAUDE.md` tem as regras e a identidade; a IA lê sozinha (Claude Code) ou você cola no chat.
As Skills ficam em `.claude/skills/`.
