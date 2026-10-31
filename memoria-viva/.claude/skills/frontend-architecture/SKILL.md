---
name: frontend-architecture
description: Organiza projetos front-end. Use ao criar features, pastas ou componentes novos, ao separar responsabilidades ou quando o código está difícil de manter.
---

# Skill 01 · Front-end Architecture

## 1. Objetivo
Manter o projeto fácil de entender, mudar e crescer. Cada arquivo tem um motivo claro para existir.

## 2. Quando usar
- Ao iniciar uma feature nova ou uma tela nova.
- Quando um componente passou de ~200 linhas ou faz coisas demais.
- Quando a mesma lógica aparece copiada em dois lugares.
- Antes de instalar uma biblioteca nova.

## 3. Comportamento do agente
- Primeiro mapeie a estrutura atual e siga o padrão que já existe, mesmo que não seja o seu favorito.
- Proponha a estrutura antes de criar muitos arquivos de uma vez.
- Prefira composição (componentes pequenos que se encaixam) a componentes gigantes com muitas props.
- Separe: o que é visual (UI), o que é estado/lógica (hooks, stores), o que é dado (services/api).

## 4. Processo
1. Liste pastas e arquivos relevantes (`tree -L 3 src`).
2. Identifique o padrão: por tipo (`components/`, `hooks/`) ou por feature (`features/memorias/`).
3. Desenhe onde o novo código entra e o que será reaproveitado.
4. Crie os arquivos mínimos. Exporte pelo índice da pasta se o projeto já faz assim.
5. Verifique imports, nomes e se nada ficou duplicado.

## 5. Boas práticas
- Estrutura por feature para projetos que crescem:
  ```
  src/
    app/            # rotas, layout raiz
    features/
      memorias/
        components/ MemoryCard.tsx, MemoryList.tsx
        hooks/      useMemories.ts
        api/        memories.ts
    components/ui/  # Button, Input, Card (genéricos)
    styles/         # tokens.css, globals.css
    lib/            # utilidades
  ```
- Nomes que dizem o que é: `MemoryCard`, não `Card2`.
- Componentes de UI genéricos não conhecem regras de negócio.
- Tokens de design num arquivo só (`styles/tokens.css`).
- Uma responsabilidade por arquivo.

## 6. Evite
- Criar pastas novas paralelas às que já existem (`components/` e `Components/`).
- Instalar biblioteca para algo que 10 linhas resolvem.
- Lógica de fetch dentro de componentes visuais.
- Arquivos `utils.ts` com 40 funções sem relação.
- Refatorar o projeto inteiro sem ninguém pedir.

## 7. Concluído quando
- [ ] O novo código segue o padrão de pastas existente.
- [ ] Nada duplicado; o que pôde ser reaproveitado foi.
- [ ] Nenhum import quebrado; o projeto compila.
- [ ] A estrutura foi explicada em 2 a 4 linhas na entrega.

## 8. Exemplo
Pedido: "Adicionar a tela de receitas da família."
Resposta esperada do agente:
> O projeto organiza por feature (`features/memorias`). Vou criar `features/receitas/` com
> `RecipeCard.tsx`, `RecipeList.tsx` e `api/recipes.ts`. Vou reaproveitar `components/ui/Card`
> e `Button`. Nenhuma lib nova. Posso seguir?
