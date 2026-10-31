import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { CONTA, pessoa } from "../../dados/conta.js";

const GIROS = [-2, 1.5, -1, 2.5, -2.5, 1];
const FITAS = ["t-gema", "t-turq", "t-uru", "t-azul"];

function tempo(dias) {
  if (dias < 1) return "hoje";
  if (dias < 2) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  const semanas = Math.floor(dias / 7);
  return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
}

const minSeg = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Selo({ m, seloRef }) {
  let classe = "selo-voce", icone = "certo", texto = "Contada por você";
  if (m.origem.tipo === "familia") {
    if (m.status === "confirmada") texto = "Confirmada por você";
    else { classe = "selo-familia"; icone = "familia"; texto = `Enviada por ${pessoa(m.origem.por).nome}`; }
  }
  return <span className={`selo ${classe}`} ref={seloRef} tabIndex={-1}><Icone nome={icone} tam={18} />{texto}</span>;
}

/** Relato em áudio. Por enquanto, sem gravação de verdade: o tocador só mostra o andamento. */
function Audio({ duracao }) {
  const [tocando, setTocando] = useState(false);
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    if (!tocando) return;
    const t = setInterval(() => setSeg((s) => {
      if (s + 1 >= duracao) { setTocando(false); return 0; }
      return s + 1;
    }), 1000);
    return () => clearInterval(t);
  }, [tocando, duracao]);

  return (
    <div className={`audio${tocando ? " on" : ""}`}>
      <button type="button" className="audio-bt" onClick={() => setTocando(!tocando)} aria-pressed={tocando}>
        <Icone nome={tocando ? "pausar" : "ouvir"} tam={26} />{tocando ? "Pausar" : "Ouvir"}
      </button>
      <div className="audio-meio">
        <span className="audio-t">Seu relato · {Math.floor(duracao / 60)} min {duracao % 60} s</span>
        <span className="audio-onda" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <i key={i} style={{ "--h": `${30 + ((i * 37) % 70)}%`, "--dl": `${(i % 7) * -0.12}s`, opacity: seg / duracao > i / 26 ? 1 : 0.45 }} />
          ))}
        </span>
        {tocando && <span className="audio-tempo">{minSeg(seg)} de {minSeg(duracao)}</span>}
      </div>
    </div>
  );
}

function Reacoes({ m, onMudar }) {
  const [escrevendo, setEscrevendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [todos, setTodos] = useState(false);
  const campoRef = useRef(null);

  useEffect(() => { if (escrevendo) campoRef.current.focus(); }, [escrevendo]);

  const lembro = m.comentarios.some((c) => c.lembro);
  const alternarLembro = () => onMudar((x) => ({
    ...x,
    comentarios: lembro ? x.comentarios.filter((c) => !c.lembro) : [...x.comentarios, { de: CONTA.pessoa.id, texto: "Eu me lembro também.", lembro: true }],
  }));
  const enviar = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    onMudar((x) => ({ ...x, comentarios: [...x.comentarios, { de: CONTA.pessoa.id, texto: texto.trim() }] }));
    setTexto(""); setEscrevendo(false);
  };

  const nomes = m.emocionaram.map((id) => pessoa(id).nome);
  const frase = nomes.length === 0 ? null
    : nomes.length === 1 ? `${nomes[0]} se emocionou`
    : nomes.length === 2 ? `${nomes[0]} e ${nomes[1]} se emocionaram`
    : `${nomes[0]}, ${nomes[1]} e mais ${nomes.length - 2} se emocionaram`;
  const visiveis = todos ? m.comentarios : m.comentarios.slice(-2);

  return (
    <footer className="cm-rodape">
      {frase && <p className="cm-emocao"><Icone nome="coracao" tam={20} />{frase}</p>}

      <div className="cm-acoes">
        <button type="button" className={`btn btn-s btn-sm${lembro ? " on" : ""}`} aria-pressed={lembro} onClick={alternarLembro}>
          <Icone nome="lembro" />Eu me lembro também
        </button>
        <button type="button" className="btn btn-s btn-sm" onClick={() => setEscrevendo(true)} aria-expanded={escrevendo}>
          <Icone nome="comentar" />Comentar
        </button>
      </div>

      {m.comentarios.length > 0 && (
        <ul className="cm-coments" aria-label="Comentários">
          {visiveis.map((c, i) => (
            <li key={i} className={c.lembro ? "lembro" : undefined}>
              <Avatar id={c.de} tam={40} />
              <p><b>{pessoa(c.de).nome}</b> {c.texto}</p>
            </li>
          ))}
        </ul>
      )}
      {m.comentarios.length > 2 && (
        <button type="button" className="btn-l" onClick={() => setTodos(!todos)}>
          <Icone nome="comentar" />{todos ? "Mostrar menos" : `Ver todos os ${m.comentarios.length} comentários`}
        </button>
      )}

      {escrevendo && (
        <form className="cm-form" onSubmit={enviar}>
          <label htmlFor={`com-${m.id}`}>Seu comentário</label>
          <textarea id={`com-${m.id}`} ref={campoRef} rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="cm-form-bt">
            <button type="submit" className="btn btn-p btn-sm"><Icone nome="enviar" />Enviar</button>
            <button type="button" className="btn-l" onClick={() => { setEscrevendo(false); setTexto(""); }}>
              <Icone nome="fechar" />Cancelar
            </button>
          </div>
        </form>
      )}
    </footer>
  );
}

/** Uma publicação da história da Maria. */
export function CartaoMemoria({ m, i, onConfirmar, onMudar, onAviso }) {
  const seloRef = useRef(null);
  const autor = m.origem.tipo === "maria" ? CONTA.pessoa.id : m.origem.por;
  const aguardando = m.status === "aguardando";

  const confirmar = (e) => {
    onConfirmar(m.id, e.currentTarget);
    requestAnimationFrame(() => seloRef.current?.focus());
  };

  return (
    <article className="cm entra" id={`mem-${m.id}`} style={{ "--i": i }} aria-labelledby={`t-${m.id}`}>
      <header className="cm-cab">
        <Avatar id={autor} tam={52} />
        <div className="cm-quem">
          <b>{pessoa(autor).nome}</b>
          <span>{tempo(m.publicadaHaDias)}</span>
        </div>
        <Selo m={m} seloRef={seloRef} />
      </header>

      <div className="cm-foto">
        <figure className="foto leg" style={{ transform: `rotate(${GIROS[i % GIROS.length]}deg)` }}>
          <span className={`tape ${FITAS[i % FITAS.length]}`} style={{ left: "50%", top: -13, transform: "translateX(-50%) rotate(3deg)" }} />
          <img src={m.foto} alt={m.alt} loading="lazy" />
          <figcaption className="lg">{m.legenda}</figcaption>
        </figure>
      </div>

      <h3 id={`t-${m.id}`} className="cm-titulo">{m.titulo}</h3>
      {m.receita && <p className="cm-receita"><Icone nome="receita" tam={20} />Receita: {m.receita}</p>}
      {m.texto ? (
        <>
          <p className="cm-trecho">{m.texto}</p>
          <button type="button" className="btn-l" onClick={() => onAviso()}><Icone nome="ler" />Ler a história toda</button>
        </>
      ) : m.origem.tipo === "maria" && (
        <p className="cm-semtexto">Você ainda não contou a história desta foto.</p>
      )}

      {m.audio && <Audio duracao={m.audio.duracao} />}

      {m.sugestaoIA && (
        <div className="ia-nota">
          <span className="selo selo-ia"><Icone nome="espiral" tam={18} />Sugestão da IA</span>
          <p>{m.sugestaoIA.texto}</p>
        </div>
      )}

      {m.pessoas.length > 0 && (
        <div className="cm-pessoas">
          <span className="cm-rot">Quem aparece</span>
          <ul className="chips">
            {m.pessoas.map((id) => <li key={id}><Avatar id={id} tam={32} />{pessoa(id).nome}</li>)}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn-s cm-conversar" onClick={() => onAviso()}>
        <Icone nome="conversar" />Conversar sobre esta foto
      </button>

      {aguardando && (
        <div className="cm-confirma">
          <p>Está do jeito que você lembra?</p>
          <div className="cm-confirma-bt">
            <button type="button" className="btn btn-p" onClick={confirmar}><Icone nome="certo" />Está certo</button>
            <button type="button" className="btn btn-s" onClick={() => onAviso()}><Icone nome="corrigir" />Corrigir</button>
          </div>
        </div>
      )}

      <Reacoes m={m} onMudar={onMudar} />
    </article>
  );
}

/** Cartão especial entre o 2º e o 3º: um conselho da Maria. */
export function CartaoConselho({ m, i, onAviso }) {
  return (
    <article className="cm cm-conselho entra" style={{ "--i": i }} aria-labelledby={`t-${m.id}`}>
      <span className="cm-rot"><Icone nome="conselho" tam={20} />Um conselho seu</span>
      <p id={`t-${m.id}`} className="cm-frase">“{m.frase}”</p>
      <span className="mao cm-guardado">Guardado para {m.guardadoPara}</span>
      <button type="button" className="btn btn-p" onClick={() => onAviso()}><Icone nome="conselho" />Deixar mais um conselho</button>
    </article>
  );
}
