// Regras dos dados de uma memória.
// A data segue o mesmo formato e as mesmas regras da tela (src/components/conta/campos.jsx):
// tudo é opcional, mas o que foi escrito precisa fazer sentido.
import { z } from "zod";

const anoAgora = () => new Date().getFullYear();
const MODOS = ["dia", "mes", "ano", "decada", "periodo", "naosei"];

// A tela guarda números como texto ("1975") e campo vazio como "": aceitamos os dois jeitos.
const numero = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v) : v),
  z.number({ error: "Use só números." }).int("Use só números inteiros.").nullable(),
);

/** Texto opcional: tira espaços das pontas; vazio vira null. */
export const texto = (max, nome = "Este campo") =>
  z
    .string({ error: `${nome} precisa ser um texto.` })
    .trim()
    .max(max, `${nome} pode ter até ${max} caracteres.`)
    .transform((v) => v || null)
    .nullish()
    .transform((v) => v ?? null);

const diasNoMes = (mes, ano) => new Date(Date.UTC(ano ?? 2000, mes, 0)).getUTCDate(); // sem ano: aceita 29/02

export const DataFlexivel = z
  .object({
    modo: z.enum(MODOS, { error: "Escolha como você lembra a data." }),
    dia: numero,
    mes: numero,
    ano: numero,
    anoFim: numero,
    decada: numero,
    aprox: z.boolean().optional().default(false),
  })
  .superRefine((d, ctx) => {
    const erro = (campo, message) => ctx.addIssue({ code: "custom", path: [campo], message });
    const fimAno = anoAgora();
    if (["dia", "mes", "ano", "periodo"].includes(d.modo) && d.ano != null && (d.ano < 1800 || d.ano > fimAno)) {
      erro("ano", `O ano precisa ficar entre 1800 e ${fimAno}.`);
    }
    if (d.modo === "dia" || d.modo === "mes") {
      if (d.mes != null && (d.mes < 1 || d.mes > 12)) erro("mes", "O mês vai de 1 a 12.");
    }
    if (d.modo === "dia" && d.dia != null) {
      if (d.mes == null) erro("dia", "Escolha também o mês, ou deixe o dia em branco.");
      else if (d.dia < 1 || d.dia > diasNoMes(d.mes, d.ano)) erro("dia", "Esse dia não existe nesse mês.");
    }
    if (d.modo === "periodo" && d.anoFim != null) {
      if (d.ano == null) erro("anoFim", "Escreva também o primeiro ano do período.");
      else if (d.anoFim < d.ano || d.anoFim > fimAno) erro("anoFim", "O segundo ano precisa ser depois do primeiro.");
    }
    if (d.modo === "decada" && d.decada != null && (d.decada % 10 !== 0 || d.decada < 1800 || d.decada > fimAno)) {
      erro("decada", "A década é um ano terminado em 0, como 1970.");
    }
  })
  // guarda só o que vale para o modo escolhido (como a tela faz ao trocar de modo)
  .transform((d) => ({
    modo: d.modo,
    dia: d.modo === "dia" ? d.dia : null,
    mes: ["dia", "mes"].includes(d.modo) ? d.mes : null,
    ano: ["dia", "mes", "ano", "periodo"].includes(d.modo) ? d.ano : null,
    anoFim: d.modo === "periodo" ? d.anoFim : null,
    decada: d.modo === "decada" ? d.decada : null,
    aprox: d.modo === "ano" ? d.aprox : false,
  }))
  // modo escolhido mas nada preenchido (e não é "não sei"): é como não ter data
  .transform((d) => (d.modo !== "naosei" && [d.dia, d.mes, d.ano, d.anoFim, d.decada].every((v) => v == null) ? null : d));

const textoLongo = (max, nome) => texto(max, nome);

const base = {
  titulo: texto(150, "O título"),
  descricao: textoLongo(50000, "A história"),
  data: DataFlexivel.nullish().transform((v) => v ?? null),
  lugar: texto(150, "O lugar"),
  // a dona conta e já vale ("confirmada"), ou deixa para terminar depois ("rascunho").
  // "aguardando" é para o que a família manda: ainda não existe nesta etapa.
  status: z.enum(["rascunho", "confirmada"], { error: "Situação inválida." }).default("confirmada"),
  etiquetas: z
    .array(z.string().trim().min(1).max(40, "Cada etiqueta pode ter até 40 caracteres."), { error: "Etiquetas precisam ser uma lista." })
    .max(20, "Use até 20 etiquetas.")
    .default([])
    .transform((l) => [...new Set(l)]),
  // quem aparece, pelo nome (a família ainda fica no navegador; ligar às pessoas da árvore vem depois)
  pessoas: z
    .array(z.string().trim().min(1, "Nome vazio.").max(80, "Cada nome pode ter até 80 caracteres."), { error: "Pessoas precisam ser uma lista." })
    .max(30, "Marque até 30 pessoas.")
    .default([])
    .transform((l) => [...new Set(l)]),
};

const Receita = z
  .object({
    quemFazia: texto(120, "Quem fazia"),
    ocasioes: texto(255, "As ocasiões"),
    preparo: textoLongo(50000, "O modo de preparo"),
    segredos: textoLongo(20000, "Os segredos"),
    ingredientes: z
      .array(z.string().trim().min(1, "Ingrediente vazio.").max(200, "Cada ingrediente pode ter até 200 caracteres."))
      .max(100, "Use até 100 ingredientes.")
      .default([]),
  })
  .prefault({}); // prefault (e não default): sem detalhes, valida {} e preenche cada campo com o vazio certo

const Musica = z
  .object({
    artista: texto(120, "O artista"),
    porque: textoLongo(20000, "O porquê"),
    lembranca: textoLongo(20000, "A lembrança"),
    quemOuvia: texto(120, "Quem ouvia"),
    momento: texto(150, "O momento"),
    // a música escolhida no YouTube (só o código do vídeo, o nome e o canal; nada é baixado)
    youtube: z
      .object({
        id: z.string({ error: "Código do YouTube inválido." }).regex(/^[A-Za-z0-9_-]{6,20}$/, "Código do YouTube inválido."),
        titulo: texto(200, "O nome do vídeo"),
        canal: texto(120, "O canal"),
      })
      .nullish()
      .transform((v) => v ?? null),
  })
  .prefault({});

const Video = z.object({ contexto: textoLongo(20000, "O contexto") }).prefault({});

const Conselho = z.object(
  {
    frase: z
      .string({ error: "Escreva o conselho." })
      .trim()
      .min(1, "Escreva o conselho.")
      .max(5000, "O conselho pode ter até 5000 caracteres."),
    guardadoPara: texto(120, "Para quem"),
  },
  { error: "Escreva o conselho." },
);

const tipo = (nome, detalhes) =>
  z.object({ tipo: z.literal(nome), ...base, ...(detalhes ? { detalhes } : {}) });

export const NovaMemoria = z.discriminatedUnion(
  "tipo",
  [tipo("foto"), tipo("album"), tipo("receita", Receita), tipo("musica", Musica), tipo("video", Video), tipo("conselho", Conselho)],
  { error: "Escolha o tipo: foto, album, musica, receita, video ou conselho." },
);

/** Número de id vindo da URL. Inválido = não encontrado (não diz nada sobre o que existe). */
export const Id = z.coerce.number().int().positive().max(2147483647);

export const Lista = z.object({
  limite: z.coerce.number().int().min(1).max(100).default(50),
  antesDe: z.coerce.number().int().positive().optional(),
});
