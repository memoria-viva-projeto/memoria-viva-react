// npm run db:local — liga um MySQL só deste projeto, para desenvolver sem depender da senha do MySQL da máquina.
// - Porta 3307 (o MySQL instalado na máquina continua na 3306, intocado).
// - Usuário root SEM senha, aceitando conexões só deste computador (127.0.0.1).
// - Dados em %LOCALAPPDATA%\memoria-viva-mysql (fora do projeto). Na primeira vez a pasta é criada (~15 s).
// Deixe o terminal aberto enquanto usa; Ctrl+C desliga.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PORTA = 3307;
// Fora do projeto (o Vite não fica vigiando os arquivos do banco e nada vai para o git).
// Atenção: o MySQL não liga se o nome da pasta começar com ponto (ex.: ".mysql-local").
const pasta = join(process.env.LOCALAPPDATA || homedir(), "memoria-viva-mysql");

function acharMysqld() {
  if (process.env.MYSQLD && existsSync(process.env.MYSQLD)) return process.env.MYSQLD;
  const raiz = "C:\\Program Files\\MySQL";
  if (existsSync(raiz)) {
    const servidores = readdirSync(raiz).filter((n) => n.startsWith("MySQL Server")).sort().reverse();
    for (const s of servidores) {
      const exe = `${raiz}\\${s}\\bin\\mysqld.exe`;
      if (existsSync(exe)) return exe;
    }
  }
  return null;
}

const mysqld = acharMysqld();
if (!mysqld) {
  console.error("✖ Não achei o mysqld.exe em C:\\Program Files\\MySQL. Instale o MySQL Server 8 ou informe o caminho em MYSQLD.");
  process.exit(1);
}

if (!existsSync(pasta)) {
  console.log(`Primeira vez: criando o MySQL do projeto em ${pasta} (leva uns segundos)...`);
  const r = spawnSync(mysqld, ["--no-defaults", "--initialize-insecure", `--datadir=${pasta}`], { stdio: "ignore" });
  if (r.status !== 0) {
    console.error(`✖ Não consegui criar a pasta do banco. Apague ${pasta} e tente de novo.`);
    process.exit(1);
  }
}

console.log(`MySQL do projeto ligando em 127.0.0.1:${PORTA} (usuário root, sem senha). Ctrl+C desliga.`);
const p = spawn(
  mysqld,
  ["--no-defaults", `--datadir=${pasta}`, `--port=${PORTA}`, "--bind-address=127.0.0.1", "--mysqlx=OFF", "--console"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
// mostra só o essencial do log do MySQL
const filtrar = (b) => {
  for (const l of b.toString().split(/\r?\n/)) {
    if (/ready for connections/.test(l)) console.log("✔ Pronto. Pode usar npm run db:migrar, npm run api e npm test em outro terminal.");
    else if (/\[ERROR\]/.test(l)) console.error(l);
    else if (/Shutdown complete/.test(l)) console.log("MySQL do projeto desligado.");
  }
};
p.stdout.on("data", filtrar);
p.stderr.on("data", filtrar);
p.on("exit", (code) => process.exit(code ?? 0));
// desliga com calma (o MySQL termina de gravar tudo); se não responder em 20 s, encerra à força
let parando = false;
const parar = () => {
  if (parando) return;
  parando = true;
  console.log("Desligando o MySQL do projeto...");
  spawn(mysqld.replace(/mysqld\.exe$/, "mysqladmin.exe"), ["-u", "root", "-h", "127.0.0.1", `-P${PORTA}`, "shutdown"], { stdio: "ignore" });
  setTimeout(() => p.kill(), 20000).unref();
};
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
