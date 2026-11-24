// npm run db:plano -- <email> "<plano>"
//   Troca o plano de uma conta direto no banco. SÓ PARA DESENVOLVER E APRESENTAR: ainda não existe pagamento,
//   e o plano Grátis não permite convidar ninguém. Recusa rodar com NODE_ENV=production.
//   Exemplo: npm run db:plano -- helena@exemplo.com "Família"
//   Planos: Grátis, Individual, Família, Família Ampliada
import { lerConfig } from "./config.js";
import { criarPool } from "./db.js";

const [email, nomePlano] = process.argv.slice(2);
let pool;
try {
  const config = lerConfig();
  if (config.ambiente === "production") throw new Error("Este comando é só para desenvolvimento. Em produção, o plano muda pela assinatura.");
  if (!email || !nomePlano) throw new Error('Use assim: npm run db:plano -- email@exemplo.com "Família"');
  pool = criarPool(config.banco);
  const [planos] = await pool.execute("SELECT id_plano, nome, limite_membros FROM plano ORDER BY id_plano");
  const plano = planos.find((p) => p.nome.toLowerCase() === nomePlano.trim().toLowerCase());
  if (!plano) throw new Error(`Plano "${nomePlano}" não existe. Os planos são: ${planos.map((p) => p.nome).join(", ")}.`);
  const [r] = await pool.execute("UPDATE usuario SET id_plano = ? WHERE email = ?", [plano.id_plano, email.trim().toLowerCase()]);
  if (r.affectedRows === 0) throw new Error(`Nenhuma conta com o e-mail ${email}.`);
  const limite = plano.limite_membros == null ? "sem limite" : `até ${plano.limite_membros} pessoa(s) na família`;
  console.log(`✔ ${email} agora está no plano ${plano.nome} (${limite}).`);
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
