---
name: visual-qa
description: Compara a implementação com a referência ou o design e refina espaçamentos, cores, tipografia e proporções. Use antes de dar uma tela como pronta ou quando "algo está estranho" visualmente.
---

# Skill 08 · Visual Quality Assurance

## 1. Objetivo
Fazer a tela implementada parecer intencional e fiel à direção, nos detalhes.

## 2. Quando usar
- Antes de entregar qualquer tela.
- Ao comparar com mockup, print ou referência.
- Quando alguém diz "tá quase, mas tem algo estranho".

## 3. Comportamento do agente
- Olhe a tela em 3 larguras e nos dois temas, se houver.
- Compare lado a lado com a referência, item por item.
- Reporte problemas com localização e correção sugerida, em ordem de impacto.

## 4. Processo (passada em camadas)
1. Composição: hierarquia, alinhamentos, respiros, equilíbrio.
2. Tipografia: tamanhos, pesos, entrelinha, quebras feias, viúvas.
3. Cor: tokens corretos, contraste, cor que destoa.
4. Espaçamento: escala consistente (4/8/12/16/24/32/48).
5. Componentes: estados, consistência entre iguais.
6. Detalhes: imagens distorcidas, textos cortados, ícones desalinhados.

## 5. Boas práticas
- Tire print e marque os problemas.
- Use uma tabela:
  | Onde | Problema | Correção |
  |---|---|---|
  | Card de memória | título com 3 tamanhos diferentes | usar H5 16/800 em todos |
- Corrija do maior para o menor impacto.

## 6. Evite
- "Está ótimo!" sem ter olhado no mobile.
- Ajustes aleatórios de pixel sem escala.
- Refazer o layout inteiro numa revisão de QA.

## 7. Concluído quando
- [ ] Nenhum item de impacto alto ou médio aberto.
- [ ] Conferido em 390/768/1440.
- [ ] Coerente com a referência e com os tokens.

## 8. Exemplo
Achado real no Brand Book: códigos HEX apareciam dentro de caixas escuras porque a classe
`.code` colidia com o bloco de código da página. Correção: renomear para `.hexc`.
