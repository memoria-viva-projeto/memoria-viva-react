import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { BotaoOuvir, ComVoz } from "./voz.jsx";
import { Campo } from "./campos.jsx";
import { reduzirFoto } from "./efeitos.js";
import { CAPAS, GOSTOS, idade } from "../../dados/conta.js";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Uma pergunta por etapa. Toda etapa pode ser pulada e retomada depois.
const ETAPAS = [
  { id: "foto", pergunta: "Qual foto mostra você do seu jeito?", dica: "Pode ser uma foto de hoje ou uma antiga de que você goste." },
  { id: "capa", pergunta: "Qual destes lugares parece com a sua casa?", dica: "São fotos ilustrativas, só para enfeitar o alto do seu perfil. Toque para escolher." },
  { id: "nome", pergunta: "Como você se chama?", dica: "E como gosta que as pessoas chamem você." },
  { id: "nascimento", pergunta: "Quando você nasceu?", dica: "Com a data, a idade aparece sozinha no perfil." },
  { id: "origem", pergunta: "De onde você é e o que fez na vida?", dica: "Responda só o que quiser." },
  { id: "apresentacao", pergunta: "Como você se apresentaria para um bisneto?", dica: "Duas ou três frases bastam. Pode falar em vez de escrever." },
  { id: "gostos", pergunta: "Do que você gosta?", dica: "Toque em quantas quiser. As fotos só ilustram cada gosto." },
  { id: "favoritos", pergunta: "E os seus preferidos?", dica: "Uma comida, uma música e um lugar." },
];

/** Edição do perfil em etapas curtas: uma pergunta por vez, com exemplo, ditado e "pular". */
export default function EditarPerfil({ perfil, onGuardar, onSair }) {
  const inicial = Math.max(0, ETAPAS.findIndex((e) => e.id === new URLSearchParams(window.location.search).get("passo")));
  const [i, setI] = useState(inicial);
  const [form, setForm] = useState(() => ({ ...perfil, favoritos: { ...perfil.favoritos }, interesses: [...(perfil.interesses || [])], outrosGostos: [...(perfil.outrosGostos || [])] }));
  const [erro, setErro] = useState({});
  const [novoGosto, setNovoGosto] = useState("");
  const [pronto, setPronto] = useState(false);
  const tituloRef = useRef(null);
  const arquivoRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => { if (i !== inicial || pronto) tituloRef.current?.focus(); }, [i, pronto]); // eslint-disable-line react-hooks/exhaustive-deps

  const etapa = ETAPAS[i];
  const mudar = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v }));
  const mudarFav = (campo) => (v) => setForm((f) => ({ ...f, favoritos: { ...f.favoritos, [campo]: v } }));

  const [ano, mes, dia] = (form.nascimento || "--").split("-");
  const mudarData = (parte, v) => {
    const d = { ano, mes, dia, [parte]: v };
    setForm((f) => ({ ...f, nascimento: d.ano || d.mes || d.dia ? `${d.ano || ""}-${d.mes || ""}-${d.dia || ""}` : "" }));
  };
  const dataCompleta = /^\d{4}-\d{2}-\d{2}$/.test(form.nascimento || "");
  const anos = dataCompleta ? idade(form.nascimento) : null;

  const escolherFoto = async (e) => {
    const arq = e.target.files[0];
    e.target.value = "";
    if (!arq) return;
    try { setForm((f) => ({ ...f, foto: undefined })); const foto = await reduzirFoto(arq); setForm((f) => ({ ...f, foto })); setErro({}); }
    catch { setForm((f) => ({ ...f, foto: perfil.foto })); setErro({ geral: "Não deu para abrir essa foto. Tente outra." }); }
  };

  const alternarGosto = (id) => setForm((f) => ({
    ...f, interesses: f.interesses.includes(id) ? f.interesses.filter((x) => x !== id) : [...f.interesses, id],
  }));
  const juntarGosto = (txt) => {
    const t = txt.trim();
    if (t && !form.outrosGostos.includes(t)) setForm((f) => ({ ...f, outrosGostos: [...f.outrosGostos, t] }));
    setNovoGosto("");
  };

  // guarda o que já foi respondido (dá para sair no meio e continuar depois)
  const guardar = () => {
    const limpo = { ...form, nome: (form.nome || "").trim(), nomeCompleto: (form.nomeCompleto || "").trim() };
    if (!dataCompleta) limpo.nascimento = perfil.nascimento;
    if (!limpo.nome || !limpo.nomeCompleto) { limpo.nome ||= perfil.nome; limpo.nomeCompleto ||= perfil.nomeCompleto; }
    if (!onGuardar(limpo)) { setErro({ geral: "Não deu para guardar neste aparelho. Tente uma foto menor." }); return false; }
    return true;
  };

  const continuar = () => {
    if (etapa.id === "nome" && !(form.nomeCompleto || "").trim()) {
      setErro({ nomeCompleto: "Escreva seu nome, ou toque em “Pular”." });
      return document.getElementById("ed-nomeCompleto").focus();
    }
    if (etapa.id === "nascimento" && form.nascimento && !dataCompleta) {
      setErro({ data: "Falta o dia, o mês ou o ano. Ou toque em “Pular”." });
      return;
    }
    setErro({});
    if (!guardar()) return;
    if (i === ETAPAS.length - 1) setPronto(true); else setI(i + 1);
  };

  if (pronto) {
    return (
      <div className="c-wrap ed">
        <div className="ed-cartao ed-pronto">
          <img src={form.foto} alt="" />
          <h1 ref={tituloRef} tabIndex={-1}>Pronto! Seu perfil está do seu jeito.</h1>
          <p>Quando quiser, dá para mudar qualquer parte de novo.</p>
          <button type="button" className="btn btn-p" onClick={onSair}><Icone nome="certo" />Ver meu perfil</button>
        </div>
      </div>
    );
  }

  return (
    <div className="c-wrap ed">
      <div className="ed-topo">
        <p className="ed-passo">Parte {i + 1} de {ETAPAS.length}</p>
        <ol className="ed-trilha" aria-hidden="true">
          {ETAPAS.map((e, k) => <li key={e.id} className={k < i ? "feito" : k === i ? "agora" : undefined} />)}
        </ol>
        <button type="button" className="btn-l" onClick={() => guardar() && onSair()}><Icone nome="sair" />Continuar depois</button>
      </div>

      <section className="ed-cartao" aria-labelledby="ed-pergunta">
        <h1 id="ed-pergunta" className="ed-pergunta" ref={tituloRef} tabIndex={-1}>{etapa.pergunta}</h1>
        <p className="ed-dica-grande">{etapa.dica}</p>
        <BotaoOuvir texto={`${etapa.pergunta} ${etapa.dica}`} rotulo="Ouvir a pergunta" />

        <div className="ed-corpo">
          {etapa.id === "foto" && (
            <div className="ed-foto">
              {form.foto ? <img src={form.foto} alt="Sua foto de perfil" /> : <span className="ed-foto-carregando">Abrindo a foto…</span>}
              <div className="ed-foto-bt">
                <button type="button" className="btn btn-s" onClick={() => arquivoRef.current.click()}><Icone nome="memorias" />Escolher uma foto</button>
                <button type="button" className="btn btn-s ed-camera" onClick={() => cameraRef.current.click()}><Icone nome="foto" />Tirar uma foto agora</button>
                {form.foto && form.foto !== perfil.foto && (
                  <button type="button" className="btn-l" onClick={() => setForm({ ...form, foto: perfil.foto })}><Icone nome="trocar" />Voltar à foto anterior</button>
                )}
              </div>
              <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={escolherFoto} />
              <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={escolherFoto} />
            </div>
          )}

          {etapa.id === "capa" && (
            <fieldset className="ed-escolhas">
              <legend className="sr">Foto de capa</legend>
              {CAPAS.map((c) => (
                <label key={c.id} className={`ed-escolha${form.capa === c.id ? " on" : ""}`}>
                  <input type="radio" name="capa" checked={form.capa === c.id} onChange={() => setForm({ ...form, capa: c.id })} />
                  <img src={c.foto} alt="" />
                  <span>{form.capa === c.id && <Icone nome="certo" tam={20} />}{c.nome}</span>
                </label>
              ))}
            </fieldset>
          )}

          {etapa.id === "nome" && (
            <div className="ed-campos">
              <Campo id="ed-nomeCompleto" rotulo="Nome completo" valor={form.nomeCompleto} onMudar={mudar("nomeCompleto")} exemplo="Maria de Lourdes Ferreira" erro={erro.nomeCompleto} obrigatorio />
              <Campo id="ed-nome" rotulo="Como gosta de ser chamada" valor={form.nome} onMudar={mudar("nome")} exemplo="Maria, Dona Maria, Vó Lourdes" />
            </div>
          )}

          {etapa.id === "nascimento" && (
            <fieldset className="ed-data" aria-describedby="ed-data-msg">
              <legend className="sr">Data de nascimento</legend>
              <div className="ed-campo">
                <label htmlFor="ed-dia">Dia</label>
                <select id="ed-dia" value={dia || ""} onChange={(e) => mudarData("dia", e.target.value)}>
                  <option value="">—</option>
                  {Array.from({ length: 31 }, (_, k) => String(k + 1).padStart(2, "0")).map((d) => <option key={d} value={d}>{Number(d)}</option>)}
                </select>
              </div>
              <div className="ed-campo">
                <label htmlFor="ed-mes">Mês</label>
                <select id="ed-mes" value={mes || ""} onChange={(e) => mudarData("mes", e.target.value)}>
                  <option value="">—</option>
                  {MESES.map((m, k) => <option key={m} value={String(k + 1).padStart(2, "0")}>{m}</option>)}
                </select>
              </div>
              <div className="ed-campo">
                <label htmlFor="ed-ano">Ano</label>
                <input id="ed-ano" type="text" inputMode="numeric" maxLength={4} placeholder="1937" value={ano || ""}
                  onChange={(e) => mudarData("ano", e.target.value.replace(/\D/g, ""))} />
              </div>
              <p id="ed-data-msg" className={erro.data ? "ed-erro" : "ed-idade"} role={erro.data ? "alert" : undefined}>
                {erro.data || (anos !== null ? `Você tem ${anos} anos.` : "")}
              </p>
            </fieldset>
          )}

          {etapa.id === "origem" && (
            <div className="ed-campos">
              <Campo id="ed-natal" rotulo="Cidade onde nasceu" valor={form.cidadeNatal} onMudar={mudar("cidadeNatal")} exemplo="Caruaru, PE" />
              <Campo id="ed-atual" rotulo="Cidade onde mora" valor={form.cidadeAtual} onMudar={mudar("cidadeAtual")} exemplo="Campinas, SP" />
              <Campo id="ed-oficio" rotulo="Profissão ou ofício" valor={form.profissao} onMudar={mudar("profissao")} exemplo="Costureira, lavrador, professora, dona de casa" />
            </div>
          )}

          {etapa.id === "apresentacao" && (
            <Campo id="ed-bio" rotulo="Sobre você" valor={form.bio} onMudar={mudar("bio")} longo
              exemplo="Sou costureira, mãe de quatro filhos. Gosto de casa cheia no domingo." />
          )}

          {etapa.id === "gostos" && (
            <>
              <div className="ed-escolhas ed-gostos" role="group" aria-label="Do que você gosta">
                {GOSTOS.map((g) => {
                  const on = form.interesses.includes(g.id);
                  return (
                    <button key={g.id} type="button" className={`ed-escolha${on ? " on" : ""}`} aria-pressed={on} onClick={() => alternarGosto(g.id)}>
                      {g.foto ? <img src={g.foto} alt="" /> : <span className="ed-escolha-ic"><Icone nome={g.icone} tam={40} /></span>}
                      <span>{on && <Icone nome="certo" tam={20} />}{g.nome}</span>
                    </button>
                  );
                })}
              </div>
              {form.outrosGostos.length > 0 && (
                <ul className="chips ed-outros">
                  {form.outrosGostos.map((o) => (
                    <li key={o}>{o}
                      <button type="button" className="ed-tirar" aria-label={`Tirar ${o}`}
                        onClick={() => setForm({ ...form, outrosGostos: form.outrosGostos.filter((x) => x !== o) })}>
                        <Icone nome="fechar" tam={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ed-campo">
                <label htmlFor="ed-outro">Outro gosto que não está aqui</label>
                <div className="ed-linha">
                  <ComVoz rotulo="Outro gosto" onTexto={(t) => juntarGosto(t.replace(/[.!?]$/, ""))}>
                    <input id="ed-outro" type="text" value={novoGosto} onChange={(e) => setNovoGosto(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), juntarGosto(novoGosto))} aria-describedby="ed-outro-dica" />
                  </ComVoz>
                  <button type="button" className="btn btn-s" onClick={() => juntarGosto(novoGosto)}><Icone nome="mais" />Juntar</button>
                </div>
                <span id="ed-outro-dica" className="ed-dica">Exemplo: novela das seis, forró, pescaria</span>
              </div>
            </>
          )}

          {etapa.id === "favoritos" && (
            <div className="ed-campos">
              <Campo id="ed-comida" rotulo="Uma comida que é a sua cara" valor={form.favoritos.comida} onMudar={mudarFav("comida")} exemplo="Bolo de fubá, baião de dois" />
              <Campo id="ed-musica" rotulo="Uma música que marcou" valor={form.favoritos.musica} onMudar={mudarFav("musica")} exemplo="Asa Branca, do Luiz Gonzaga" />
              <Campo id="ed-lugar" rotulo="Um lugar preferido" valor={form.favoritos.lugar} onMudar={mudarFav("lugar")} exemplo="O quintal de casa, a praça da igreja" />
            </div>
          )}
        </div>

        {erro.geral && <p className="ed-erro" role="alert">{erro.geral}</p>}

        <div className="ed-botoes">
          <button type="button" className="btn btn-p" onClick={continuar}>
            <Icone nome="certo" />{i === ETAPAS.length - 1 ? "Terminar" : "Continuar"}
          </button>
          {i > 0 && <button type="button" className="btn btn-s" onClick={() => { setErro({}); setI(i - 1); }}><Icone nome="voltar" />Voltar</button>}
          <button type="button" className="btn-l" onClick={() => { setErro({}); i === ETAPAS.length - 1 ? setPronto(true) : setI(i + 1); }}>
            Pular esta pergunta
          </button>
        </div>
      </section>

      <p className="ed-ajuda"><Icone nome="familia" />Pode responder junto com alguém da família. O que você pular fica para depois.</p>
    </div>
  );
}
