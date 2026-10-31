---
name: design-tokens
description: Mantém cores, tipografia, espaçamentos, raios e sombras consistentes através de tokens. Use ao iniciar um projeto, ao aplicar uma identidade visual ou quando aparecerem valores soltos no CSS.
---

# Skill 09 · Design Tokens & Consistência

## 1. Objetivo
Toda decisão visual sai de um único lugar. Mudar a marca = mudar um arquivo.

## 2. Quando usar
- Ao receber um guia de identidade visual.
- Quando o código tem `#D35400` espalhado em 30 lugares.
- Antes de criar modo escuro.

## 3. Comportamento do agente
- Procure o arquivo de tokens antes de escrever estilo.
- Nunca use cor, fonte ou espaçamento literal se existe token.
- Se falta um token, proponha criar, com nome semântico.

## 4. Processo
1. Tokens base (paleta): `--mv-urucum-600: #B64A02`.
2. Tokens de papel (semânticos): `--mv-action: var(--mv-urucum-600)`.
3. Componentes usam só tokens de papel.
4. Tema escuro redefine só os tokens de papel.

## 5. Boas práticas
```css
:root{
  --mv-papel:#F9F7F1; --mv-cafe:#2A1E17; --mv-urucum-600:#B64A02;
  --mv-bg:var(--mv-papel); --mv-text:var(--mv-cafe); --mv-action:var(--mv-urucum-600);
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
  --radius-btn:14px; --radius-card:18px;
}
.btn-primary{ background:var(--mv-action); }
```
- Nomeie pelo papel (`--action`), não pela aparência (`--orange`) na camada de uso.
- Escala de espaçamento fixa.

## 6. Evite
- Cores parecidas mas diferentes (`#D35400`, `#D45500`).
- Tokens com nome de valor (`--sixteen`).
- Criar token para uso único.

## 7. Concluído quando
- [ ] Busca por `#` em CSS de componentes não encontra cores soltas.
- [ ] Componentes usam tokens de papel.
- [ ] Trocar um token muda o produto todo de forma previsível.

## 8. Exemplo
Pedido: "Aplicar a identidade do Memória Viva."
Ação: importar `tokens.css` do kit, mapear `--mv-action`, `--mv-link`, `--mv-ai`,
substituir valores soltos componente a componente, listar os arquivos alterados.
