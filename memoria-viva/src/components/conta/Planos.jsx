import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { avisosPrevistos, carregarCatalogo, carregarMeuPlano, pessoasTexto, preco, tamanho, trocarPlano } from "./planos.js";

const dataCurta = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "");

/** Uma barra de uso (espaço ou pessoas), sempre com o número escrito ao lado: a cor nunca é a única pista. */
function Uso({ rotulo, usado, limite, texto, passou }) {
  const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
  return (
    <div className={`pl-uso${passou ? " passou" : ""}`}>
      <div className="pl-uso-t"><span>{rotulo}</span><b>{texto}</b></div>
      <div className="pl-barra" role="img" aria-label={`${rotulo}: ${texto}${passou ? ", acima do limite do plano" : ""}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {passou && <p className="pl-uso-aviso"><Icone nome="ajuda" tam={18} />Acima do limite do plano: o que já existe continua, mas nada novo entra.</p>}
    </div>
  );
}

/** Janela de confirmação da troca (simulação: nada é cobrado). */
function Confirmar({ alvo, atual, acervos, onFechar, onConfirmar, enviando, erro }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (alvo && !d.open) d.showModal();
    if (!alvo && d.open) d.close();
  }, [alvo]);
  const p = alvo && preco(alvo.plano, alvo.ciclo);
  const previstos = alvo ? avisosPrevistos(acervos, alvo.plano) : [];
  return (
    <dialog ref={ref} className="aj pl-conf" aria-labelledby="pl-conf-t" onClose={onFechar}
      onClick={(e) => e.target === ref.current && !enviando && onFechar()}>
      {alvo && (
        <div className="aj-in">
          <div className="aj-cab">
            <h2 id="pl-conf-t">Confirmar mudança de plano</h2>
            <button type="button" className="aj-fechar" onClick={onFechar} aria-label="Fechar sem mudar" disabled={enviando}>
              <Icone nome="fechar" tam={28} />
            </button>
          </div>
          <p className="pl-conf-de">
            De <b>{atual.nome}</b> para <b>{alvo.plano.nome}</b>
            {alvo.ciclo && <> · {alvo.ciclo === "anual" ? "cobrança anual" : "cobrança mensal"}</>}
          </p>
          <p className="pl-conf-preco"><b>{p.valor}</b> {p.rotulo}{p.equivalente && <span> ({p.equivalente})</span>}</p>
          <p className="pl-simula"><Icone nome="ajuda" /><span><b>Isto é uma simulação.</b> Nenhum pagamento é feito e nenhum dado de cartão é pedido. Só o plano da sua conta muda, e os limites passam a valer na hora.</span></p>
          {previstos.length > 0 && (
            <div className="pl-previstos">
              <p><b>Com este plano, algumas coisas ficam paradas:</b></p>
              <ul>{previstos.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          {erro && <p className="ed-erro" role="alert">{erro}</p>}
          <div className="pl-conf-acoes">
            <button type="button" className="btn btn-s" onClick={onFechar} disabled={enviando}>Cancelar</button>
            <button type="button" className="btn btn-p" onClick={onConfirmar} disabled={enviando}>
              <Icone nome="certo" />{enviando ? "Mudando…" : "Confirmar mudança"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** Resumo no Perfil: "Maria · Plano Família", o que o plano dá e o caminho para ver os outros. */
export function PlanoNoPerfil({ real, nome }) {
  const [meu, setMeu] = useState(null);
  useEffect(() => {
    let vale = true;
    carregarCatalogo().then((cat) => carregarMeuPlano(real, cat)).then((m) => vale && setMeu(m)).catch(() => {});
    return () => { vale = false; };
  }, [real]);
  if (!meu) return null;
  const p = meu.plano;
  return (
    <section className="pf-bloco pl-perfil" aria-labelledby="pf-plano">
      <div className="pf-tit">
        <h2 id="pf-plano" className="pf-h2">Seu plano</h2>
      </div>
      <p className="pl-quem">{nome} <span aria-hidden="true">·</span> Plano {p.nome}</p>
      <p className="pl-sub">
        {[`${p.espacoGb} GB de espaço`, pessoasTexto(p), meu.ciclo && (meu.ciclo === "anual" ? "cobrança anual" : "cobrança mensal")].filter(Boolean).join(" · ")}
      </p>
      <Link className="btn btn-s" para={ROTAS.planos}><Icone nome="estrela" />Ver e mudar de plano</Link>
    </section>
  );
}

/**
 * Planos (/conta/planos): o plano da conta, o uso de cada acervo, os planos lado a lado e a troca simulada.
 * real: conta com login (grava no banco). Sem login: demonstração da Maria (vale só neste navegador).
 */
export default function Planos({ real, perfil, onAviso }) {
  const [catalogo, setCatalogo] = useState(null);
  const [meu, setMeu] = useState(null);
  const [falhou, setFalhou] = useState("");
  const [ciclo, setCiclo] = useState("mensal");
  const [alvo, setAlvo] = useState(null); // { plano, ciclo } que a pessoa quer
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [avisos, setAvisos] = useState([]);
  const titulo = useRef(null);

  useEffect(() => {
    let vale = true;
    (async () => {
      try {
        const cat = await carregarCatalogo();
        const m = await carregarMeuPlano(real, cat);
        if (!vale) return;
        setCatalogo(cat);
        setMeu(m);
        if (m.ciclo) setCiclo(m.ciclo);
      } catch (e) {
        if (vale) setFalhou(e.message);
      }
    })();
    return () => { vale = false; };
  }, [real]);

  useEffect(() => { titulo.current?.focus(); }, []);

  const confirmar = async () => {
    setEnviando(true);
    setErro("");
    try {
      const r = await trocarPlano(real, catalogo, alvo.plano.id, alvo.ciclo);
      setMeu(r);
      setAvisos(r.avisos || []);
      setAlvo(null);
      onAviso?.(`Pronto! Agora você está no plano ${r.plano.nome}.`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (falhou) return <div className="c-wrap pl"><p className="ed-erro" role="alert">{falhou}</p></div>;
  if (!catalogo || !meu) return <div className="c-wrap pl"><p role="status">Carregando os planos…</p></div>;

  const atual = meu.plano;
  const minhas = meu.acervos.filter((a) => a.papel === "dona");
  const deOutros = meu.acervos.filter((a) => a.papel !== "dona");
  const temAnual = catalogo.some((p) => p.valorAnual != null);

  return (
    <div className="c-wrap pl">
      <header className="pl-cab">
        <span className="mao">planos</span>
        <h1 tabIndex={-1} ref={titulo}>Escolha o plano da sua família</h1>
        <p>Compare os planos e mude quando quiser. Aqui é uma simulação: nenhum valor é cobrado.</p>
      </header>

      <section className="pl-atual" aria-labelledby="pl-atual-t">
        <div className="pl-atual-cab">
          <div>
            <h2 id="pl-atual-t" className="pl-quem">{perfil.nome} <span aria-hidden="true">·</span> Plano {atual.nome}</h2>
            <p className="pl-sub">
              {[meu.ciclo && (meu.ciclo === "anual" ? "Cobrança anual" : "Cobrança mensal"), meu.desde && `desde ${dataCurta(meu.desde)}`]
                .filter(Boolean).join(" · ") || "Sem cobrança"}
            </p>
          </div>
          <span className="pl-selo-atual"><Icone nome="estrela" tam={20} />Seu plano</span>
        </div>

        <ul className="pl-tem">
          <li><Icone nome="memorias" />{atual.espacoGb} GB de espaço para as fotos</li>
          <li><Icone nome="familia" />{pessoasTexto(atual)}</li>
          {atual.recursos.map((r) => <li key={r}><Icone nome="certo" />{r}</li>)}
        </ul>

        {minhas.map((a) => (
          <div className="pl-acervo" key={a.id}>
            <h3>{a.nome}</h3>
            <Uso rotulo="Espaço" usado={a.espaco.usadoBytes} limite={a.espaco.limiteBytes}
              texto={`${tamanho(a.espaco.usadoBytes)} de ${tamanho(a.espaco.limiteBytes)}`} passou={a.espaco.passou} />
            <Uso rotulo="Pessoas no acervo" usado={a.pessoas.usadas} limite={a.pessoas.limite}
              texto={`${a.pessoas.usadas} de ${a.pessoas.limite ?? "∞"}`} passou={a.pessoas.passou} />
          </div>
        ))}
        {deOutros.length > 0 && (
          <div className="pl-outros">
            {deOutros.map((a) => (
              <p key={a.id}><Icone nome="familia" />No acervo <b>{a.nome}</b>, vale o plano {a.plano} de {a.dona}: o espaço e as vagas de lá são dele.</p>
            ))}
          </div>
        )}
        {meu.demonstracao && <p className="pl-nota-demo">Conta de demonstração: a troca de plano vale só neste navegador.</p>}

        {avisos.length > 0 && (
          <div className="pl-previstos" role="status">
            <p><b>Plano trocado. Algumas coisas ficaram paradas:</b></p>
            <ul>{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </section>

      {temAnual && (
        <fieldset className="pl-ciclo">
          <legend>Ver preços</legend>
          {[["mensal", "Por mês"], ["anual", "Por ano (cerca de 2 meses grátis)"]].map(([v, t]) => (
            <label key={v} className={`aj-op${ciclo === v ? " on" : ""}`}>
              <input type="radio" name="pl-ciclo" value={v} checked={ciclo === v} onChange={() => setCiclo(v)} />
              <span>{t}</span>
            </label>
          ))}
        </fieldset>
      )}

      <ul className="pl-grade" aria-label="Planos">
        {catalogo.map((p) => {
          const ehAtual = p.id === atual.id;
          const cicloDoCartao = p.gratis ? null : ciclo;
          const mesmo = ehAtual && (meu.ciclo ?? null) === cicloDoCartao;
          const pr = preco(p, ciclo);
          const breve = [...p.emBreve, `${p.conversasMes} conversas guiadas por mês`];
          return (
            <li key={p.id} className={`pl-card${ehAtual ? " atual" : ""}`} aria-current={ehAtual ? "true" : undefined}>
              {ehAtual && <span className="pl-selo"><Icone nome="estrela" tam={18} />Seu plano</span>}
              <h3>{p.nome}</h3>
              <p className="pl-desc">{p.descricao}</p>
              <p className="pl-preco"><b>{pr.valor}</b> <span>{pr.rotulo}</span></p>
              {pr.equivalente && <p className="pl-equiv">{pr.equivalente}</p>}
              <ul className="pl-limites">
                <li><Icone nome="memorias" />{p.espacoGb} GB de espaço</li>
                <li><Icone nome="familia" />{pessoasTexto(p)}</li>
              </ul>
              <ul className="pl-rec">
                {p.recursos.map((r) => <li key={r}><Icone nome="certo" />{r}</li>)}
              </ul>
              <div className="pl-breve-bloco">
                <p className="pl-breve-t" id={`pl-breve-${p.id}`}><span className="pl-breve-selo">em breve</span></p>
                <ul className="pl-breve" aria-labelledby={`pl-breve-${p.id}`}>
                  {breve.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <button type="button" className={`btn ${ehAtual ? "btn-s" : "btn-p"} pl-escolher`} disabled={mesmo}
                onClick={() => { setErro(""); setAlvo({ plano: p, ciclo: cicloDoCartao }); }}
                aria-label={mesmo ? `${p.nome}: este já é o seu plano` : `Escolher o plano ${p.nome}`}>
                {mesmo ? "Seu plano atual" : ehAtual ? `Mudar para ${ciclo === "anual" ? "anual" : "mensal"}` : `Escolher ${p.nome}`}
              </button>
            </li>
          );
        })}
      </ul>

      <section className="pl-dif" aria-labelledby="pl-dif-t">
        <h2 id="pl-dif-t">As diferenças, lado a lado</h2>
        <div className="pl-tabela" role="region" aria-labelledby="pl-dif-t" tabIndex={0}>
          <table>
            <thead>
              <tr><th scope="col"><span className="sr">Recurso</span></th>{catalogo.map((p) => <th scope="col" key={p.id}>{p.nome}</th>)}</tr>
            </thead>
            <tbody>
              <tr><th scope="row">Por mês</th>{catalogo.map((p) => <td key={p.id}>{p.gratis ? "Grátis" : preco(p, "mensal").valor}</td>)}</tr>
              <tr><th scope="row">Por ano</th>{catalogo.map((p) => <td key={p.id}>{p.valorAnual != null ? preco(p, "anual").valor : "—"}</td>)}</tr>
              <tr><th scope="row">Espaço</th>{catalogo.map((p) => <td key={p.id}>{p.espacoGb} GB</td>)}</tr>
              <tr><th scope="row">Pessoas no acervo</th>{catalogo.map((p) => <td key={p.id}>{p.limitePessoas === 1 ? "Só você" : `Até ${p.limitePessoas}`}</td>)}</tr>
              <tr><th scope="row">Convidar a família</th>{catalogo.map((p) => <td key={p.id}>{p.convidaFamilia ? "Sim" : "Não"}</td>)}</tr>
              <tr><th scope="row">Feed da família, com comentários</th>{catalogo.map((p) => <td key={p.id}>{p.feedFamilia ? "Sim" : "Não"}</td>)}</tr>
              <tr><th scope="row">Conversas guiadas por mês <span className="pl-breve-selo">em breve</span></th>{catalogo.map((p) => <td key={p.id}>{p.conversasMes}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="pl-nota">Mudou para um plano menor do que você usa? Nada é apagado e ninguém sai do acervo: só os novos envios e convites ficam parados até o uso caber no plano.</p>
      </section>

      <Confirmar alvo={alvo} atual={atual} acervos={meu.acervos} enviando={enviando} erro={erro}
        onFechar={() => !enviando && setAlvo(null)} onConfirmar={confirmar} />
    </div>
  );
}
