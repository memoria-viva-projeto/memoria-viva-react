// Regras dos dados que chegam no cadastro e no login.
// São as MESMAS da tela (src/components/conta/Cadastro.jsx): o servidor confere de novo porque
// qualquer um pode chamar a API sem passar pela tela.
import { z } from "zod";
import { codigo } from "./convites.js";

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // igual ao Cadastro.jsx

const email = z
  .string({ error: "Escreva seu e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Escreva seu e-mail.")
  .max(180, "Este e-mail é longo demais.")
  .regex(EMAIL_OK, "Confira o e-mail: falta o @ ou o domínio (ex.: voce@email.com).");

export const Cadastro = z.object({
  nome: z.string({ error: "Escreva seu nome." }).trim().min(1, "Escreva seu nome.").max(120, "Use até 120 letras no nome."),
  email,
  senha: z
    .string({ error: "Crie uma senha." })
    .min(1, "Crie uma senha.")
    .max(200, "Use até 200 caracteres na senha.") // limite alto, só para ninguém travar o servidor com uma "senha" gigante
    .refine((s) => s.length >= 8, "A senha precisa de pelo menos 8 caracteres.")
    .refine((s) => /\p{L}/u.test(s), "A senha precisa de pelo menos uma letra.")
    .refine((s) => /\d/.test(s), "A senha precisa de pelo menos um número."),
  familia: z
    .string({ error: "Dê um nome para o acervo da família." })
    .trim()
    .min(1, "Dê um nome para o acervo da família.")
    .max(40, "Use até 40 letras no nome da família."), // a tela também limita a 40
  // opcional: o código de convite de outra família. A conta ganha o acervo dela E entra nessa família.
  codigo: codigo.optional(),
});

export const Entrar = z.object({
  email,
  senha: z.string({ error: "Escreva sua senha." }).min(1, "Escreva sua senha.").max(200, "Senha longa demais."),
});

/** Pedir para apagar a conta: só a senha, para confirmar que é a própria pessoa. */
export const ApagarConta = z
  .object({ senha: z.string({ error: "Escreva sua senha." }).min(1, "Escreva sua senha.").max(200, "Senha longa demais.") })
  .strict();

/** Ajustes de acessibilidade: só muda o que vier. */
export const Ajustes = z
  .object({
    tamanhoTexto: z.enum(["normal", "grande", "maior"], { error: "Tamanho de texto inválido." }).optional(),
    tema: z.enum(["auto", "claro", "escuro"], { error: "Aparência inválida." }).optional(),
    altoContraste: z.boolean({ error: "Alto contraste precisa ser sim ou não." }).optional(),
    menosMovimento: z.boolean({ error: "Menos movimento precisa ser sim ou não." }).optional(),
  })
  .strict()
  .refine((a) => Object.keys(a).length > 0, { message: "Nada para mudar." });
