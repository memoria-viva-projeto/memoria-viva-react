# Memória Viva · instruções para a IA

## O projeto
Site do Memória Viva: plataforma para guardar fotos, receitas, músicas e histórias de família.
A IA do produto organiza e responde perguntas mostrando a fonte; a família confirma.
Público: 17 a 80+ anos. Personas: Helena (avó), Marta (mãe), Clara (filha).

## Stack
React 18 + Vite. CSS puro em `src/styles.css`. Sem outras bibliotecas.
```
src/App.jsx            ordem das seções
src/components/        uma seção por arquivo (Hero, Pelicula, ComoFunciona, Numero, Comecar, Rodape)
src/azulejaria.js      gerador dos azulejos
src/styles.css         tokens (:root) + todos os estilos
public/img/            fotos e logo
```

## Identidade (siga sempre)
- Cores só pelas variáveis do `:root` em styles.css. Urucum = marca, Gema = alegria,
  Anil = texto forte e fundos escuros, Turquesa = tudo que é IA, Papel = fundo.
- Botão principal: classe `btn btn-p`. Secundário: `btn btn-s`.
- Fontes: Montserrat (títulos), Open Sans (texto), Nanum Pen Script (classe `mao`, só notas curtas).
- Fotos no estilo álbum: classe `foto` (+ `leg` com legenda, + `cant` cantoneiras) e fita `tape t-gema`.
- Logo: sempre `/img/logo.png` ou `/img/logo-h.png`. Nunca redesenhar ou recolorir.
- Um gesto visual forte por seção; o resto calmo. Nada de gradiente roxo, emoji, sépia triste.

## Regras de trabalho
- Antes de mudar, mostre o plano e espere aprovação.
- Altere só os arquivos necessários e liste-os no final.
- Não invente seções, textos ou funções que não foram pedidos.
- Reaproveite as classes que já existem antes de criar novas.
- Teste em 390 px, 768 px e 1440 px. Respeite `prefers-reduced-motion`.
- Não mexa no Hero e na Película sem pedido explícito: estão aprovados.

## Skills
Ficam em `.claude/skills/`. As mais úteis aqui: creative-art-direction, component-design,
responsive-design, visual-qa, motion-microinteractions, code-review-debugging.
