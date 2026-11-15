// Erros da API num formato só, para o frontend tratar todos do mesmo jeito:
//   { "erro": { "codigo": "EMAIL_EM_USO", "mensagem": "Já existe uma conta...", "campos": { "email": "..." } } }
// "codigo" é para o programa; "mensagem" é para a pessoa ler (no tom da interface).
import { ZodError } from "zod";

export class ErroApi extends Error {
  constructor(status, codigo, mensagem, campos) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.campos = campos;
  }
}

export const naoAutenticado = () => new ErroApi(401, "NAO_AUTENTICADO", "Entre na sua conta para continuar.");
export const naoEncontrado = (o = "Não encontramos o que você procurou.") => new ErroApi(404, "NAO_ENCONTRADO", o);

/** Transforma os problemas do zod em { campo: "mensagem" }. */
function camposDoZod(e) {
  const campos = {};
  for (const i of e.issues) {
    const campo = i.path.join(".") || "corpo";
    if (!campos[campo]) campos[campo] = i.message;
  }
  return campos;
}

/** Último middleware do Express: qualquer erro lançado nas rotas chega aqui. */
export function tratarErros(err, req, res, _next) {
  if (err instanceof ZodError) {
    return enviar(res, new ErroApi(400, "DADOS_INVALIDOS", "Confira os campos destacados.", camposDoZod(err)));
  }
  if (err instanceof ErroApi) return enviar(res, err);
  if (err?.type === "entity.parse.failed") {
    return enviar(res, new ErroApi(400, "JSON_INVALIDO", "O corpo da requisição não é um JSON válido."));
  }
  if (err?.type === "entity.too.large") {
    return enviar(res, new ErroApi(413, "MUITO_GRANDE", "Os dados enviados são grandes demais."));
  }

  // Erro inesperado. No log vai só o tipo e onde aconteceu: a mensagem do MySQL pode conter dados
  // da pessoa (ex.: "Duplicate entry 'maria@...'"), e senha/conteúdo privado nunca vão para o log.
  const onde = (err?.stack || "").split("\n").slice(1, 4).map((l) => l.trim()).join(" | ");
  console.error(`[erro] ${req.method} ${req.baseUrl}${req.path} → ${err?.code || err?.name || "Erro"} ${onde}`);
  return enviar(res, new ErroApi(500, "ERRO_INTERNO", "Algo deu errado do nosso lado. Tente de novo em instantes."));
}

function enviar(res, e) {
  const corpo = { erro: { codigo: e.codigo, mensagem: e.message } };
  if (e.campos) corpo.erro.campos = e.campos;
  res.status(e.status).json(corpo);
}
