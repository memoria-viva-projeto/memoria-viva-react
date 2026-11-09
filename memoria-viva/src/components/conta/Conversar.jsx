import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { BotaoOuvir, ComVoz } from "./voz.jsx";
import { Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";
import { menosMovimento } from "./efeitos.js";
import { novoId } from "./guardados.js";
import { abertura, lerConversa, montarAcervo, responder, salvarConversa, situacao } from "./conversa.js";

const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
const msgIA = (r) => ({ id: novoId("msg"), de: "ia", texto: r.texto, fontes: r.fontes || [], pessoas: r.pessoas || [] });

/** Selo de cada fonte: confirmada ou esperando a confirmação da pessoa. */
function Selo({ m }) {
  const s = situacao(m);
  return (
    <span className={`cz-selo${s.confirmada ? "" : " cz-selo-espera"}`}>
      {s.confirmada && <Icone nome="certo" tam={16} />}{s.texto}
    </span>
  );
}

function Capa({ m, tam }) {
  if (m.foto) return <img src={m.foto} alt="" loading="lazy" />;
  if (m.arq) return <Miniatura arq={m.arq} />;
  return <span className="cz-ic"><Icone nome={m.tipo} tam={tam} /></span>;
}

/** De onde veio a resposta: cada memória vira um link para ela. */
function Fontes({ ids, pessoas, itens }) {
  const fontes = ids.map((id) => itens.find((m) => m.id === id)).filter(Boolean);
  if (!fontes.length && !pessoas.length) return null;
  return (
    <div className="cz-fontes">
      <p className="cz-fontes-rot">De onde tirei</p>
      <ul>
        {fontes.map((m) => (
          <li key={m.id}>
            <Link className="cz-fonte" para={m.para}>
              <span className="cz-fonte-capa"><Capa m={m} tam={26} /></span>
              <span className="cz-fonte-txt">
                <b>{m.titulo}</b>
                {(m.quando || m.lugar) && <span>{[m.quando, m.lugar].filter(Boolean).join(" · ")}</span>}
                <Selo m={m} />
              </span>
            </Link>
          </li>
        ))}
        {pessoas.map((id) => (
          <li key={id}>
            <Link className="cz-fonte" para={`${ROTAS.familia}/${id}`}>
              <Avatar id={id} tam={48} />
              <span className="cz-fonte-txt"><b>{pessoa(id).nome}</b><span>Na sua família</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Mensagem({ m, itens }) {
  const ia = m.de === "ia";
  return (
    <li className={`cz-msg ${ia ? "cz-ia" : "cz-voce"}`}>
      <p className="cz-quem">{ia ? <><Icone nome="espiral" tam={18} />IA do Memória Viva</> : "Você"}</p>
      <div className="cz-balao">
        {m.texto.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        {ia && <Fontes ids={m.fontes || []} pessoas={m.pessoas || []} itens={itens} />}
      </div>
      {ia && <BotaoOuvir texto={m.texto} className="btn-l cz-ouvir" />}
    </li>
  );
}

/**
 * Conversar com a IA: contar lembranças e perguntar sobre o acervo.
 * Uma conversa por memória (e uma geral), guardadas neste navegador com o rascunho.
 */
export default function Conversar({ memorias, guardadas, carregou, perfil }) {
  const params = new URLSearchParams(window.location.search);
  const sobreId = params.get("sobre");
  const n = params.get("pergunta");
  const itens = montarAcervo(memorias, guardadas);
  const mem = sobreId ? itens.find((m) => m.id === sobreId) || null : null;
  const esperando = !!sobreId && !mem && !carregou; // as memórias guardadas ainda estão abrindo
  const pergunta = mem && n !== null ? CONTA.perguntas[Number(n)] || null : null;
  const chave = mem ? mem.id : "geral";

  const [conversa, setConversa] = useState(null);
  const [pensando, setPensando] = useState(false);
  const [confirmarNova, setConfirmarNova] = useState(false);
  const [semGuardar, setSemGuardar] = useState(false);
  const campoRef = useRef(null);
  const listaRef = useRef(null);
  const vivo = useRef(true);
  const atualId = useRef(null); // qual conversa está na tela agora
  const pedido = useRef(""); // não responde duas vezes à mesma mensagem
  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  const nova = () => {
    const a = abertura(mem, pergunta, perfil.nome);
    return { id: novoId("cv"), chave, mensagens: [msgIA(a)], rascunho: "", pergunta: pergunta ? n : null, avisou: false, ...a.estado };
  };

  const responderAgora = async (c) => {
    const vez = `${c.id}:${c.mensagens.length}`;
    if (pedido.current === vez) return;
    pedido.current = vez;
    setPensando(true);
    const [r] = await Promise.all([responder({ conversa: c, sobre: mem, itens }), pausa(menosMovimento() ? 250 : 800)]);
    if (!vivo.current) return; // saiu da tela: a resposta é refeita quando voltar
    // só entra na mesma conversa (não numa "Nova conversa" começada enquanto esperava)
    if (atualId.current !== c.id) return;
    setConversa((atual) => (atual?.id === c.id ? { ...atual, ...(r.estado || {}), mensagens: [...atual.mensagens, msgIA(r)] } : atual));
    setPensando(false);
  };

  // abrir (ou continuar) a conversa desta memória
  useEffect(() => {
    if (esperando) return;
    let c = lerConversa(chave);
    if (!c?.mensagens?.length) c = nova();
    else if (pergunta && c.pergunta !== n) {
      // veio de outra pergunta do dia: ela entra na mesma conversa
      c = { ...c, pergunta: n, perguntadas: [...(c.perguntadas || []), pergunta], mensagens: [...c.mensagens, msgIA({ texto: pergunta, fontes: [mem.id] })] };
    }
    c = { ...c, id: c.id || novoId("cv"), chave };
    atualId.current = c.id;
    setConversa(c);
    if (c.mensagens[c.mensagens.length - 1].de === "voce") responderAgora(c); // recarregou antes da resposta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, esperando]);

  // tudo fica guardado: mensagens e rascunho
  useEffect(() => {
    if (!conversa) return;
    atualId.current = conversa.id;
    setSemGuardar(!salvarConversa(conversa.chave, conversa));
  }, [conversa]);

  // mensagem nova: mostra ela (sem pular a tela na primeira abertura)
  const total = conversa?.mensagens.length || 0;
  const antes = useRef(null);
  useEffect(() => {
    if (antes.current !== null && (total > antes.current || pensando)) {
      listaRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: menosMovimento() ? "auto" : "smooth" });
    }
    if (conversa) antes.current = total;
  }, [total, pensando]);

  if (esperando || !conversa) {
    return <div className="c-wrap cz"><h1 className="hs-titulo" tabIndex={-1}>Conversar</h1><p role="status">Abrindo…</p></div>;
  }

  const mudar = (rascunho) => setConversa((c) => ({ ...c, rascunho }));

  const enviar = (e) => {
    e?.preventDefault();
    const texto = conversa.rascunho.trim();
    if (!texto) return campoRef.current?.focus();
    if (pensando) return;
    const c = { ...conversa, rascunho: "", mensagens: [...conversa.mensagens, { id: novoId("msg"), de: "voce", texto }] };
    setConversa(c);
    responderAgora(c);
  };

  const tecla = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) enviar(e);
  };

  const recomecar = () => {
    const c = nova();
    atualId.current = c.id;
    setPensando(false);
    setConfirmarNova(false);
    setConversa(c);
    campoRef.current?.focus();
  };

  return (
    <div className="c-wrap cz">
      <header className="cz-cab">
        <h1 className="hs-titulo" tabIndex={-1}>Conversar</h1>
        <p className="cz-demo">
          <Icone nome="espiral" tam={22} />
          <span><b>Demonstração.</b> As respostas usam só o que está no seu acervo e mostram de onde vieram. Nada é guardado, mudado ou confirmado sem você.</span>
        </p>
      </header>

      {sobreId && !mem && <p className="cz-aviso" role="status">Essa memória não está neste aparelho. Você pode perguntar sobre todo o acervo.</p>}

      {mem && (
        <section className="cz-sobre" aria-labelledby="cz-sobre-t">
          <div className={`cz-sobre-capa${mem.foto || mem.arq ? " foto cant" : ""}`}>
            {(mem.foto || mem.arq) && <span className="tape t-gema" style={{ left: "50%", top: -12, transform: "translateX(-50%) rotate(-3deg)" }} />}
            {mem.foto ? <img src={mem.foto} alt={mem.alt || ""} /> : <Capa m={mem} tam={40} />}
          </div>
          <div className="cz-sobre-txt">
            <span className="mao cz-sobre-rot">conversando sobre</span>
            <h2 id="cz-sobre-t" className="cz-sobre-t">{mem.titulo}</h2>
            {(mem.quando || mem.lugar) && <p className="cz-meta">{[mem.quando, mem.lugar].filter(Boolean).join(" · ")}</p>}
            <Selo m={mem} />
            <div className="cz-sobre-bt">
              <Link className="btn-l" para={mem.para}><Icone nome="ver" />Ver a memória</Link>
              <Link className="btn-l" para={ROTAS.conversar}><Icone nome="conversar" />Perguntar sobre todo o acervo</Link>
            </div>
          </div>
        </section>
      )}

      <section className="cz-conversa" aria-label="Conversa">
        <ol className="cz-lista" ref={listaRef} role="log" aria-live="polite" aria-relevant="additions">
          {conversa.mensagens.map((m) => <Mensagem key={m.id} m={m} itens={itens} />)}
          {pensando && (
            <li className="cz-msg cz-ia">
              <p className="cz-quem"><Icone nome="espiral" tam={18} />IA do Memória Viva</p>
              <div className="cz-balao"><span className="typing" aria-hidden="true"><i /><i /><i /></span><span className="sr">Procurando no seu acervo…</span></div>
            </li>
          )}
        </ol>

        <form className="cm-form cz-form" onSubmit={enviar}>
          <label htmlFor="cz-campo">{mem ? "Conte o que lembra ou faça uma pergunta" : "Faça uma pergunta ou conte uma lembrança"}</label>
          <ComVoz rotulo="sua mensagem" valor={conversa.rascunho} onMudar={mudar}>
            <textarea id="cz-campo" ref={campoRef} rows={3} value={conversa.rascunho} aria-describedby="cz-dica"
              onChange={(e) => mudar(e.target.value)} onKeyDown={tecla} />
          </ComVoz>
          <p id="cz-dica" className="cz-dica">Enter envia. Para pular linha, use Shift + Enter.</p>
          {semGuardar && <p className="cv-erro" role="alert">Este navegador não está deixando guardar a conversa. Ela pode sumir ao recarregar.</p>}
          <div className="cm-form-bt">
            <button type="submit" className="btn btn-p" aria-disabled={pensando || undefined}><Icone nome="enviar" />Enviar</button>
            {!confirmarNova && (
              <button type="button" className="btn-l" onClick={() => setConfirmarNova(true)}><Icone nome="trocar" />Nova conversa</button>
            )}
          </div>
          {confirmarNova && (
            <div className="fe-confirma" role="alert">
              <p>Começar uma conversa nova? Esta conversa sai deste aparelho. Suas memórias não mudam.</p>
              <button type="button" className="btn btn-p btn-sm" onClick={recomecar}><Icone nome="trocar" />Sim, começar de novo</button>
              <button type="button" className="btn-l" onClick={() => setConfirmarNova(false)}>Não, continuar esta</button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
