# Backend do Memória Viva · guia do grupo

Node + Express + MySQL 8. Este guia explica como o servidor funciona e como cada pessoa do grupo
pode trabalhar nele sem quebrar o que já existe.

## Como rodar (PowerShell, na pasta `memoria-viva`)

```
npm install          # uma vez
npm run db:local     # deixa aberto: MySQL do projeto na DB_PORTA do .env.local (padrão 3307)
npm run db:migrar    # em outro terminal: cria/atualiza as tabelas
npm run api          # servidor na porta 3001
npm run dev          # o site; /api é repassado para o servidor
npm test             # testes (usa o banco memoria_viva_teste, nunca o de verdade)
npm run db:plano -- email@exemplo.com "Família"   # SÓ para desenvolver/apresentar: troca o plano de uma conta
npm run db:apagar-vencidas  # apaga já as contas cujo prazo de 30 dias acabou (o servidor faz sozinho a cada hora)
```

Não existe pagamento: escolher ou trocar de plano é uma **simulação** (no cadastro, na aba Planos da conta ou com
`db:plano`). O plano Grátis não permite convidar ninguém. O `db:plano` se recusa a rodar com `NODE_ENV=production`.

Copie `.env.example` para `.env.local` e ajuste. **Nunca suba o `.env.local` para o git.**

## O caminho de uma requisição

```
navegador ──► rotas/ ──► validacao/ ──► servicos/ ──► dados/ ──► MySQL
              (endereço)  (o dado é válido?)  (regra: pode?)  (SQL)
```

Exemplo, guardar uma memória:
1. `rotas/memorias.js` recebe `POST /api/familias/7/memorias` e exige login (`exigirLogin`).
2. `validacao/memorias.js` confere o corpo com zod. Dado ruim → 400 `DADOS_INVALIDOS` com os campos.
3. `servicos/memorias.js` verifica se a conta é a dona da família 7 e grava tudo numa transação.
4. `dados/memorias.js` tem o SQL, sempre com `?` (nunca junte texto do usuário no SQL).

## O papel de cada pasta

| Pasta / arquivo | Para que serve |
|---|---|
| `app.js` | Monta o servidor: CORS, JSON, cookie, sessão, rotas, erros. |
| `index.js` | Abre a porta. |
| `config.js` | Lê o `.env.local` e confere se está tudo certo. |
| `db.js` | Conexões com o MySQL (sempre em UTC) e `emTransacao`. |
| `erros.js` | `ErroApi` e o formato único de erro: `{ erro: { codigo, mensagem, campos? } }`. |
| `middleware/sessao.js` | Lê o cookie `mv_sessao`, descobre quem está logado, `exigirLogin`. |
| `rotas/` | Os endereços da API. Finas: só chamam validação e serviço. |
| `validacao/` | Regras de formato (zod), iguais às da tela. |
| `servicos/` | Regras do negócio e de acesso. |
| `dados/` | Todo o SQL. |
| `testes/` | Vitest + supertest. |
| `../db/migracoes/` | Mudanças no banco, numeradas. |

## Quatro conceitos para entender

1. **Senha:** guardada só como hash Argon2id (`servicos/senha.js`). Nunca devolva, registre ou mostre senha ou hash.
2. **Sessão:** ao entrar, o servidor cria um código aleatório, manda no cookie `mv_sessao` (HttpOnly)
   e guarda no banco só o hash dele (tabela `sessao`). Dura 14 dias. Sair apaga a linha.
3. **Acesso:** toda rota protegida checa no servidor quem pode. Hoje a regra é:
   - a **dona** da família (`pessoa.papel = 'dona'`, não removida) vê, guarda, muda e apaga;
   - um **membro** (entrou pelo código de convite: pessoa da árvore ligada à conta dele, não removida)
     só **vê** as memórias e a árvore, não vê os rascunhos e muda só a própria pessoa (o perfil dele).
   Quem não pode recebe **404**, igual a algo que não existe, para ninguém descobrir o que existe tentando números.
4. **Migrações:** nunca edite um arquivo de `db/migracoes/` que já foi aplicado (o `000_base.sql` nunca).
   Para mudar o banco, crie o próximo número (`002_...sql`) e rode `npm run db:migrar`.
   Atualize também `db/schema.sql` e `db/banco-memoria-viva.csv`. Nada de `DROP` ou `TRUNCATE`
   (a `005_reducao_escopo.sql` e a `006_sem_audio.sql` foram a exceção, combinadas com o grupo depois da mentoria).

## O que já existe

| Endereço | O que faz |
|---|---|
| `GET /api/saude` | Servidor e banco estão de pé? |
| `POST /api/auth/cadastro` | Cria conta, família e a pessoa dona. Já entra. Plano opcional (`idPlano`, `ciclo`); sem plano = Grátis. |
| `POST /api/auth/entrar` | Entra. Limite de tentativas. |
| `GET /api/auth/sessao` | Quem está logado. |
| `POST /api/auth/sair` | Sai. |
| `POST /api/auth/desistir-apagar` | `{ email, senha }` → cancela o pedido de apagar a conta e já entra. Limite de tentativas. |
| `POST /api/familias/:id/memorias` | Guarda memória (foto ou álbum). |
| `GET /api/familias/:id/memorias` | Lista o acervo, cada memória já completa (`?limite=50&antesDe=<id>`). |
| `GET /api/memorias/:id` | Abre uma memória. |
| `PUT /api/memorias/:id` | Edita: a memória inteira substitui a anterior. O tipo não muda; confirmada não volta a rascunho. |
| `DELETE /api/memorias/:id` | Apaga a memória e tudo o que é dela (itens, pessoas, comentários...). Não dá para desfazer. |
| `GET /api/familias/:id/arvore` | Pessoas (inclusive quem saiu da árvore, marcada `removida`) e laços. |
| `POST /api/familias/:id/pessoas` | Adiciona um familiar (papel `familiar`, sem conta). Nome é opcional, como na tela. |
| `PATCH /api/pessoas/:id` | Muda só os campos enviados. Também é o perfil da dona (cidades, profissão, gostos, favoritos). |
| `DELETE /api/pessoas/:id` | Tira da árvore (`removida_em`); continua nas memórias; os laços dela saem. A dona não sai. |
| `POST /api/familias/:id/lacos` | Cria um parentesco; substitui o que houver entre as duas pessoas. |
| `DELETE /api/lacos/:id` | Desfaz um parentesco. |
| `PATCH /api/conta/ajustes` | Ajustes de acessibilidade (tamanho do texto, aparência, contraste, movimento). |
| `GET /api/conta/apagar` | O que some se a conta for apagada: as famílias dela (memórias, membros) e em quantas outras ela entrou. |
| `POST /api/conta/apagar` | `{ senha }` → pede para apagar. Sai de todos os aparelhos; a conta some de vez em 30 dias. Limite de tentativas. |
| `GET /api/planos` | O catálogo de planos (sem login): preço, espaço, pessoas, conversas, `recursos` e `emBreve`. |
| `GET /api/conta/plano` | O plano da conta, o ciclo, desde quando e o uso de cada acervo (espaço e pessoas, com `passou`). |
| `POST /api/conta/plano` | `{ idPlano, ciclo? }` → troca **simulada** (sem pagamento). Os limites mudam na hora. Plano menor que o uso: troca, nada é apagado, e `avisos` diz o que ficou parado. 409 `MESMO_PLANO`. |

| `GET /api/familias/:id/convite` | O código da família, quantos membros há e o limite do plano. Só a dona. |
| `POST /api/familias/:id/convite` | Gera ou troca o código (o antigo para de valer na hora). Só a dona; o plano precisa permitir mais de 1 membro. |
| `DELETE /api/familias/:id/convite` | Desliga os convites. Quem já entrou continua. Só a dona. |
| `POST /api/convites/conferir` | `{ codigo }` → de qual família é (sem login; para o cadastro). Limite de tentativas. |
| `POST /api/convites/entrar` | `{ codigo }` → a conta entra na família como membro. Limite de tentativas. |
| `POST /api/familias/:id/arquivos?tipo=foto` | Envia UM arquivo (o corpo é o próprio arquivo). Só a dona. `tipo`: foto; opcionais `largura`, `altura`, `nome`. |
| `PUT /api/arquivos/:id/miniatura` | Corpo = JPEG pequeno (a tela gera). Só a dona. |
| `GET /api/arquivos/:id` (`?mini=1`) | Entrega o arquivo (ou a miniatura) para quem pode ver alguma memória que usa ele. |
| `DELETE /api/arquivos/:id` | Descarta um envio que não entrou em nenhuma memória. Em uso: 409. |
| `GET /api/familias/:id/linha` | Linha da vida: memórias confirmadas na ordem em que aconteceram, em páginas (`?limite=30&depois=<proxima>`). Filtros: `tipo`, `ano`, `decada`, `de`, `ate`, `etiqueta` (pode repetir), `pessoa`. |

**Apagar a conta (LGPD).** Com o pedido, a conta fica marcada (`usuario.apagar_em`) e não entra mais: no login, a
tela mostra a data e oferece desistir. Nesses 30 dias, quem entrou na família dela continua vendo o acervo, mas o
código não aceita ninguém novo. Vencido o prazo, o servidor (ao ligar e a cada hora) apaga a conta, as famílias em
que ela é dona e tudo dentro delas, numa transação por conta. Nas famílias de outras pessoas, ela continua na árvore,
sem conta. As regras estão em `servicos/apagarConta.js`; a ordem de apagar, em `dados/apagarConta.js`. Os arquivos (fotos) saem do banco e do armazenamento.

O cadastro (`POST /api/auth/cadastro`) aceita `codigo` opcional: cria a conta, o acervo dela **e** entra na
família do código. Código errado ou família cheia: nada é criado.

Família, papel e conta vinculada **nunca** vêm do corpo da requisição: campo desconhecido responde 400.

Só dois tipos de memória: `foto` e `album` (receita, música, vídeo e conselho saíram na migração 005, e o áudio
na 006, a pedido da mentoria). Cada item da memória é uma foto. Toda memória aceita `pessoas: ["Nome", ...]`, gravadas em `memoria_pessoa.nome_livre`.

A data da memória, de cada foto e o nascimento/falecimento da pessoa ficam em colunas da própria tabela
(`data_*`, `nasc_*`, `fal_*`; ver `servicos/datas.js`). Não existe mais a tabela `data_flexivel`.

### Arquivos (fotos)

- **Onde ficam:** no armazenamento que a tabela `configuracao` escolhe (`armazenamento` = `local` ou `s3`):
  - `local`: pasta do disco (`ARQUIVOS_PASTA` no `.env.local`; vazio = `armazenamento/` do projeto, fora do git). Nunca em `public/`.
  - `s3`: bucket privado (`s3_bucket`, `s3_regiao`, `s3_endereco` na tabela). As chaves de acesso vêm do ambiente
    (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` ou o papel IAM), **nunca** do banco.
  Tudo o que mexe no armazenamento está em `server/armazenamento.js`: as duas versões têm as mesmas funções
  (`gravar`, `apagar`, `entregar`, `listar`). Os testes usam a local; `testes/armazenamento-s3.test.js` testa a S3
  com um S3 de mentira.
- **No banco:** `arquivo` guarda só os dados (acervo, tipo conferido, tamanho, largura/altura) e onde está:
  `subpasta` (`familias/<id do acervo>`) + `nome_arquivo` (aleatório) + `nome_miniatura` (na mesma subpasta).
  Nunca uma URL. Esses nomes nunca saem da API: o arquivo só sai por `GET /api/arquivos/:id`.
- **Formatos (conferidos pelo conteúdo, não pelo nome):** foto JPEG, PNG, WebP, GIF ·
  miniatura só JPEG. (A tela já converte as fotos do iPhone para JPEG.)
- **Limites:** foto 20 MB, miniatura 2 MB por arquivo; e o total do acervo não passa
  do espaço do plano da dona (`plano.armazenamento_gb`, só lido). Respostas: 413 `ARQUIVO_GRANDE`,
  415 `TIPO_NAO_ACEITO`, 400 `ARQUIVO_VAZIO`/`ENVIO_INCOMPLETO`, 507 `ESPACO_CHEIO`.
- **Quem vê um arquivo:** a dona do acervo; e quem pode ver alguma memória que usa ele (membro: só as confirmadas).
  Saber o número não basta (404). Usar numa memória um arquivo de outro acervo: 400.
- **Cache:** a resposta vai com `Cache-Control: private, no-cache` (o navegador confere com o servidor antes de
  reusar). Quem perde o acesso deixa de ver na próxima vez que a tela pedir. **Limite real:** uma foto que já estava
  aberta na tela, ou que a pessoa salvou no aparelho, continua com ela; isso nenhum servidor consegue desfazer.
- **Banco e armazenamento não são uma transação só.** O que existe: grava no armazenamento, depois no banco (se o
  banco falhar, apaga na hora); ao apagar, tira do banco e depois do armazenamento. A faxina (ao ligar e a cada hora)
  apaga envios nunca usados há mais de 24 h e arquivos guardados sem linha no banco há mais de 24 h.
- **Na memória:** `itens: [{ idArquivo, tipo, anexo, legenda, data, lugar, observacao, etiquetas, marcas: [{ nome, x, y }] }]`
  na ordem em que aparecem, e `capa: idArquivo`. Na edição, `itens` ou `capa` **omitidos** ficam como estão;
  `itens: []` tira todos; `capa: null` tira a capa. Fotos tiradas da memória e não usadas em mais nada são apagadas.
  O mesmo arquivo pode estar em mais de uma memória do mesmo acervo; ele só é apagado quando ninguém usa mais.
- **Edição ao mesmo tempo:** cada memória tem `versao`. A tela manda a versão que abriu; se mudou, responde
  409 `CONFLITO_EDICAO` (em vez de apagar a mudança de outra pessoa sem avisar). Sem `versao`, não confere.

### Linha da vida

- **De quem:** do acervo da família. Entram só as memórias **confirmadas** (rascunho não entra, nem para a dona).
  A regra de acesso vem antes de contar e de paginar: quem não é da família recebe 404, sem total.
- **Ordem:** pelo **começo** do que a pessoa lembra: dia exato → o dia; mês → o mês; ano → o ano; década → o
  primeiro ano; período → o ano em que começa. No mesmo ponto, o mais preciso primeiro (dia, mês, ano,
  "por volta de", período, década) e depois a ordem em que foram guardadas. Memória sem data própria usa a data
  mais antiga das fotos dela. Sem nenhuma data (ou "não sei", ou sem ano): grupo "Sem data", no fim.
- **Nada é inventado:** a chave de ordem é calculada na consulta e não é gravada nem mostrada; a data volta do
  jeito que foi contada. Cada memória vem com `semData` e `anoNaLinha` (o ano em que entra na linha).
- **A data da lembrança** (`data`) é diferente de quando foi guardada (`criadaEm`).
- **Páginas:** `proxima` é o ponto onde a página parou (grupo, chave, número): as seguintes não repetem nem pulam,
  mesmo com empates. Editar ou apagar muda a linha na próxima consulta.

## Tarefas para dividir

Cada tarefa: uma branch a partir da `julia`, com testes, e um pedido de revisão antes de juntar.

**Pessoa A (memórias)**
- ~~A1. Editar memória~~ (feito: `PUT /api/memorias/:id`, ligado em "Completar ou mudar").
- ~~A2. Apagar memória~~ (feito: `DELETE /api/memorias/:id`).
- A3. Ligar "quem aparece" às pessoas da árvore (`memoria_pessoa.id_pessoa`). Hoje vão só os nomes
  (`nome_livre`). A árvore já está no servidor (B1), então pode começar.
- A4. Comentários e reações. *Depende da decisão D2.*
- ~~A5. Envio de arquivos~~ (feito: fotos no servidor, ligados às memórias; linha da vida no servidor).

**Pessoa B (família e conta)**
- ~~B1. Pessoas da árvore~~ (feito, ligado na área Família).
- ~~B2. Laços de parentesco~~ (feito).
- ~~B3. Perfil e ajustes~~ (feito: perfil na pessoa dona, ajustes na conta; a foto ainda fica no aparelho).
- ~~B4. Convites~~ (feito: código fixo da família, ligado na tela de cadastro e na área Família).
- B5. Compartilhamento. *Depende de D2.*

Pode começar já: **A3**. O resto depende de decisões do grupo (abaixo).

## Decisões do grupo

Decididas (convite da família):
- **Código fixo da família.** A dona gera um código (ex.: `MV-7K3P-Q9XD`) e quem tiver o código entra.
  Trocar invalida o antigo na hora; dá para desligar.
- **D1 (em parte).** Quem entra pelo código **vê** as memórias e a árvore e cuida **só do próprio perfil**.
  Não guarda, não muda e não apaga memórias; não mexe na árvore. Rascunhos da dona: só ela vê.
  (O papel "ajudante" com poderes a mais continua sem regra.)
- **D3.** Vale o limite de membros do plano da dona (`plano.limite_membros`; a dona conta).
  Grátis, Individual = 1 (ninguém entra); Família = 5; Família Ampliada = 10.
- **Planos (simulação).** O plano é escolhido no cadastro ou trocado na aba Planos, sem pagamento. Os limites que o
  servidor aplica são espaço e pessoas, sempre pelo plano da dona (as mensagens ficam em `servicos/planos.js`).
  Plano menor do que o uso: a troca acontece, nada é apagado e ninguém sai; só novos envios e convites ficam parados.
  "Conversas guiadas" e os itens `em_breve` são só informação (ainda não existem no app).
- **Acervo próprio.** Quem cria a conta com código ganha o acervo dela **e** entra na família que convidou.

Pendentes:
- **D2.** Quem recebe uma memória compartilhada pode comentar, reagir ou enviar memórias?
- **D4.** O plano Grátis conta como assinante para o feed?
- **D5.** O que fazer com a conta de demonstração da Maria?

Laço, marcação, compartilhamento e plano **não** dão acesso. Os testes de `memorias.test.js` e
`convites.test.js` garantem isso; se um deles quebrar, é sinal de que alguém abriu acesso sem querer.

## Regras do grupo

- Não mexa em `000_base.sql`, em `config.js`, em `middleware/sessao.js` nem em `erros.js` sem combinar.
- SQL só em `dados/`, sempre com `?`.
- Toda rota protegida usa `exigirLogin` **e** checa o acesso no serviço.
- Não registre no log senhas, códigos de sessão, e-mails nem o conteúdo das memórias.
- Nada de cobrança real, upload ou IA sem aprovação.
- `npm test` passando antes de pedir revisão.

## Lista para revisar uma entrega

- [ ] Tem teste para o caminho certo **e** para quem não pode (outra conta → 404, sem login → 401)?
- [ ] O dado de entrada passa pela `validacao/`?
- [ ] O SQL usa `?` e está em `dados/`?
- [ ] Gravações com mais de uma tabela estão em `emTransacao`?
- [ ] A resposta não traz senha, hash ou dado de outra família?
- [ ] Mudou o banco? Nova migração + `schema.sql` + CSV atualizados?
- [ ] `npm test` passa?
