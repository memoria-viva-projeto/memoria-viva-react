// Regras dos arquivos (fotos, vídeos, áudios das memórias). Decisões aprovadas:
//   - só a dona do acervo envia; o arquivo fica ligado ao acervo (arquivo.id_familia);
//   - limites por arquivo: foto 20 MB, áudio 30 MB, vídeo 200 MB (miniatura: JPEG até 2 MB);
//   - o total do acervo não passa do espaço do plano da dona (plano.armazenamento_gb). Só LÊ o plano;
//   - o tipo é conferido pelo CONTEÚDO (os primeiros bytes), não pelo nome nem pelo que o navegador diz;
//   - quem pode ver: ver dados/arquivos.js. A entrega passa sempre pelo servidor, que confere a cada pedido.
//
// Banco e disco não estão na mesma transação, então nada aqui promete "tudo ou nada" entre os dois. O que existe:
//   - o arquivo é gravado no disco ANTES da linha no banco; se o banco falhar, o arquivo é apagado na hora;
//   - ao apagar, a linha sai do banco primeiro e o disco depois; se o disco falhar, a faxina tenta de novo;
//   - a faxina (a cada hora) apaga: arquivos enviados e nunca usados há mais de 24 h, e arquivos do disco
//     que não têm linha no banco há mais de 24 h.
import { emTransacao } from "../db.js";
import { ErroApi, naoEncontrado } from "../erros.js";
import { LimiteExcedido } from "../armazenamento.js";
import * as arquivos from "../dados/arquivos.js";
import * as memorias from "../dados/memorias.js";

const MB = 1024 * 1024;
export const LIMITES = { foto: 20 * MB, audio: 30 * MB, video: 200 * MB, miniatura: 2 * MB };
export const HORAS_ABANDONADO = 24;

const naoEncontrado404 = () => naoEncontrado("Não encontramos este arquivo.");
const familiaNaoEncontrada = () => naoEncontrado("Não encontramos esta família na sua conta.");
const tamanhoBonito = (b) => `${Math.round(b / MB)} MB`;

/**
 * Descobre o tipo real pelos primeiros bytes. Devolve o mime aceito para o `tipo` pedido, ou null.
 * Lista fechada: só estes formatos entram.
 *   foto: JPEG, PNG, WebP, GIF        vídeo: MP4, MOV, WebM        áudio: MP3, M4A, OGG, WAV, WebM
 * (HEIC do iPhone não entra direto: a tela já converte as fotos para JPEG antes de enviar.)
 */
export function tipoReal(inicio, tipo) {
  const b = inicio;
  const txt = (de, ate) => b.subarray(de, ate).toString("latin1");
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const gif = txt(0, 6) === "GIF87a" || txt(0, 6) === "GIF89a";
  const webp = txt(0, 4) === "RIFF" && txt(8, 12) === "WEBP";
  const wav = txt(0, 4) === "RIFF" && txt(8, 12) === "WAVE";
  const ebml = b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3; // WebM / Matroska
  const ogg = txt(0, 4) === "OggS";
  const mp3 = txt(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && b[1] !== 0xff);
  const ftyp = txt(4, 8) === "ftyp" ? txt(8, 12) : null; // MP4, MOV, M4A, HEIC...
  const heic = ftyp && /^(heic|heix|hevc|mif1|msf1|avif)$/.test(ftyp);

  if (tipo === "miniatura") return jpeg ? "image/jpeg" : null;
  if (tipo === "foto") return jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : gif ? "image/gif" : null;
  if (tipo === "video") {
    if (ebml) return "video/webm";
    if (ftyp && !heic && !/^M4[AB] $/.test(ftyp)) return ftyp === "qt  " ? "video/quicktime" : "video/mp4";
    return null;
  }
  if (tipo === "audio") {
    if (mp3 && !jpeg) return "audio/mpeg";
    if (ogg) return "audio/ogg";
    if (wav) return "audio/wav";
    if (ebml) return "audio/webm";
    if (ftyp && !heic && ftyp !== "qt  ") return "audio/mp4"; // M4A, ou gravação do navegador em MP4
    return null;
  }
  return null;
}

async function exigirDona(db, { idFamilia, idUsuario }) {
  if (!(await memorias.idDonaDaFamilia(db, { idFamilia, idUsuario }))) throw familiaNaoEncontrada();
}

const semEspaco = (limite) =>
  new ErroApi(507, "ESPACO_CHEIO", `O espaço do seu plano acabou (${(limite / 1024 ** 3).toLocaleString("pt-BR")} GB). Apague algo ou mude de plano para guardar mais.`);
const grandeDemais = (tipo) =>
  new ErroApi(413, "ARQUIVO_GRANDE", `Este arquivo é grande demais. ${tipo === "miniatura" ? "A miniatura" : `Cada ${tipo === "foto" ? "foto" : tipo === "video" ? "vídeo" : "áudio"}`} pode ter até ${tamanhoBonito(LIMITES[tipo])}.`);
const tipoNaoAceito = (tipo) =>
  new ErroApi(415, "TIPO_NAO_ACEITO", tipo === "foto" ? "Esta foto não é de um formato aceito (JPG, PNG, WebP ou GIF)."
    : tipo === "video" ? "Este vídeo não é de um formato aceito (MP4, MOV ou WebM)."
    : tipo === "audio" ? "Este áudio não é de um formato aceito (MP3, M4A, OGG, WAV ou WebM)."
    : "A miniatura precisa ser uma imagem JPG.");

/** Grava o stream no armazenamento conferindo tamanho e tipo. Erro = nada fica no disco. */
async function receber(armazenamento, entrada, { tipo, tamanhoDeclarado }) {
  if (tamanhoDeclarado != null && tamanhoDeclarado > LIMITES[tipo]) throw grandeDemais(tipo);
  let g;
  try {
    g = await armazenamento.gravar(entrada, { limite: LIMITES[tipo] });
  } catch (e) {
    if (e instanceof LimiteExcedido) throw grandeDemais(tipo);
    if (e?.code === "ECONNRESET" || e?.code === "ERR_STREAM_PREMATURE_CLOSE" || entrada.aborted) {
      throw new ErroApi(400, "ENVIO_INCOMPLETO", "O envio do arquivo foi interrompido. Tente de novo.");
    }
    throw e;
  }
  if (g.tamanho === 0) { await armazenamento.apagar(g.chave); throw new ErroApi(400, "ARQUIVO_VAZIO", "O arquivo chegou vazio. Tente de novo."); }
  const mime = tipoReal(g.inicio, tipo);
  if (!mime) { await armazenamento.apagar(g.chave); throw tipoNaoAceito(tipo); }
  return { ...g, mime };
}

/** Saída pública de um arquivo (nunca a chave interna nem o caminho). */
export const publico = (a) => ({
  id: a.id_arquivo,
  tipo: a.tipo,
  mime: a.mime,
  tamanho: a.tamanho_bytes == null ? null : Number(a.tamanho_bytes),
  largura: a.largura,
  altura: a.altura,
  duracao: a.duracao_seg,
  temMiniatura: Boolean(a.chave_miniatura),
});

/**
 * Envio de um arquivo para o acervo. `meta`: { tipo, largura, altura, duracao, nome } já validados.
 * Devolve o arquivo no formato público.
 */
export async function enviar(pool, armazenamento, { idUsuario, idFamilia, entrada, tamanhoDeclarado, meta }) {
  await exigirDona(pool, { idFamilia, idUsuario });
  // antes de receber: se o tamanho declarado já não cabe no plano, nem começa
  const antes = await arquivos.espaco(pool, idFamilia);
  if (antes.limite != null && tamanhoDeclarado != null && antes.usado + tamanhoDeclarado > antes.limite) throw semEspaco(antes.limite);

  const g = await receber(armazenamento, entrada, { tipo: meta.tipo, tamanhoDeclarado });
  try {
    const id = await emTransacao(pool, async (conn) => {
      await arquivos.travarFamilia(conn, idFamilia);
      await exigirDona(conn, { idFamilia, idUsuario }); // pode ter deixado de ser dona durante o envio
      const { usado, limite } = await arquivos.espaco(conn, idFamilia);
      if (limite != null && usado + g.tamanho > limite) throw semEspaco(limite);
      return arquivos.criar(conn, {
        idFamilia, tipo: meta.tipo, chave: g.chave, mime: g.mime, tamanho: g.tamanho,
        largura: meta.largura, altura: meta.altura, duracao: meta.duracao, nomeOriginal: meta.nome, enviadoPor: idUsuario,
      });
    });
    return publico((await arquivos.buscarSeDona(pool, { idArquivo: id, idUsuario })));
  } catch (e) {
    await armazenamento.apagar(g.chave).catch(() => {}); // o banco não aceitou: o arquivo do disco não pode ficar solto
    throw e;
  }
}

/** Troca a miniatura (JPEG pequeno) de um arquivo do acervo. Só a dona. */
export async function enviarMiniatura(pool, armazenamento, { idUsuario, idArquivo, entrada, tamanhoDeclarado }) {
  const atual = await arquivos.buscarSeDona(pool, { idArquivo, idUsuario });
  if (!atual) throw naoEncontrado404();
  const g = await receber(armazenamento, entrada, { tipo: "miniatura", tamanhoDeclarado });
  let antiga;
  try {
    await emTransacao(pool, async (conn) => {
      await arquivos.travarFamilia(conn, atual.id_familia);
      const a = await arquivos.buscarSeDona(conn, { idArquivo, idUsuario, travar: true });
      if (!a) throw naoEncontrado404();
      const { usado, limite } = await arquivos.espaco(conn, a.id_familia);
      if (limite != null && usado - Number(a.tamanho_miniatura || 0) + g.tamanho > limite) throw semEspaco(limite);
      antiga = a.chave_miniatura;
      await arquivos.trocarMiniatura(conn, idArquivo, { chave: g.chave, tamanho: g.tamanho });
    });
  } catch (e) {
    await armazenamento.apagar(g.chave).catch(() => {});
    throw e;
  }
  if (antiga) await armazenamento.apagar(antiga).catch(() => {}); // se falhar, a faxina do disco apaga depois
  return publico(await arquivos.buscarSeDona(pool, { idArquivo, idUsuario }));
}

/**
 * Para entregar: o arquivo (ou a miniatura) que a conta pode ver. Devolve { caminho, mime } ou lança 404.
 * Sem miniatura: a foto inteira serve; vídeo e áudio sem miniatura dão 404.
 */
export async function paraEntregar(pool, armazenamento, { idUsuario, idArquivo, mini }) {
  const a = await arquivos.buscarSePodeVer(pool, { idArquivo, idUsuario });
  if (!a) throw naoEncontrado404();
  if (mini && a.chave_miniatura) return { caminho: armazenamento.caminho(a.chave_miniatura), mime: "image/jpeg" };
  if (mini && a.tipo !== "foto") throw naoEncontrado("Este arquivo não tem miniatura.");
  if (!a.chave) throw naoEncontrado("Este arquivo não está disponível.");
  return { caminho: armazenamento.caminho(a.chave), mime: a.mime || "application/octet-stream" };
}

/** Descarta um arquivo enviado e não usado (ex.: a pessoa desistiu no meio de guardar). Em uso: 409. */
export async function descartar(pool, armazenamento, { idUsuario, idArquivo }) {
  const chaves = await emTransacao(pool, async (conn) => {
    const a = await arquivos.buscarSeDona(conn, { idArquivo, idUsuario, travar: true });
    if (!a) throw naoEncontrado404();
    if (await arquivos.emUso(conn, idArquivo)) {
      throw new ErroApi(409, "ARQUIVO_EM_USO", "Este arquivo está numa memória. Tire da memória antes de apagar.");
    }
    return arquivos.apagarSemUso(conn, [idArquivo]);
  });
  await apagarDoDisco(armazenamento, chaves);
}

/** Apaga do disco (se uma falhar, segue com as outras: a faxina apaga depois). */
export async function apagarDoDisco(armazenamento, chaves) {
  for (const c of chaves) await armazenamento.apagar(c).catch(() => {});
}

/**
 * Depois de editar ou apagar memórias: apaga JÁ os arquivos que eram delas e não são usados por mais nada.
 * (Arquivos usados por outra memória ou por uma pessoa da árvore ficam.)
 */
export async function descartarSeSobrou(pool, armazenamento, ids) {
  if (!ids.length) return;
  const chaves = await emTransacao(pool, (conn) => arquivos.apagarSemUso(conn, ids));
  await apagarDoDisco(armazenamento, chaves);
}

/** Faxina (a cada hora): envios abandonados e arquivos do disco sem linha no banco. Devolve quantos apagou. */
export async function faxina(pool, armazenamento, { horas = HORAS_ABANDONADO } = {}) {
  let apagados = 0;
  const ids = await arquivos.sobras(pool, horas);
  if (ids.length) {
    const chaves = await emTransacao(pool, (conn) => arquivos.apagarSemUso(conn, ids));
    await apagarDoDisco(armazenamento, chaves);
    apagados += ids.length;
  }
  // no disco, sem linha no banco (o banco falhou depois de gravar, ou a linha foi apagada e o disco não)
  const conhecidas = await arquivos.todasAsChaves(pool);
  const limite = Date.now() - horas * 3600 * 1000;
  for (const { chave, mudadoEm } of await armazenamento.listar()) {
    if (!conhecidas.has(chave) && mudadoEm < limite) {
      await armazenamento.apagar(chave).catch(() => {});
      apagados++;
    }
  }
  return apagados;
}
