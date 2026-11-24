// Rotas de memórias (todas exigem login):
//   POST /api/familias/:idFamilia/memorias   guarda uma memória no acervo
//   GET  /api/familias/:idFamilia/memorias   lista o acervo (?limite=50&antesDe=<id> para paginar)
//   GET    /api/memorias/:idMemoria          abre uma memória
//   PUT    /api/memorias/:idMemoria          edita (a memória inteira substitui a anterior; o tipo não muda)
//   DELETE /api/memorias/:idMemoria          apaga uma memória (não dá para desfazer) e os arquivos que só ela usava
//   GET    /api/familias/:idFamilia/linha    linha da vida: memórias confirmadas em ordem de quando aconteceram
//          (?limite=30&depois=<proxima>&tipo=&ano=&decada=&de=&ate=&etiqueta=&pessoa=)
// Quem não pode ver recebe 404, igual a quem pede algo que não existe: assim ninguém descobre,
// tentando números, quais famílias ou memórias existem.
import { Router } from "express";
import { naoEncontrado } from "../erros.js";
import { exigirLogin } from "../middleware/sessao.js";
import * as servico from "../servicos/memorias.js";
import { Id, Linha, Lista, NovaMemoria } from "../validacao/memorias.js";

const idDa = (valor, mensagem) => {
  const r = Id.safeParse(valor);
  if (!r.success) throw naoEncontrado(mensagem);
  return r.data;
};

export function rotasMemorias(pool, armazenamento) {
  const r = Router();

  r.get("/familias/:idFamilia/linha", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, "Não encontramos esta família na sua conta.");
    const { limite, depois, ...filtros } = Linha.parse(req.query);
    res.json(await servico.linha(pool, { idUsuario: req.sessao.idUsuario, idFamilia, limite, depois, filtros }));
  });

  r.post("/familias/:idFamilia/memorias", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, "Não encontramos esta família na sua conta.");
    const dados = NovaMemoria.parse(req.body ?? {});
    const memoria = await servico.criar(pool, { idUsuario: req.sessao.idUsuario, idFamilia, dados });
    res.status(201).json(memoria);
  });

  r.get("/familias/:idFamilia/memorias", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, "Não encontramos esta família na sua conta.");
    const { limite, antesDe } = Lista.parse(req.query);
    res.json(await servico.listar(pool, { idUsuario: req.sessao.idUsuario, idFamilia, limite, antesDe }));
  });

  r.get("/memorias/:idMemoria", exigirLogin, async (req, res) => {
    const idMemoria = idDa(req.params.idMemoria, "Não encontramos esta memória.");
    res.json(await servico.abrir(pool, { idUsuario: req.sessao.idUsuario, idMemoria }));
  });

  r.put("/memorias/:idMemoria", exigirLogin, async (req, res) => {
    const idMemoria = idDa(req.params.idMemoria, "Não encontramos esta memória.");
    const dados = NovaMemoria.parse(req.body ?? {});
    res.json(await servico.atualizar(pool, armazenamento, { idUsuario: req.sessao.idUsuario, idMemoria, dados }));
  });

  r.delete("/memorias/:idMemoria", exigirLogin, async (req, res) => {
    const idMemoria = idDa(req.params.idMemoria, "Não encontramos esta memória.");
    await servico.apagar(pool, armazenamento, { idUsuario: req.sessao.idUsuario, idMemoria });
    res.status(204).end();
  });

  return r;
}
