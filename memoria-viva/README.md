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
| Fotos | `public/img/` |
| Logo usada no site | `public/marca/` (favicons na raiz de `public/`) |
| Kit completo da marca | `design/marca/` (não vai para o site) |

## Com IA
`CLAUDE.md` tem as regras e a identidade; a IA lê sozinha (Claude Code) ou você cola no chat.
As Skills ficam em `.claude/skills/`.

## Publicar
`npm run build` gera a pasta `dist/`, que pode ir para Vercel, Netlify ou GitHub Pages.
