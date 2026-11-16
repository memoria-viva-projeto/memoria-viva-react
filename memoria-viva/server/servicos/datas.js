// Datas flexíveis (tabela data_flexivel) no formato da tela: { modo, dia, mes, ano, anoFim, decada, aprox }.

/**
 * Linha do banco → data da tela. `p` é o prefixo das colunas na consulta
 * (ex.: "nasc_" quando a mesma consulta traz o nascimento e o falecimento).
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
