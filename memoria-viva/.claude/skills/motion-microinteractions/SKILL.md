---
name: motion-microinteractions
description: Adiciona animações e microinterações com propósito (entrada, feedback, estado). Use quando a interface precisa parecer viva ou quando uma ação não dá retorno ao usuário.
---

# Skill 10 · Motion & Microinterações

## 1. Objetivo
Movimento que explica, dá retorno e cria atmosfera, sem distrair nem pesar.

## 2. Quando usar
- Feedback de ação (clique, salvar, erro).
- Entrada de página ou de conteúdo novo.
- Momentos de marca (hero, estado vazio, sucesso).

## 3. Comportamento do agente
- Para cada animação, diga a função: orientar, confirmar, encantar.
- Um momento orquestrado vale mais que dez efeitos espalhados.
- Sempre respeite `prefers-reduced-motion`.

## 4. Processo
1. Liste momentos candidatos.
2. Escolha 1 momento principal + feedbacks essenciais.
3. Defina duração (150–300 ms para UI, até 900 ms para entrada) e curva.
4. Anime só `transform` e `opacity`.
5. Teste com movimento reduzido.

## 5. Boas práticas
```css
.btn{ transition: transform .15s ease, box-shadow .15s ease; }
.btn:active{ transform: translateY(3px); }
@media (prefers-reduced-motion: reduce){
  *{ animation:none!important; transition:none!important; }
}
```
- Conteúdo visível mesmo antes da animação (nunca depender de JS para aparecer).
- Animações em loop: lentas e sutis, pausáveis.

## 6. Evite
- Tudo entrando com fade ao rolar.
- Animar `width`, `top`, `left` (pesado).
- Movimento que atrasa a tarefa.

## 7. Concluído quando
- [ ] Cada animação tem função descrita.
- [ ] Reduced motion respeitado.
- [ ] Sem travadas em celular comum.

## 8. Exemplo
Landing do Memória Viva: fotos "caem" na mesa ao abrir (momento principal), a palavra do
título troca (vó, mãe, tio), o painel de azulejos se monta peça por peça ao digitar o nome.
