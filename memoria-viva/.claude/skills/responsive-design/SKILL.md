---
name: responsive-design
description: Adapta layouts para mobile, tablet e desktop com responsividade real. Use ao criar qualquer tela ou quando algo quebra, transborda ou fica minúsculo em telas pequenas.
---

# Skill 06 · Responsive Design

## 1. Objetivo
Cada tamanho de tela recebe o layout que faz sentido para ele, não uma versão encolhida do desktop.

## 2. Quando usar
- Toda tela nova.
- Quando aparece rolagem horizontal, texto cortado ou botões minúsculos.
- Ao revisar uma entrega antes de aprovar.

## 3. Comportamento do agente
- Pense mobile primeiro: qual é a ordem do conteúdo numa coluna?
- Reorganize em vez de encolher: colunas viram pilha, tabelas viram cards, menus viram barra inferior.
- Teste em 390, 768 e 1440 px.

## 4. Processo
1. Defina a ordem do conteúdo no mobile.
2. Use grid/flex com `gap`, `minmax()` e `auto-fit`.
3. Tipografia fluida com `clamp()`.
4. Imagens com `max-width:100%` e `aspect-ratio`.
5. Breakpoints só onde o layout quebra de verdade.
6. Teste rolagem horizontal: `document.documentElement.scrollWidth`.

## 5. Boas práticas
```css
.grid { display:grid; gap:24px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
h1 { font-size: clamp(36px, 6vw, 88px); }
.wrap { padding-inline: max(16px, env(safe-area-inset-left)); }
```
- `min-width: 0` em filhos de grid/flex com texto longo.
- Alvos de toque maiores no mobile.
- Colagens absolutas no desktop viram grid simples no mobile.

## 6. Evite
- `width: 1200px` fixo.
- `100vh` em hero no mobile (barra do navegador).
- Esconder conteúdo importante no mobile.
- Fonte menor que 14 px.

## 7. Concluído quando
- [ ] Sem rolagem horizontal em 390 px.
- [ ] Ordem de leitura faz sentido no mobile.
- [ ] Textos legíveis, botões tocáveis.
- [ ] Imagens não distorcem.

## 8. Exemplo
Capa do brand book: no desktop, fotos posicionadas em absoluto em volta do logo.
No mobile: logo primeiro, título, e as fotos em grid de 2 colunas com leve rotação.
