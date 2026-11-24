import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { desligarConvite, entrarComCodigo, familiasComoMembro, gerarConvite, verConvite } from "./convitesServidor.js";

/**
 * Na área Família (conta com login): o código de convite da família (só a dona), as famílias em que
 * a pessoa entrou pelo código e o campo para entrar em outra.
 */
export default function ConvitesDaFamilia({ ir }) {
  const [outras, setOutras] = useState(familiasComoMembro);
  const entrou = (f) => { setOutras(familiasComoMembro()); ir(`${ROTAS.familias}/${f.id}`); };
  return (
    <>
      <CodigoDaFamilia />
      {outras.length > 0 && (
        <section className="fm-previa cv" aria-labelledby="cv-outras-t">
          <h2 id="cv-outras-t" className="c-h2">Famílias em que você entrou</h2>
          <ul className="cv-lista">
            {outras.map((f) => (
              <li key={f.id}>
                <Link className="btn btn-s" para={`${ROTAS.familias}/${f.id}`}><Icone nome="familia" />{f.nome}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <EntrarEmFamilia onEntrou={entrou} />
    </>
  );
}

/** O código da família: copiar, trocar (o antigo para de valer) ou desligar. Só a dona vê. */
function CodigoDaFamilia() {
  const [c, setC] = useState(null); // o que o servidor diz: { codigo, membros, limite, plano, podeConvidar }
  const [erro, setErro] = useState("");
  const [confirmar, setConfirmar] = useState(null); // "trocar" | "desligar"
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    verConvite().then(setC).catch((e) => setErro(e.message || "Não deu para abrir o convite agora."));
  }, []);

  const fazer = async (acao) => {
    setOcupado(true);
    setErro("");
    try {
      if (acao === "desligar") { await desligarConvite(); setC((a) => ({ ...a, codigo: null })); }
      else setC(await gerarConvite());
      setConfirmar(null);
      setCopiado(false);
    } catch (e) {
      setErro(e.message || "Não deu para fazer isso agora. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(c.codigo); setCopiado(true); }
    catch { setErro("Não deu para copiar. Selecione o código e copie com o dedo ou o mouse."); }
  };

  return (
    <section className="fm-previa cv" aria-labelledby="cv-t">
      <h2 id="cv-t" className="c-h2">Convide a família</h2>
      {!c && !erro && <p role="status">Abrindo…</p>}
      {c && !c.podeConvidar && (
        <p className="ed-dica">
          Seu plano ({c.plano}) é só para você. Nos planos Família, até 5 pessoas entram no acervo (ou 10, no Família Plus).
        </p>
      )}
      {c?.podeConvidar && (
        <>
          <p className="ed-dica">
            Quem tiver este código entra na família: vê as memórias e a árvore, e cuida só do próprio perfil.
            Guardar, mudar e apagar continua com você.
          </p>
          <p className="cv-lugares">
            {c.limite == null ? `${c.membros} pessoas na família` : `${c.membros} de ${c.limite} lugares ocupados (você conta)`}
          </p>
          {c.codigo ? (
            <>
              <p className="cv-codigo" aria-label={`Código da família: ${c.codigo.split("").join(" ")}`}>{c.codigo}</p>
              <div className="cv-botoes">
                <button type="button" className="btn btn-p" onClick={copiar}><Icone nome="enviar" />{copiado ? "Copiado!" : "Copiar código"}</button>
                <button type="button" className="btn btn-s" onClick={() => setConfirmar("trocar")}><Icone nome="trocar" />Trocar código</button>
                <button type="button" className="btn-l" onClick={() => setConfirmar("desligar")}>Desligar convites</button>
              </div>
              <p className="sr" aria-live="polite">{copiado ? "Código copiado." : ""}</p>
            </>
          ) : (
            <div className="cv-botoes">
              <p>Os convites estão desligados.</p>
              <button type="button" className="btn btn-p" disabled={ocupado} onClick={() => fazer("gerar")}><Icone nome="convidar" />Criar código</button>
            </div>
          )}
          {confirmar && (
            <div className="fe-confirma" role="alert">
              <p>
                {confirmar === "trocar"
                  ? "O código atual para de valer na hora. Quem já entrou continua na família. Trocar?"
                  : "Ninguém mais entra com o código atual. Quem já entrou continua na família. Desligar?"}
              </p>
              <button type="button" className="btn btn-p btn-sm" disabled={ocupado} onClick={() => fazer(confirmar === "trocar" ? "gerar" : "desligar")}>
                {confirmar === "trocar" ? "Sim, trocar" : "Sim, desligar"}
              </button>
              <button type="button" className="btn-l" onClick={() => setConfirmar(null)}>Não, manter</button>
            </div>
          )}
        </>
      )}
      {erro && <p className="ed-erro" role="alert">{erro}</p>}
    </section>
  );
}

/** Quem recebeu o código de outra família entra por aqui (o acervo dela continua o mesmo). */
function EntrarEmFamilia({ onEntrou }) {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!codigo.trim()) return setErro("Escreva o código que você recebeu.");
    setOcupado(true);
    setErro("");
    try {
      onEntrou(await entrarComCodigo(codigo));
    } catch (falha) {
      setErro(falha.campos?.codigo || falha.message);
      setOcupado(false);
    }
  };

  return (
    <section className="fm-previa cv" aria-labelledby="cv-entrar-t">
      <h2 id="cv-entrar-t" className="c-h2">Recebeu um código de outra família?</h2>
      <form className="cv-entrar" onSubmit={enviar} noValidate>
        <label className="cc-campo">
          <span>Código da família (ex.: MV-7K3P-Q9XD)</span>
          <input
            type="text" placeholder="MV-0000-0000" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40}
            value={codigo} onChange={(e) => { setCodigo(e.target.value); setErro(""); }}
            aria-invalid={erro ? "true" : undefined} aria-describedby={erro ? "cv-entrar-erro" : undefined}
          />
        </label>
        {erro && <p className="ed-erro" id="cv-entrar-erro">{erro}</p>}
        <button type="submit" className="btn btn-s" disabled={ocupado}><Icone nome="entrar" />{ocupado ? "Entrando…" : "Entrar na família"}</button>
      </form>
    </section>
  );
}
