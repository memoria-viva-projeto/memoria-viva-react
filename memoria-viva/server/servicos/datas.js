// Datas "do jeito que a pessoa lembra", guardadas em colunas na própria tabela (migração 005):
//   memoria e item_memoria: data_modo, data_dia, data_mes, data_ano, data_ano_fim, data_aprox
//   pessoa: nasc_* (nascimento) e fal_* (falecimento)
// Formato da tela: { modo, dia, mes, ano, anoFim, decada, aprox }. Na década, a coluna _ano guarda o primeiro ano (1970).

/**
 * Linha do banco → data da tela. `p` é o prefixo das colunas (ex.: "data_", "nasc_", "fal_").
 */
export function dataDe(l, p = "") {
  const modo = l[`${p}modo`];
  if (!modo) return null;
  const decada = modo === "decada";
  return {
    modo,
    dia: l[`${p}dia`],
    mes: l[`${p}mes`],
    ano: decada ? null : l[`${p}ano`],
    anoFim: l[`${p}ano_fim`],
    decada: decada ? l[`${p}ano`] : null,
    aprox: Boolean(l[`${p}aprox`]),
  };
}

/** Nomes das 6 colunas de uma data com o prefixo (na ordem de valoresDaData). */
export const colunasDaData = (p) => ["modo", "dia", "mes", "ano", "ano_fim", "aprox"].map((c) => `${p}${c}`);

/** Data da tela (já validada) → valores das 6 colunas. Sem data: tudo vazio. */
export function valoresDaData(d) {
  if (!d) return [null, null, null, null, null, false];
  return [d.modo, d.dia, d.mes, d.modo === "decada" ? d.decada : d.ano, d.anoFim, d.aprox];
}
