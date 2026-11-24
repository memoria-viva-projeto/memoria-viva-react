// Senha: nunca guardamos a senha, só um "hash" dela.
// Hash é uma conta de mão única: dá para conferir se uma senha bate, mas não dá para voltar do hash à senha.
// Argon2id é o algoritmo recomendado hoje; ele é lento e gasta memória de propósito, para que
// testar milhões de senhas roubadas fique caro demais. Parâmetros: recomendação mínima da OWASP.
import { hash, verify } from "@node-rs/argon2";

const OPCOES = { memoryCost: 19456, timeCost: 2, parallelism: 1 }; // 19 MiB, 2 passadas

export const gerarHash = (senha) => hash(senha, OPCOES);

export async function conferir(senhaHash, senha) {
  try {
    return await verify(senhaHash, senha);
  } catch {
    return false; // hash em formato estranho: trata como senha errada, sem derrubar o servidor
  }
}

// Hash de uma senha qualquer, usado quando o e-mail não existe: assim o login demora o mesmo tanto
// com ou sem conta, e ninguém descobre quais e-mails estão cadastrados medindo o tempo da resposta.
let hashFalso;
export async function conferirFalso(senha) {
  hashFalso ??= await gerarHash("senha-que-nao-existe-1");
  await conferir(hashFalso, senha);
  return false;
}
