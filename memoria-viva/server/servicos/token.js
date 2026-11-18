// Código da sessão: 32 bytes aleatórios (impossível de adivinhar).
// O navegador recebe o código; o banco guarda só o SHA-256 dele.
import { createHash, randomBytes } from "node:crypto";

export const novoToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");
