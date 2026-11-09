import { useContext, useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { BotaoOuvir, ComVoz } from "./voz.jsx";
import { Miniatura, useArquivo } from "./midia.jsx";
import { Janela } from "./campos.jsx";
import { Link, Navegar, ROTAS, conversarSobre } from "./rotas.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";
import { menosMovimento } from "./efeitos.js";
import { novoId } from "./guardados.js";
import { SOBRE, abertura, atalhosPara, lerConversa, listarConversas, montarAcervo, responder, salvarConversa, situacao } from "./conversa.js";

const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
const msgIA = (r) => ({ id: novoId("msg"), de: "ia", em: Date.now(), texto: r.texto, fontes: r.fontes || [], pessoas: r.pessoas || [] });
const temImagem = (m) => !!(m && (m.foto || m.arq));
const norm = (t = "") => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Selo de cada fonte: confirmada ou esperando a confirmação da pessoa. */
function Selo({ m }) {
  const s = situacao(m);
  return (
    <span className={`cz-selo${s.confirmada ? "" : " cz-selo-espera"}`}>
      {s.confirmada && <Icone nome="certo" tam={16} />}{s.texto}
    </span>
  );
}

/** Miniatura quadrada de qualquer memória (foto, arquivo guardado ou o ícone do tipo). */
function Capa({ m, tam }) {
  if (m.foto) return <img src={m.foto} alt="" loading="lazy" />;
  if (m.arq) return <Miniatura arq={m.arq} />;
  return <span className="cz-ic"><Icone nome={m.tipo} tam={tam} /></span>;
}

/** A foto inteira, sem cortar, na melhor resolução que houver. */
function FotoInteira({ m, className = "" }) {
  const r = useArquivo(m.foto ? null : m.arq, false);
  const src = m.foto || r?.url;
  if (!src) return <span className={`cz-img-espera ${className}`}><Icone nome="foto" tam={40} /></span>;
  return <img className={className} src={src} alt={m.alt || ""} />;
}

/** De onde veio a resposta: cada memória vira um cartãozinho que abre ela. */
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

/** Marca da IA (um ponto turquesa com a espiral). */
const MarcaIA = () => <span className="cz-marca" aria-hidden="true"><Icone nome="espiral" tam={20} /></span>;

/** Um balão. O nome de quem fala fica só para o leitor de tela: o lado e a cor já dizem. */
function Mensagem({ m, itens, seguida }) {
  const ia = m.de === "ia";
  return (
    <li className={`cz-msg ${ia ? "cz-ia" : "cz-voce"}${seguida ? " cz-seguida" : ""}`}>
      <div className="cz-balao">
        <p className="sr">{ia ? "IA do Memória Viva:" : "Você:"}</p>
        {m.texto.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        {ia && <Fontes ids={m.fontes || []} pessoas={m.pessoas || []} itens={itens} />}
      </div>
      {ia && <BotaoOuvir texto={m.texto} className="cz-ouvir" />}
    </li>
  );
}

/** Galeria para trocar de foto (com busca por título, ano, lugar e pessoa). */
function Galeria({ fotos, atual, buscar, onEscolher }) {
  const [q, setQ] = useState("");
  const buscaRef = useRef(null);
  // a janela põe o foco no "Fechar" ao abrir; em "Encontrar", o foco vai para a busca logo depois
  useEffect(() => { if (buscar) requestAnimationFrame(() => buscaRef.current?.focus()); }, [buscar]);
  const termos = norm(q).split(/\s+/).filter(Boolean);
  const achadas = fotos.filter((m) => {
    if (!termos.length) return true;
    const t = norm([m.titulo, m.quando, m.lugar, m.busca, ...m.pessoas.map((p) => pessoa(p).nome)].join(" "));
    return termos.every((w) => t.includes(w));
  });
  return (
    <div className="cz-galeria">
      <div className="ed-campo">
        <label htmlFor="cz-busca">Procurar uma foto</label>
        <input id="cz-busca" ref={buscaRef} type="text" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Título, ano, lugar ou pessoa" />
      </div>
      <p className="sr" role="status">{achadas.length} {achadas.length === 1 ? "foto" : "fotos"}</p>
      {achadas.length ? (
        <ul className="cz-grade">
          {achadas.map((m) => (
            <li key={m.id}>
              <button type="button" className="cz-grade-it" onClick={() => onEscolher(m.id)} aria-current={m.id === atual || undefined}>
                <span className="cz-grade-capa"><Capa m={m} tam={30} /></span>
                <span className="cz-grade-t">{m.titulo}</span>
                {m.quando && <span className="cz-grade-q">{m.quando}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="cz-vazio">Nenhuma foto com “{q}”. Tente outra palavra.</p>}
      <Link className="btn btn-s" para={`${ROTAS.guardar}/foto`}><Icone nome="enviarfoto" />Guardar uma foto nova</Link>
    </div>
  );
}

/** Conversas já começadas neste aparelho, para continuar. */
function Conversas({ itens, atual, onAbrir }) {
  const todas = listarConversas();
  if (!todas.length) return <p className="cz-vazio">Ainda não há conversas guardadas neste aparelho.</p>;
  return (
    <ul className="cz-conversas">
      {todas.map((c) => {
        const m = c.chave === "geral" ? null : itens.find((x) => x.id === c.chave);
        if (c.chave !== "geral" && !m) return null;
        const ultima = c.mensagens[c.mensagens.length - 1];
        return (
          <li key={c.chave}>
            <button type="button" className="cz-conv-it" onClick={() => onAbrir(c.chave)} aria-current={c.chave === atual || undefined}>
              <span className="cz-conv-capa">{m ? <Capa m={m} tam={26} /> : <MarcaIA />}</span>
              <span className="cz-conv-txt">
                <b>{m ? m.titulo : "Sobre o acervo todo"}</b>
                <span>{ultima.de === "voce" ? "Você: " : ""}{ultima.texto}</span>
              </span>
              <span className="cz-conv-n">{c.mensagens.length}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Foto em tela cheia. Fecha com Esc, com o botão ou tocando fora. */
function TelaCheia({ mem, aberta, onFechar }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (aberta && !d.open) d.showModal();
    else if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <dialog ref={ref} className="cz-tela" aria-label={`Foto: ${mem?.titulo || ""}`} onClose={() => aberta && onFechar()}
      onClick={(e) => e.target === e.currentTarget && onFechar()}>
      {aberta && mem && (
        <>
          <FotoInteira m={mem} className="cz-tela-img" />
          <p className="cz-tela-leg">{mem.titulo}{mem.quando ? ` · ${mem.quando}` : ""}</p>
          <button type="button" className="cz-tela-fechar" onClick={onFechar} autoFocus><Icone nome="fechar" />Voltar à conversa</button>
        </>
      )}
    </dialog>
  );
}

/**
 * Conversar com a IA: a foto em destaque, a conversa ao lado (embaixo, no celular).
 * Uma conversa por memória (e uma geral), guardadas neste navegador com o rascunho.
 */
export default function Conversar({ memorias, guardadas, carregou, perfil, onAbrirAjuda }) {
  const ir = useContext(Navegar);
  const params = new URLSearchParams(window.location.search);
  const sobreId = params.get("sobre");
  const n = params.get("pergunta");
  const itens = montarAcervo(memorias, guardadas);
  const fotos = itens.filter(temImagem);
  const mem = sobreId ? itens.find((m) => m.id === sobreId) || null : null;
  const esperando = !!sobreId && !mem && !carregou; // as memórias guardadas ainda estão abrindo
  const pergunta = mem && n !== null ? CONTA.perguntas[Number(n)] || null : null;
  const chave = mem ? mem.id : "geral";

  const [conversa, setConversa] = useState(null);
  const [pensando, setPensando] = useState(false);
  const [confirmarNova, setConfirmarNova] = useState(false);
  const [semGuardar, setSemGuardar] = useState(false);
  const [janela, setJanela] = useState(null); // "trocar" | "buscar" | "continuar" | "mais"
  const [ampliada, setAmpliada] = useState(false);
  const campoRef = useRef(null);
  const roloRef = useRef(null);
  const telaRef = useRef(null);
  const chatRef = useRef(null);
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

  // como no WhatsApp: abre no fim da conversa, e cada mensagem nova rola até ela
  const total = conversa?.mensagens.length || 0;
  const antes = useRef(null);
  useEffect(() => {
    const rolo = roloRef.current;
    if (!rolo) return;
    const primeira = antes.current === null;
    rolo.scrollTo({ top: rolo.scrollHeight, behavior: primeira || menosMovimento() ? "auto" : "smooth" });
    if (conversa) antes.current = total;
  }, [total, pensando, !!conversa]);

  // celular: a tela acompanha a área visível (o teclado não esconde o campo nem a última mensagem)
  const pronta = !!conversa && !esperando;
  useEffect(() => {
    const vv = window.visualViewport, el = telaRef.current;
    if (!vv || !el) return;
    const ajustar = () => {
      const rolo = roloRef.current;
      const noFim = rolo && rolo.scrollHeight - rolo.scrollTop - rolo.clientHeight < 80;
      el.style.setProperty("--vvh", `${vv.height}px`);
      el.style.setProperty("--vvtop", `${vv.offsetTop}px`);
      if (noFim) requestAnimationFrame(() => rolo.scrollTo({ top: rolo.scrollHeight }));
      // celular: digitando, a tela fica na conversa
      if (document.activeElement === campoRef.current) requestAnimationFrame(() => chatRef.current?.scrollIntoView({ block: "end" }));
    };
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => { vv.removeEventListener("resize", ajustar); vv.removeEventListener("scroll", ajustar); };
  }, [pronta]);

  if (esperando || !conversa) {
    return <div className="cz cz-abrindo"><h1 className="sr" tabIndex={-1}>Conversar</h1><p role="status">Abrindo…</p></div>;
  }

  const mudar = (rascunho) => setConversa((c) => ({ ...c, rascunho }));

  const mandar = (texto) => {
    if (pensando || !texto) return;
    const c = { ...conversa, rascunho: "", atualizada: Date.now(), mensagens: [...conversa.mensagens, { id: novoId("msg"), de: "voce", em: Date.now(), texto }] };
    setConversa(c);
    responderAgora(c);
  };

  const enviar = (e) => {
    e?.preventDefault();
    const texto = conversa.rascunho.trim();
    if (!texto) return campoRef.current?.focus();
    mandar(texto);
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

  const novaConversa = () => { setJanela(null); setConfirmarNova(true); campoRef.current?.focus(); };
  // celular: tela 1 = a foto, tela 2 = a conversa (no computador ficam lado a lado e isto não muda nada)
  const suave = () => (menosMovimento() ? "auto" : "smooth");
  const irConversa = () => chatRef.current?.scrollIntoView({ behavior: suave(), block: "start" });
  const irFoto = () => telaRef.current?.scrollTo({ top: 0, behavior: suave() });
  const irPara = (id) => { setJanela(null); ir(id === "geral" ? ROTAS.conversar : conversarSobre(id)); };

  const ditas = new Set(conversa.mensagens.filter((m) => m.de === "voce").map((m) => m.texto));
  const atalhos = atalhosPara(mem).filter((t) => !ditas.has(t)).slice(0, 4);
  const leitura = mem ? [mem.titulo, mem.quando, mem.lugar, mem.historia].filter(Boolean).join(". ") : "";

  const img = temImagem(mem);
  const meta = mem ? [mem.quando, mem.lugar].filter(Boolean).join(" · ") : "Escolha uma foto para conversar sobre ela";

  return (
    <div className="cz" ref={telaRef}>
      <h1 className="sr" tabIndex={-1}>Conversar{mem ? ` sobre ${mem.titulo}` : ""}</h1>

      {/* ---- a foto ---- */}
      <section className="cz-foto" aria-labelledby="cz-foto-t">
        {/* formas de cor (gema, urucum, turquesa) que se mexem devagar atrás da foto */}
        <span className="cz-forma cz-forma-1" aria-hidden="true" />
        <span className="cz-forma cz-forma-2" aria-hidden="true" />
        <span className="cz-forma cz-forma-3" aria-hidden="true" />
        <div className="cz-quadro">
          {img ? (
            <button type="button" className="cz-ampliar" onClick={() => setAmpliada(true)} aria-label="Ver a foto em tela cheia">
              <FotoInteira m={mem} className="cz-img" />
            </button>
          ) : mem ? (
            <span className="cz-tipo" aria-hidden="true"><Icone nome={mem.tipo} tam={64} /></span>
          ) : (
            <button type="button" className="cz-mosaico" onClick={() => setJanela("trocar")} aria-label="Escolher uma foto">
              {fotos.slice(0, 6).map((m) => <span key={m.id}><Capa m={m} tam={28} /></span>)}
            </button>
          )}
          {/* celular: três ícones discretos sobre a foto */}
          <div className="cz-icones" role="toolbar" aria-label="Ações da foto">
            <button type="button" className="cz-ico" onClick={() => setJanela("trocar")} aria-label={mem ? "Trocar foto" : "Escolher uma foto"}><Icone nome="trocar" tam={20} /></button>
            <button type="button" className="cz-ico" onClick={() => setJanela("buscar")} aria-label="Encontrar outras fotos"><Icone nome="buscar" tam={20} /></button>
            <button type="button" className="cz-ico" onClick={() => setJanela("mais")} aria-label="Mais opções" aria-haspopup="dialog"><Icone nome="opcoes" tam={20} /></button>
          </div>
        </div>
        <div className="cz-legenda">
          <div className="cz-legenda-txt">
            <h2 id="cz-foto-t">{mem ? mem.titulo : "Conversa sobre o acervo todo"}</h2>
            {meta && <p>{meta}</p>}
          </div>
          <div className="cz-legenda-acoes">
            <button type="button" className="cz-btn" onClick={() => setJanela("trocar")}><Icone nome="trocar" tam={20} />{mem ? "Trocar foto" : "Escolher foto"}</button>
            <button type="button" className="cz-btn" onClick={() => setJanela("buscar")}><Icone nome="buscar" tam={20} />Buscar</button>
          </div>
        </div>
        <button type="button" className="cz-ir" onClick={irConversa}>
          <Icone nome="conversar" />{mem ? `Conversar sobre ${SOBRE[mem.tipo] || "esta memória"}` : "Ir para a conversa"}
          <span className="cz-seta" aria-hidden="true"><Icone nome="voltar" tam={20} /></span>
        </button>
      </section>

      {/* ---- a conversa ---- */}
      <section className="cz-chat" aria-label="Conversa" ref={chatRef}>
        <button type="button" className="cz-volta" onClick={irFoto}>
          <span className="cz-volta-capa">{mem ? <Capa m={mem} tam={24} /> : <MarcaIA />}</span>
          <span className="cz-volta-t"><b>{mem ? mem.titulo : "Conversa sobre o acervo"}</b><span>Ver a foto</span></span>
          <span className="cz-seta cz-seta-cima" aria-hidden="true"><Icone nome="voltar" tam={20} /></span>
        </button>
        <header className="cz-cab">
          <MarcaIA />
          <p className="cz-cab-t"><b>IA do Memória Viva</b><span className="cz-etiqueta">Demonstração</span></p>
          <button type="button" className="cz-btn" onClick={novaConversa} aria-label="Nova conversa"><Icone nome="mais" tam={20} /><span className="cz-longo">Nova conversa</span><span className="cz-curto" aria-hidden="true">Nova</span></button>
          <button type="button" className="cz-btn cz-btn-ico" onClick={() => setJanela("mais")} aria-label="Mais opções" aria-haspopup="dialog"><Icone nome="opcoes" tam={20} /></button>
        </header>

        <div className="cz-rolo" ref={roloRef}>
          {sobreId && !mem && <p className="cz-aviso" role="status">Essa memória não está neste aparelho. Você pode perguntar sobre todo o acervo.</p>}
          <ol className="cz-lista" role="log" aria-live="polite" aria-relevant="additions">
            {conversa.mensagens.map((m, i) => (
              <Mensagem key={m.id} m={m} itens={itens} seguida={i > 0 && conversa.mensagens[i - 1].de === m.de} />
            ))}
            {pensando && (
              <li className="cz-msg cz-ia">
                <div className="cz-balao"><span className="typing" aria-hidden="true"><i /><i /><i /></span><span className="sr">Procurando no seu acervo…</span></div>
              </li>
            )}
          </ol>
        </div>

        <form className="cz-form" onSubmit={enviar}>
          {confirmarNova && (
            <div className="fe-confirma cz-confirma" role="alert">
              <p>Começar uma conversa nova? Esta conversa sai deste aparelho. Suas memórias não mudam.</p>
              <button type="button" className="btn btn-p btn-sm" onClick={recomecar}><Icone nome="trocar" />Sim, começar de novo</button>
              <button type="button" className="btn-l" onClick={() => setConfirmarNova(false)}>Não, continuar esta</button>
            </div>
          )}
          {atalhos.length > 0 && (
            <div className="cz-atalhos" role="group" aria-label="Perguntas rápidas">
              {atalhos.map((t) => (
                <button key={t} type="button" className="cz-atalho" onClick={() => mandar(t)} aria-disabled={pensando || undefined}>{t}</button>
              ))}
            </div>
          )}
          <div className="cz-escrever">
            <label htmlFor="cz-campo" className="sr">{mem ? "Conte o que lembra ou faça uma pergunta" : "Faça uma pergunta ou conte uma lembrança"}</label>
            <ComVoz rotulo="sua mensagem" valor={conversa.rascunho} onMudar={mudar} className="cz-campo">
              <textarea id="cz-campo" ref={campoRef} rows={1} value={conversa.rascunho} aria-describedby="cz-dica"
                placeholder={mem ? "Conte ou pergunte…" : "Pergunte ou conte…"}
                onChange={(e) => mudar(e.target.value)} onKeyDown={tecla} onFocus={irConversa} />
            </ComVoz>
            <button type="submit" className="cz-enviar" aria-disabled={pensando || undefined}>
              <Icone nome="enviar" tam={22} /><span className="sr">Enviar</span>
            </button>
          </div>
          <p id="cz-dica" className="sr">Enter envia. Para pular linha, use Shift + Enter.</p>
          {semGuardar && <p className="cv-erro" role="alert">Este navegador não está deixando guardar a conversa. Ela pode sumir ao recarregar.</p>}
        </form>
      </section>

      <TelaCheia mem={mem} aberta={ampliada} onFechar={() => setAmpliada(false)} />

      <Janela id="cz-fotos" className="cz-janela" aberta={janela === "trocar" || janela === "buscar"} onFechar={() => setJanela(null)}
        titulo={janela === "buscar" ? "Encontrar outras fotos" : "Trocar a foto da conversa"}>
        <Galeria fotos={fotos} atual={mem?.id} buscar={janela === "buscar"} onEscolher={irPara} />
      </Janela>

      <Janela id="cz-conversas" className="cz-janela" aberta={janela === "continuar"} onFechar={() => setJanela(null)} titulo="Continuar uma conversa">
        <Conversas itens={itens} atual={chave} onAbrir={irPara} />
      </Janela>

      <Janela id="cz-mais" className="cz-janela" aberta={janela === "mais"} onFechar={() => setJanela(null)} titulo="Mais opções">
        <div className="cz-mais">
          {temImagem(mem) && (
            <button type="button" className="btn btn-s" onClick={() => { setJanela(null); setAmpliada(true); }}><Icone nome="ver" />Ver a foto em tela cheia</button>
          )}
          <button type="button" className="btn btn-s cz-so-celular" onClick={novaConversa}><Icone nome="mais" />Nova conversa</button>
          <button type="button" className="btn btn-s" onClick={() => setJanela("continuar")}><Icone nome="conversar" />Continuar outra conversa</button>
          {mem && <Link className="btn btn-s" para={mem.para}><Icone nome="memorias" />Ver a memória completa</Link>}
          {mem && <BotaoOuvir texto={leitura} rotulo={`Ouvir sobre ${SOBRE[mem.tipo] || "esta memória"}`} className="btn btn-s" />}
          {mem && <Link className="btn btn-s" para={ROTAS.conversar}><Icone nome="espiral" />Perguntar sobre todo o acervo</Link>}
          {/* no celular a barra do topo (com a Ajuda) some nesta tela: a Ajuda fica aqui */}
          {onAbrirAjuda && <button type="button" className="btn btn-s cz-so-celular" onClick={() => { setJanela(null); onAbrirAjuda(); }}><Icone nome="ajuda" />Ajuda</button>}
        </div>
      </Janela>
    </div>
  );
}
