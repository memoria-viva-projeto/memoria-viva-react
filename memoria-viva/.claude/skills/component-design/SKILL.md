---
name: component-design
description: Cria e padroniza componentes reutilizáveis (botões, cards, formulários, menus, modais) com estados e interações. Use ao criar um componente novo ou quando componentes parecidos estão inconsistentes.
---

# Skill 05 · Component Design

## 1. Objetivo
Ter poucos componentes, bem feitos, que cobrem muitos casos e se parecem entre si.

## 2. Quando usar
- Criar botão, card, input, select, menu, modal, toast, tabs.
- Quando existem duas versões quase iguais de algo.
- Ao documentar a biblioteca de componentes.

## 3. Comportamento do agente
- Antes de criar, procure se já existe algo parecido.
- Defina a API (props) antes do visual.
- Cubra todos os estados: padrão, hover, foco, ativo, desabilitado, carregando, erro.
- Use variantes (`variant="primary|secondary|ghost"`), não componentes duplicados.

## 4. Processo
1. Inventário: o que já existe e onde é usado.
2. API: props mínimas, nomes claros, valores padrão.
3. Estrutura HTML semântica (`button`, `label`, `dialog`).
4. Estilo com tokens.
5. Estados e acessibilidade (aria, foco, teclado).
6. Exemplo de uso para cada variante.

## 5. Boas práticas
```tsx
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
```
- Mesmo raio, altura e tipografia em todos os controles do mesmo tamanho.
- Modal: foco preso dentro, ESC fecha, foco volta ao botão de origem.
- Formulário: label sempre visível, erro abaixo do campo, `aria-describedby`.
- Card clicável: a área toda é um link, não só o título.

## 6. Evite
- `Button`, `Btn`, `PrimaryButton` coexistindo.
- Props booleanas demais (`isBig isRed isRounded`).
- Estados só com cor.
- `div` com `onClick` no lugar de `button`.

## 7. Concluído quando
- [ ] Todos os estados existem e são visíveis.
- [ ] Funciona com teclado e leitor de tela.
- [ ] Usa só tokens (nenhuma cor solta).
- [ ] Tem exemplo de uso.

## 8. Exemplo
Pedido: "Os botões estão diferentes em cada tela."
Ação: inventariar 6 variações → reduzir para `primary`, `secondary`, `ghost` em 2 tamanhos →
trocar usos tela a tela → listar arquivos alterados.
