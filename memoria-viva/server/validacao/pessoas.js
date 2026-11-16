// Regras dos dados de uma pessoa da árvore e de um parentesco (laço).
// O cliente NUNCA escolhe família, papel (dona/ajudante/familiar) nem conta vinculada:
// isso vem da rota e da sessão. Campo desconhecido no corpo = 400 (.strict()).
import { z } from "zod";
import { DataFlexivel, texto } from "./memorias.js";

const data = DataFlexivel.nullish().transform((v) => v ?? null);

/** Campos que a tela pode mandar. Na edição (PATCH), todos são opcionais: só muda o que veio. */
const campos = {
  nome: texto(80, "Como chamam"),
  nomeCompleto: texto(160, "O nome completo"),
  genero: z.enum(["f", "m", ""], { error: "Gênero inválido." }).nullish().transform((v) => v || null),
  nascimento: data,
  falecimento: data,
  faleceu: z.boolean({ error: "Faleceu precisa ser sim ou não." }).optional(),
  origem: texto(160, "A origem"),
  bio: texto(20000, "A história"),
  cor: z.string().regex(/^[a-z]{2,20}$/, "Cor inválida.").nullish().transform((v) => v ?? null),
  // do perfil (aparecem no "Seu perfil"; para familiares, ficam vazios)
  cidadeNatal: texto(120, "A cidade natal"),
  cidadeAtual: texto(120, "A cidade atual"),
  profissao: texto(120, "A profissão"),
  capa: z.string().regex(/^[a-z0-9-]{1,40}$/, "Capa inválida.").nullish().transform((v) => v ?? null),
  favoritos: z
    .object({ comida: texto(120, "A comida favorita"), musica: texto(120, "A música favorita"), lugar: texto(120, "O lugar favorito") })
    .strict()
    .optional(),
  gostos: z
    .array(z.string().trim().min(1).max(80, "Cada gosto pode ter até 80 caracteres."))
    .max(40, "Use até 40 gostos.")
    .transform((l) => [...new Set(l)])
    .optional(),
};

// O nome é opcional, como na tela: dá para guardar "a filha de Maria" e contar o nome depois
// (a árvore mostra o parentesco no lugar do nome).
export const NovaPessoa = z.object(campos).strict();

// Na edição, só muda o que veio. Atenção: o zod devolve null para campo de texto ausente;
// por isso a rota usa somente as chaves que vieram no corpo (ver soEnviados).
export const MudarPessoa = z.object(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.optional()]))).strict();

/** Do resultado validado, só os campos que a tela mandou de verdade. */
export const soEnviados = (corpo, dados) => Object.fromEntries(Object.keys(corpo).filter((k) => k in dados).map((k) => [k, dados[k]]));

const TIPOS_LACO = ["pais", "conjuge", "irmaos", "primos", "cunhados", "avos", "tios", "sogros", "outro"];
const idPessoa = z.coerce.number({ error: "Escolha a pessoa." }).int().positive().max(2147483647);

export const NovoLaco = z
  .object({
    tipo: z.enum(TIPOS_LACO, { error: "Escolha o parentesco." }),
    de: idPessoa,
    para: idPessoa,
    modo: z.enum(["adotivo", "criacao", ""], { error: "Modo inválido." }).nullish().transform((v) => v || null),
    rotulo: texto(60, "O nome do vínculo"),
    rotuloVolta: texto(60, "O nome do vínculo de volta"),
  })
  .strict()
  .refine((l) => l.de !== l.para, { path: ["para"], message: "Escolha duas pessoas diferentes." })
  // rótulos só valem no tipo "outro" (madrinha / afilhada)
  .transform((l) => (l.tipo === "outro" ? l : { ...l, rotulo: null, rotuloVolta: null }));
