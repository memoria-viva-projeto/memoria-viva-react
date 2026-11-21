// Rotas de arquivos (todas exigem login):
//   POST   /api/familias/:idFamilia/arquivos?tipo=foto&largura=&altura=&nome=
//          envia UM arquivo para o acervo. O corpo é o próprio arquivo (sem formulário), com o Content-Type dele.
//          Só a dona. Devolve { id, tipo, mime, tamanho, largura, altura, temMiniatura }.
//   PUT    /api/arquivos/:idArquivo/miniatura      corpo = um JPEG pequeno (a tela gera a miniatura). Só a dona.
//   GET    /api/arquivos/:idArquivo[?mini=1]       entrega o arquivo (ou a miniatura) para quem pode ver a memória
//   DELETE /api/arquivos/:idArquivo                descarta um arquivo que ainda não está em nenhuma memória. Só a dona.
// O arquivo só fica numa memória quando ela é guardada com { itens: [{ idArquivo, ... }] } (ver rotas/memorias.js).
// Quem não pode ver recebe 404, igual a um número que não existe.
import { Router } from "express";
import { z } from "zod";
import { naoEncontrado } from "../erros.js";
import { exigirLogin } from "../middleware/sessao.js";
import * as servico from "../servicos/arquivos.js";
import { Id } from "../validacao/memorias.js";

const idDa = (valor, msg) => {
  const r = Id.safeParse(valor);
  if (!r.success) throw naoEncontrado(msg);
  return r.data;
};
const inteiro = (min, max) => z.coerce.number().int().min(min).max(max).optional().catch(undefined);

const Envio = z.object({
  tipo: z.enum(["foto"], { error: "Só fotos podem ser enviadas." }),
  largura: inteiro(1, 30000),
  altura: inteiro(1, 30000),
  nome: z.string().trim().max(255).optional().catch(undefined),
});

const tamanhoDeclarado = (req) => {
  const n = Number(req.headers["content-length"]);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function rotasArquivos(pool, armazenamento) {
  const r = Router();

  r.post("/familias/:idFamilia/arquivos", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, "Não encontramos esta família na sua conta.");
    const meta = Envio.parse(req.query);
    const arquivo = await servico.enviar(pool, armazenamento, {
      idUsuario: req.sessao.idUsuario, idFamilia, entrada: req, tamanhoDeclarado: tamanhoDeclarado(req),
      meta: { ...meta, largura: meta.largura ?? null, altura: meta.altura ?? null, nome: meta.nome || null },
    });
    res.status(201).json(arquivo);
  });

  r.put("/arquivos/:idArquivo/miniatura", exigirLogin, async (req, res) => {
    const idArquivo = idDa(req.params.idArquivo, "Não encontramos este arquivo.");
    res.json(await servico.enviarMiniatura(pool, armazenamento, {
      idUsuario: req.sessao.idUsuario, idArquivo, entrada: req, tamanhoDeclarado: tamanhoDeclarado(req),
    }));
  });

  r.get("/arquivos/:idArquivo", exigirLogin, async (req, res) => {
    const idArquivo = idDa(req.params.idArquivo, "Não encontramos este arquivo.");
    const { local, mime } = await servico.paraEntregar(pool, armazenamento, {
      idUsuario: req.sessao.idUsuario, idArquivo, mini: req.query.mini === "1",
    });
    // "private, no-cache": o navegador pode guardar, mas pergunta ao servidor antes de usar de novo
    // (responde 304 se nada mudou). Assim, quem perde o acesso não continua vendo pelo que ficou guardado.
    // O arquivo passa pelo servidor (pasta local ou bucket privado): ninguém recebe um endereço direto dele.
    try {
      await armazenamento.entregar(req, res, local, {
        "Content-Type": mime,
        "Cache-Control": "private, no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
      });
    } catch (e) {
      if (res.headersSent) return res.destroy(); // caiu no meio da entrega: só fecha a conexão
      throw e.status === 404 ? naoEncontrado("Este arquivo não está disponível.") : e;
    }
  });

  r.delete("/arquivos/:idArquivo", exigirLogin, async (req, res) => {
    const idArquivo = idDa(req.params.idArquivo, "Não encontramos este arquivo.");
    await servico.descartar(pool, armazenamento, { idUsuario: req.sessao.idUsuario, idArquivo });
    res.status(204).end();
  });

  return r;
}
