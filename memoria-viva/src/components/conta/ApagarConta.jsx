import { useRef, useState } from "react";
import { api } from "../../api.js";

/** "2026-12-16T21:50:00.000Z" → "16 de dezembro de 2026" */
export const dataPorExtenso = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** O que vai sumir, em frases curtas (vem de GET /api/conta/apagar). */
function frasesDoResumo(r) {
  const frases = [];
  for (const f of r.familias) {
    frases.push(`O acervo "${f.nome}", com ${plural(f.memorias, "memória", "memórias")}, a árvore e o código de convite.`);
    if (f.membros) frases.push(`${plural(f.membros, "pessoa que entrou", "pessoas que entraram")} com o código ${f.membros === 1 ? "perde" : "perdem"} o acesso a "${f.nome}".`);
  }
  if (r.outrasFamilias) {
    frases.push(`Nas ${plural(r.outrasFamilias, "família", "famílias")} em que você entrou com código, você continua na árvore, mas sem conta.`);
  }
  return frases;
}

/**
 * Fim da janela Ajustes (só com login): pedir para apagar a conta.
 * Pede a senha; a conta some de vez em 30 dias e, até lá, dá para desistir na tela de entrar.
 */
export default function ApagarConta() {
  const [etapa, setEtapa] = useState("fechado"); // fechado | carregando | confirmar
  const [resumo, setResumo] = useState(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const campoSenha = useRef(null);

  const abrir = async () => {
    setEtapa("carregando");
    setErro("");
    try {
      setResumo(await api("/conta/apagar"));
      setEtapa("confirmar");
      requestAnimationFrame(() => campoSenha.current?.focus());
    } catch (e) {
      setEtapa("fechado");
      setErro(e.message);
    }
  };

  const cancelar = () => { setEtapa("fechado"); setSenha(""); setErro(""); };

  const confirmar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!senha) { setErro("Escreva sua senha para confirmar."); campoSenha.current?.focus(); return; }
    setEnviando(true);
    setErro("");
    try {
      const { apagarEm } = await api("/conta/apagar", { corpo: { senha } });
      setSenha("");
      // a sessão já acabou: vai para a entrada, que mostra a data e como desistir
      window.location.href = `/entrar?conta=apagando&em=${encodeURIComponent(apagarEm)}`;
    } catch (falha) {
      setEnviando(false);
      setErro(falha.campos?.senha || falha.message);
      campoSenha.current?.focus();
    }
  };

  return (
    <section className="aj-apagar" aria-labelledby="aj-apagar-t">
      <h3 id="aj-apagar-t">Apagar minha conta</h3>

      {etapa !== "confirmar" ? (
        <>
          <p className="aj-nota">Apaga sua conta e o acervo da sua família. Você tem 30 dias para desistir.</p>
          {erro && <p className="ed-erro" role="alert">{erro}</p>}
          <button type="button" className="btn btn-s" onClick={abrir} disabled={etapa === "carregando"}>
            {etapa === "carregando" ? "Abrindo…" : "Apagar minha conta"}
          </button>
        </>
      ) : (
        <form className="fe-confirma aj-apagar-form" onSubmit={confirmar} noValidate aria-busy={enviando || undefined}>
          <p>Em 30 dias, isto some de vez:</p>
          <ul>
            <li>Sua conta: e-mail, senha e ajustes.</li>
            {frasesDoResumo(resumo).map((f) => <li key={f}>{f}</li>)}
          </ul>
          <p className="aj-apagar-prazo">
            Você sai da conta agora. Até lá, quem entrou com o código continua vendo o acervo. Para desistir,
            é só entrar com seu e-mail e sua senha.
          </p>
          <div className="ed-campo">
            <label htmlFor="aj-apagar-senha">Sua senha, para confirmar</label>
            <input id="aj-apagar-senha" ref={campoSenha} type="password" autoComplete="current-password" value={senha}
              onChange={(e) => setSenha(e.target.value)} aria-invalid={erro ? true : undefined}
              aria-describedby={erro ? "aj-apagar-erro" : undefined} />
          </div>
          {erro && <p className="ed-erro" id="aj-apagar-erro" role="alert">{erro}</p>}
          <button type="submit" className="btn btn-p btn-sm" disabled={enviando}>
            {enviando ? "Apagando…" : "Sim, apagar em 30 dias"}
          </button>
          <button type="button" className="btn-l" onClick={cancelar}>Não, manter minha conta</button>
        </form>
      )}
    </section>
  );
}
