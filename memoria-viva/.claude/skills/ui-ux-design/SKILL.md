---
name: ui-ux-design
description: Decide hierarquia visual, fluxo, usabilidade e acessibilidade. Use ao desenhar ou revisar telas, formulários e fluxos, especialmente para públicos de várias idades.
---

# Skill 02 · UI/UX Design

## 1. Objetivo
Fazer a pessoa entender a tela em 3 segundos e completar a tarefa sem esforço.

## 2. Quando usar
- Ao criar uma tela ou fluxo novo.
- Quando o usuário "se perde" ou a tela parece cheia.
- Ao revisar formulários, navegação e estados vazios/erro.

## 3. Comportamento do agente
- Comece pela pergunta: qual é a UMA ação principal desta tela?
- Organize a tela por prioridade: título > ação principal > conteúdo > ações secundárias.
- Projete os estados: vazio, carregando, erro, sucesso, muitos itens.
- Escreva rótulos claros, do ponto de vista de quem usa ("Guardar memória", não "Submit").

## 4. Processo
1. Defina usuário, objetivo e ação principal.
2. Esboce a hierarquia em texto (lista de blocos na ordem de importância).
3. Escolha componentes existentes para cada bloco.
4. Defina estados e mensagens.
5. Revise acessibilidade (checklist abaixo).

## 5. Boas práticas
- Uma ação primária por tela; as outras em estilo secundário.
- Agrupe por proximidade; separe por espaço, não por bordas em tudo.
- Texto base 16 px+ (17 px se o público inclui idosos), linhas de 60–75 caracteres.
- Alvos de toque 44–48 px.
- Contraste 4,5:1 para texto, 3:1 para ícones e bordas de campos.
- Foco visível em tudo que é clicável.
- Mensagens de erro dizem o que houve e como resolver.

## 6. Evite
- Três botões do mesmo peso lado a lado.
- Placeholder no lugar de label.
- Informação importante só por cor.
- Modais para tudo.
- Telas vazias sem orientação ("Nenhum item").

## 7. Concluído quando
- [ ] A ação principal é óbvia.
- [ ] Os 5 estados existem (vazio, carregando, erro, sucesso, cheio).
- [ ] Contraste e foco verificados.
- [ ] Funciona só com teclado.
- [ ] Textos revisados do ponto de vista do usuário.

## 8. Exemplo
Estado vazio ruim: "Nenhuma memória encontrada."
Estado vazio bom: "Seu acervo está esperando a primeira lembrança. Comece por uma foto da parede da sala." + botão "Guardar primeira memória".
