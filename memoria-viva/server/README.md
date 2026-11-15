# Backend do Memória Viva · guia do grupo

Node + Express + MySQL 8. Este guia explica como o servidor funciona e como cada pessoa do grupo
pode trabalhar nele sem quebrar o que já existe.

## Como rodar (PowerShell, na pasta `memoria-viva`)

```
npm install          # uma vez
npm run db:local     # deixa aberto: MySQL do projeto na porta 3307 (sem mexer no MySQL80)
npm run db:migrar    # em outro terminal: cria/atualiza as tabelas
npm run api          # servidor na porta 3001
npm run dev          # o site; /api é repassado para o servidor
npm test             # testes (usa o banco memoria_viva_teste, nunca o de verdade)
```

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
3. **Acesso:** toda rota protegida checa no servidor quem pode. Hoje a regra é: **só a dona** da família
   (`pessoa.papel = 'dona'`, não removida) vê e guarda memórias. Quem não pode recebe **404**, igual a
   algo que não existe, para ninguém descobrir o que existe tentando números.
4. **Migrações:** nunca edite um arquivo de `db/migracoes/` que já foi aplicado (o `000_base.sql` nunca).
   Para mudar o banco, crie o próximo número (`002_...sql`) e rode `npm run db:migrar`.
   Atualize também `db/schema.sql` e `db/banco-memoria-viva.csv`. Nada de `DROP` ou `TRUNCATE`.

## O que já existe

| Endereço | O que faz |
|---|---|
| `GET /api/saude` | Servidor e banco estão de pé? |
| `POST /api/auth/cadastro` | Cria conta (plano Gratuito), família e a pessoa dona. Já entra. |
| `POST /api/auth/entrar` | Entra. Limite de tentativas. |
| `GET /api/auth/sessao` | Quem está logado. |
| `POST /api/auth/sair` | Sai. |
| `POST /api/familias/:id/memorias` | Guarda memória (foto, álbum, receita, música, vídeo, conselho). |
| `GET /api/familias/:id/memorias` | Lista o acervo (`?limite=50&antesDe=<id>`). |
| `GET /api/memorias/:id` | Abre uma memória. |

## Tarefas para dividir

Cada tarefa: uma branch a partir da `julia`, com testes, e um pedido de revisão antes de juntar.

**Pessoa A (memórias)**
- A1. Editar memória (`PATCH /api/memorias/:id`).
- A2. Apagar memória (`DELETE /api/memorias/:id`).
- A3. Pessoas que aparecem na memória (`memoria_pessoa`).
- A4. Comentários e reações. *Depende da decisão D2.*
- A5. Envio de arquivos. *Só quando o grupo aprovar.*

**Pessoa B (família e conta)**
- B1. Pessoas da árvore (criar, editar, tirar da árvore).
- B2. Laços de parentesco.
- B3. Ajustes de acessibilidade (`PATCH` do usuário, coluna `ajustes`).
- B4. Convites. *Depende de D1 e D3.*
- B5. Compartilhamento. *Depende de D2.*

Podem começar já: **A1, A2, B1 e B3**.

## Decisões do grupo (pendentes)

- **D1.** O que a ajudante pode fazer?
- **D2.** Quem recebe uma memória compartilhada pode comentar, reagir ou enviar memórias?
- **D3.** Quem são os membros dos planos Família e Família Plus?
- **D4.** O plano Gratuito conta como assinante para o feed?
- **D5.** O que fazer com a conta de demonstração da Maria?

Enquanto não forem decididas, **ninguém ganha acesso além da dona**. Os testes de `memorias.test.js`
garantem isso; se um deles quebrar, é sinal de que alguém abriu acesso sem querer.

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
