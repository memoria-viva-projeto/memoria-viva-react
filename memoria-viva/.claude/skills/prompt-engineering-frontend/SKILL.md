---
name: prompt-engineering-frontend
description: Transforma ideias, esboços de código e imagens em requisitos técnicos e prompts completos para implementação front-end. Use quando o pedido estiver vago ou antes de delegar a outra IA.
---

# Skill 04 · Prompt Engineering for Front-end

## 1. Objetivo
Converter "quero algo assim" em instruções que outra IA (ou pessoa) consegue executar sem adivinhar.

## 2. Quando usar
- O pedido tem menos de duas frases ou usa palavras vagas ("bonito", "moderno").
- Há código-esboço ou imagens que precisam virar especificação.
- Antes de mandar uma tarefa para a IA de implementação.

## 3. Comportamento do agente
- Separe o que foi dito do que você está supondo. Marque suposições.
- Traduza adjetivos em decisões verificáveis ("moderno" → tipografia X, grid Y, espaçamento Z).
- Faça no máximo 3 perguntas, só as que mudam o resultado.

## 4. Processo (estrutura do prompt)
1. Contexto do projeto
2. Objetivo da tarefa
3. Tecnologias
4. Arquivos envolvidos (e os que NÃO podem mudar)
5. Comportamento esperado (passo a passo de interação)
6. Referências visuais (o que pegar de cada uma)
7. Regras de identidade (tokens, fontes, tom)
8. Restrições técnicas
9. Critérios de qualidade
10. Formato da entrega

## 5. Boas práticas
- Um prompt = uma tarefa. Tarefas grandes viram uma sequência.
- Cole o código atual relevante em vez de descrevê-lo.
- Diga o que não mudar.
- Peça para a IA listar o plano antes de codar em tarefas maiores.
- Peça a entrega com arquivos alterados e como testar.

## 6. Evite
- "Faça uma tela bonita de login."
- Misturar 5 pedidos num prompt.
- Mandar imagem sem dizer o que observar nela.
- Pedir "melhore o código" sem critério.

## 7. Concluído quando
- [ ] Os 10 blocos foram preenchidos ou marcados como "não se aplica".
- [ ] Não há adjetivos sem tradução técnica.
- [ ] Existe critério claro de "pronto".

## 8. Exemplo
Ruim: "Faz um card de memória bonito."
Bom: "No projeto Memória Viva (React + CSS Modules), crie `MemoryCard` em
`features/memorias/components/`. Props: `photo`, `title`, `date`, `place`, `author`.
Visual: foto com moldura Papel de 8px e fita adesiva Gema no topo; data em Montserrat 600 12px
caixa alta Urucum-600; título Montserrat 800 16px Anil. Use tokens de `styles/tokens.css`.
Não altere `MemoryList`. Entregue o componente, um exemplo de uso e como testar."
