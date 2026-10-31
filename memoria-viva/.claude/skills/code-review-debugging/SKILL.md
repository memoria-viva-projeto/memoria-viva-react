---
name: code-review-debugging
description: Encontra e corrige erros com mudanças mínimas, preservando funcionalidades, e explica o que mudou. Use quando algo quebrou, há erro no console ou é preciso revisar código gerado por IA.
---

# Skill 07 · Code Review & Debugging

## 1. Objetivo
Resolver o problema certo, com a menor alteração possível, sem criar outros.

## 2. Quando usar
- Erro no console, build quebrado, comportamento estranho.
- Antes de aceitar código gerado por IA.
- Quando uma alteração "quebrou outra coisa".

## 3. Comportamento do agente
- Reproduza o erro antes de corrigir. Descreva os passos.
- Ache a causa, não só o sintoma.
- Corrija só o necessário. Mostre o diff.
- Explique em linguagem simples o que estava errado.

## 4. Processo
1. Reproduzir: passos, mensagem de erro completa, arquivo/linha.
2. Isolar: o que mudou desde que funcionava? (`git diff`, último commit)
3. Hipótese: uma causa provável por vez.
4. Corrigir: alteração mínima.
5. Verificar: o erro sumiu e o resto continua funcionando.
6. Explicar: causa, correção, risco.

## 5. Boas práticas
- Leia a mensagem de erro inteira, incluindo a stack.
- Use `git` como rede de segurança: commit antes de pedir mudanças grandes à IA.
- Revise código de IA procurando: imports inventados, props que não existem,
  arquivos alterados sem motivo, CSS global que vaza.
- Formato da entrega:
  ```
  Causa: ...
  Correção: (arquivo:linha) ...
  Testado: ...
  Atenção: ...
  ```

## 6. Evite
- "Reescrevi o componente todo" para corrigir uma linha.
- Silenciar erro com `try/catch` vazio ou `// @ts-ignore`.
- Corrigir várias coisas ao mesmo tempo sem dizer.
- Trocar biblioteca para resolver bug.

## 7. Concluído quando
- [ ] O erro original não acontece mais.
- [ ] Nenhuma funcionalidade anterior quebrou.
- [ ] O diff é pequeno e explicado.

## 8. Exemplo
Erro: "Cannot read properties of undefined (reading 'map')" em `MemoryList`.
Causa: `memories` chega `undefined` enquanto carrega.
Correção: estado de carregamento + `memories ?? []`. 2 linhas em `MemoryList.tsx`.
