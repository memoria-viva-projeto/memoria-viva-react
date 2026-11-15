# Memória Viva · site

## Rodar
Precisa do [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```
Abra o endereço que aparecer (normalmente http://localhost:5173).

## Onde mexer
| Quero mudar... | Arquivo |
|---|---|
| A ordem das seções | `src/App.jsx` |
| Uma seção | `src/components/NomeDaSecao.jsx` |
| Cores, fontes, espaçamentos | `src/styles.css` |
| Fotos e logo | `public/img/` |

## Servidor (API) e banco
Precisa do MySQL 8 instalado. Se você não sabe a senha do MySQL da máquina, use o MySQL do projeto:
`npm run db:local` liga um MySQL só deste projeto na porta 3307, sem senha (no `.env.local`: `DB_HOST=127.0.0.1`,
`DB_PORTA=3307`, `DB_SENHA=` vazio). Deixe esse terminal aberto enquanto usa; Ctrl+C desliga.

Comandos para o PowerShell, na pasta do projeto:

```powershell
npm install
Copy-Item .env.example .env.local   # depois abra o .env.local e preencha DB_USUARIO e DB_SENHA (ou use o db:local)
npm run db:verificar                # só olha o banco e diz o que encontrou; não muda nada
npm run db:migrar                   # cria o banco (se faltar) e aplica as migrações pendentes
npm run api                         # servidor em http://localhost:3001 (deixe este terminal aberto)
npm run dev                         # em OUTRO terminal: o site, que repassa /api para o servidor
npm test                            # testes (usam o banco memoria_viva_teste, que é recriado a cada vez)
```

Se o `db:verificar` disser que o banco foi criado à mão com o esquema base, rode `npm run db:marcar-base` antes do `db:migrar`.
Nada disso apaga dados do banco `memoria_viva`.

| Quero mudar... | Arquivo |
|---|---|
| Uma rota da API | `server/rotas/` |
| Uma regra (cadastro, login...) | `server/servicos/` |
| Uma consulta SQL | `server/dados/` |
| A estrutura do banco | nova migração em `db/migracoes/` (e atualize `db/schema.sql` e o CSV) |

## Com IA
`CLAUDE.md` tem as regras e a identidade; a IA lê sozinha (Claude Code) ou você cola no chat.
As Skills ficam em `.claude/skills/`.

## Publicar
`npm run build` gera a pasta `dist/`, que pode ir para Vercel, Netlify ou GitHub Pages.
