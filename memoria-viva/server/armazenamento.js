// Onde ficam os arquivos (fotos, vídeos, áudios): por enquanto, uma pasta no disco do servidor.
// O resto do servidor só usa estas 4 funções; para trocar por nuvem (S3, R2, Backblaze...) depois,
// basta escrever outra versão deste arquivo com as mesmas funções.
//
// Segurança:
//   - o nome de cada arquivo no disco é aleatório (32 letras/números): ninguém escolhe o nome, então não dá para
//     sobrescrever um arquivo de outra pessoa nem sair da pasta com "../" (path traversal);
//   - toda chave é conferida antes de virar caminho;
//   - a pasta fica FORA de public/: nada aqui é servido direto; o arquivo só sai por /api/arquivos/:id.
import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

const CHAVE_OK = /^[a-f0-9]{32}$/;

export class LimiteExcedido extends Error {}

export function criarArmazenamento(pasta) {
  const caminho = (chave) => {
    if (!CHAVE_OK.test(String(chave))) throw new Error("Chave de arquivo inválida.");
    return join(pasta, chave.slice(0, 2), chave); // 256 subpastas: nenhuma fica gigante
  };

  /**
   * Grava o que vier pelo stream. Para no meio (e apaga o pedaço) se passar de `limite` bytes.
   * Devolve { chave, tamanho, inicio } (inicio = os primeiros 64 bytes, para conferir o tipo real).
   */
  async function gravar(entrada, { limite }) {
    const chave = randomBytes(16).toString("hex");
    const destino = caminho(chave);
    await mkdir(join(pasta, chave.slice(0, 2)), { recursive: true });
    let tamanho = 0;
    const partes = [];
    let juntos = 0;
    const contar = new Transform({
      transform(pedaco, _cod, pronto) {
        tamanho += pedaco.length;
        if (tamanho > limite) return pronto(new LimiteExcedido("Arquivo grande demais."));
        if (juntos < 64) { partes.push(pedaco); juntos += pedaco.length; }
        pronto(null, pedaco);
      },
    });
    try {
      // "wx": falha se já existir um arquivo com esse nome (nunca sobrescreve)
      await pipeline(entrada, contar, createWriteStream(destino, { flags: "wx" }));
    } catch (e) {
      await rm(destino, { force: true }).catch(() => {});
      throw e;
    }
    return { chave, tamanho, inicio: Buffer.concat(partes).subarray(0, 64) };
  }

  /** Apaga (se não existir, tudo bem). */
  const apagar = (chave) => rm(caminho(chave), { force: true });

  /** Todas as chaves guardadas, com a data da última mudança (para a faxina de arquivos sem dono no banco). */
  async function listar() {
    const r = [];
    let subpastas = [];
    try { subpastas = await readdir(pasta); } catch { return r; }
    for (const sub of subpastas) {
      if (!/^[a-f0-9]{2}$/.test(sub)) continue;
      for (const nome of await readdir(join(pasta, sub)).catch(() => [])) {
        if (!CHAVE_OK.test(nome)) continue;
        const s = await stat(join(pasta, sub, nome)).catch(() => null);
        if (s) r.push({ chave: nome, mudadoEm: s.mtimeMs });
      }
    }
    return r;
  }

  return { pasta, caminho, gravar, apagar, listar };
}
