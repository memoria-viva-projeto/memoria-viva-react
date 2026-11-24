// Rotas da árvore da família (todas exigem login; só a dona da família pode):
//   GET    /api/familias/:idFamilia/arvore    pessoas (inclusive quem saiu da árvore) e laços
//   POST   /api/familias/:idFamilia/pessoas   adiciona um familiar (sem conta)
//   PATCH  /api/pessoas/:idPessoa             muda só os campos enviados
//   DELETE /api/pessoas/:idPessoa             tira da árvore (continua nas memórias; os laços dela saem)
//   POST   /api/familias/:idFamilia/lacos     cria um parentesco (substitui o que houver entre as duas)
//   DELETE /api/lacos/:idLaco                 desfaz um parentesco
// Família, papel e conta vinculada nunca vêm do corpo: campo desconhecido = 400.
import { Router } from "express";
import { ErroApi, naoEncontrado } from "../erros.js";
import { exigirLogin } from "../middleware/sessao.js";
import * as servico from "../servicos/pessoas.js";
import { Id } from "../validacao/memorias.js";
import { MudarPessoa, NovaPessoa, NovoLaco, soEnviados } from "../validacao/pessoas.js";

const idDa = (valor, mensagem) => {
  const r = Id.safeParse(valor);
  if (!r.success) throw naoEncontrado(mensagem);
  return r.data;
};
const FAMILIA = "Não encontramos esta família na sua conta.";
const PESSOA = "Não encontramos esta pessoa na sua família.";

export function rotasPessoas(pool) {
  const r = Router();

  r.get("/familias/:idFamilia/arvore", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, FAMILIA);
    res.json(await servico.arvore(pool, { idUsuario: req.sessao.idUsuario, idFamilia }));
  });

  r.post("/familias/:idFamilia/pessoas", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, FAMILIA);
    const dados = NovaPessoa.parse(req.body ?? {});
    res.status(201).json(await servico.criar(pool, { idUsuario: req.sessao.idUsuario, idFamilia, dados }));
  });

  r.patch("/pessoas/:idPessoa", exigirLogin, async (req, res) => {
    const idPessoa = idDa(req.params.idPessoa, PESSOA);
    const corpo = req.body ?? {};
    const dados = soEnviados(corpo, MudarPessoa.parse(corpo));
    if (!Object.keys(dados).length) throw new ErroApi(400, "DADOS_INVALIDOS", "Nada para mudar.");
    res.json(await servico.mudar(pool, { idUsuario: req.sessao.idUsuario, idPessoa, dados }));
  });

  r.delete("/pessoas/:idPessoa", exigirLogin, async (req, res) => {
    const idPessoa = idDa(req.params.idPessoa, PESSOA);
    await servico.tirarDaArvore(pool, { idUsuario: req.sessao.idUsuario, idPessoa });
    res.status(204).end();
  });

  r.post("/familias/:idFamilia/lacos", exigirLogin, async (req, res) => {
    const idFamilia = idDa(req.params.idFamilia, FAMILIA);
    const laco = NovoLaco.parse(req.body ?? {});
    res.status(201).json(await servico.criarLaco(pool, { idUsuario: req.sessao.idUsuario, idFamilia, laco }));
  });

  r.delete("/lacos/:idLaco", exigirLogin, async (req, res) => {
    const idLaco = idDa(req.params.idLaco, "Não encontramos este parentesco.");
    await servico.apagarLaco(pool, { idUsuario: req.sessao.idUsuario, idLaco });
    res.status(204).end();
  });

  return r;
}
