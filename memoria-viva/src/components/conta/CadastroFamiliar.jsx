import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { Campo, CampoData, erroData } from "./campos.jsx";
import { Miniatura } from "./midia.jsx";
import { BotaoArquivos } from "./arquivos.jsx";
import { SeletorRelacao } from "./Familia.jsx";
import { ehCheio, prepararFoto } from "./guardados.js";
import { EU, RELACAO, guardarPessoa, lacoDireto, ligar, mesmoNome, nomeDe, novaPessoa, parentesco, relacaoDe } from "./familia.js";

const PASSOS = [
  ["quem", "Quem você quer acrescentar?", "Só o parentesco é necessário. O resto dá para completar depois."],
  ["datas", "Foto e datas", "Tudo aqui é opcional. Se não souber a data, escolha “Não sei” ou só a década."],
  ["historia", "A história dessa pessoa", "Uma pequena biografia: quem era, o que fazia, do que gostava. Pode falar em vez de escrever."],
];

/** Cadastrar (ou completar) um familiar, em três partes curtas. Pode guardar em qualquer parte. */
export default function CadastroFamiliar({ f, id, onSalvar, onSair }) {
  const q = new URLSearchParams(window.location.search);
  const editando = !!id;
  const original = editando ? f.pessoas.find((p) => p.id === id) : null;
  // ao editar, o parentesco mostrado é o laço principal: com "você", se houver; senão o primeiro
  const [inicio] = useState(() => {
    if (!editando) return { ancora: q.get("de") || EU, rel: RELACAO[q.get("rel")] ? q.get("rel") : "", rotulo: "", volta: "" };
    const lacos = f.lacos.filter((l) => l.de === id || l.para === id);
    const l = lacos.find((x) => x.de === EU || x.para === EU) || lacos[0];
    if (!l) return { ancora: EU, rel: "", rotulo: "", volta: "", sozinho: true };
    const anc = l.de === id ? l.para : l.de;
    return { ancora: anc, rel: relacaoDe(f, id, anc), rotulo: (l.de === id ? l.rotulo : l.rotuloVolta) || "", volta: (l.de === id ? l.rotuloVolta : l.rotulo) || "", outros: lacos.length - 1 };
  });
  const [p, setP] = useState(() => (original ? structuredClone(original) : novaPessoa()));
  const [ancora, setAncora] = useState(inicio.ancora);
  const [rel, setRel] = useState(inicio.rel);
  const [rotulo, setRotulo] = useState(inicio.rotulo);
  const [volta, setVolta] = useState(inicio.volta);
  const [i, setI] = useState(() => Math.max(0, PASSOS.findIndex((x) => x[0] === q.get("passo"))));
  const [erro, setErro] = useState("");
  const [outraPessoa, setOutraPessoa] = useState(false);
  const [foto, setFoto] = useState("");
  const titulo = useRef(null);
  const primeira = useRef(true);
  useEffect(() => { if (primeira.current) { primeira.current = false; return; } window.scrollTo(0, 0); titulo.current?.focus(); }, [i]);

  const mudar = (campos) => { setErro(""); setP((x) => ({ ...x, ...campos })); };
  const [idPasso, pergunta, dica] = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;
  const quemE = nomeDe(f, ancora);
  const iguais = !editando && !outraPessoa ? mesmoNome(f, p.nome || p.nomeCompleto) : [];

  // o parentesco é obrigatório para quem entra; ao editar, só se a pessoa ainda não tem nenhum laço e escolheram um
  const erroParentesco = () => {
    if (!editando && !rel) return "Escolha o parentesco (ou “Outros familiares”).";
    if (rel === "outro" && !rotulo.trim()) return "Escreva que vínculo é esse.";
    return "";
  };
  const validar = () => {
    const ep = erroParentesco();
    if (ep) { setI(0); setErro(ep); return false; }
    const e = erroData(p.nascimento) || (p.faleceu && erroData(p.falecimento));
    if (e) { setI(1); setErro(e); return false; }
    return true;
  };

  const mudouLaco = rel && (!editando || ancora !== inicio.ancora || rel !== inicio.rel || rotulo.trim() !== inicio.rotulo || volta.trim() !== inicio.volta);
  const guardar = () => {
    if (!validar()) return;
    const pessoa = { ...p, nome: p.nome.trim(), nomeCompleto: p.nomeCompleto.trim(), falecimento: p.faleceu ? p.falecimento : null };
    let f2 = guardarPessoa(f, pessoa);
    if (mudouLaco) f2 = ligar(f2, ancora, pessoa.id, rel, rotulo.trim(), volta.trim());
    onSalvar(f2, editando ? "Pronto, guardado." : `${pessoa.nome || pessoa.nomeCompleto || "A pessoa"} entrou na família.`, pessoa.id);
  };
  // é alguém que já está na família: só cria o vínculo (sem cadastrar a mesma pessoa duas vezes)
  const usarQuemJaExiste = (outro) => {
    const ep = erroParentesco();
    if (ep) { setErro(ep); return; }
    onSalvar(ligar(f, ancora, outro.id, rel, rotulo.trim(), volta.trim()), `${nomeDe(f, outro.id)} foi ligado(a) a ${quemE}.`, outro.id);
  };
  const escolherRel = (k) => {
    setErro("");
    setRel(k);
    if (RELACAO[k][3]) mudar({ genero: RELACAO[k][3] }); // Filho, Avó...: o gênero já vem da escolha
  };
  // como vai aparecer, já com a escolha feita ("Juliana, filha de Maria")
  const previa = rel && rel !== "outro" ? lacoDireto(ligar(guardarPessoa(f, p), ancora, p.id, rel), p.id, ancora) : "";

  const escolherFoto = async (fs) => {
    if (!fs[0]) return;
    setFoto("abrindo");
    try { const a = await prepararFoto(fs[0]); mudar({ fotoArq: a.id }); setFoto(""); }
    catch (e) { setFoto(ehCheio(e) ? "Não há mais espaço neste aparelho." : "Não deu para abrir essa foto. Tente outra."); }
  };

  const continuar = () => {
    if (i === 0 && erroParentesco()) { setErro(erroParentesco()); return; }
    setErro("");
    setI(i + 1);
  };

  return (
    <div className="c-wrap ed cf">
      <div className="ed-topo">
        <p className="ed-passo"><Icone nome="familia" />{editando ? `Completar: ${nomeDe(f, id)}` : "Novo familiar"} · parte {i + 1} de {PASSOS.length}</p>
        <ol className="ed-trilha" aria-hidden="true">{PASSOS.map((x, k) => <li key={x[0]} className={k < i ? "feito" : k === i ? "agora" : undefined} />)}</ol>
        <button type="button" className="btn-l" onClick={onSair}><Icone nome="fechar" />Cancelar</button>
      </div>

      <section className="ed-cartao" aria-labelledby="cf-pergunta">
        <h1 id="cf-pergunta" className="ed-pergunta" ref={titulo} tabIndex={-1}>{editando && i === 0 ? `Quem é ${nomeDe(f, id)}` : pergunta}</h1>
        <p className="ed-dica-grande">{editando && i === 0 ? "Dá para corrigir o parentesco, o nome e o resto. Nada muda até você guardar." : dica}</p>
        {erro && <p className="ed-erro" role="alert">{erro}</p>}

        <div className="ed-corpo">
          {idPasso === "quem" && (
            <>
              {/* ao editar alguém que já tem laço, a outra ponta fica fixa (os demais vínculos se corrigem no perfil) */}
              {editando && !inicio.sozinho ? (
                <p className="fr-ancora"><Avatar id={ancora} tam={40} /><span>Parentesco com <b>{ancora === EU ? `você (${quemE})` : quemE}</b></span></p>
              ) : (
                <div className="ed-campo">
                  <label htmlFor="cf-ancora">É parente de quem?</label>
                  <select id="cf-ancora" value={ancora} onChange={(e) => setAncora(e.target.value)}>
                    {[EU, ...f.pessoas.filter((x) => !x.removida && x.id !== id).map((x) => x.id)].map((x) => (
                      <option key={x} value={x}>{x === EU ? `Você (${nomeDe(f, EU)})` : `${nomeDe(f, x)} (${parentesco(f, x)})`}</option>
                    ))}
                  </select>
                </div>
              )}
              <SeletorRelacao id="cf" pergunta={`${editando ? nomeDe(f, id) : "Essa pessoa"} é o quê de ${ancora === EU ? "você" : quemE}?`} valor={rel}
                onEscolher={escolherRel} rotulo={rotulo} onRotulo={setRotulo}
                perguntaVolta={`E ${ancora === EU ? "você é" : `${quemE} é`} o quê dessa pessoa?`} rotuloVolta={volta} onRotuloVolta={setVolta} />
              {previa && <p className="fr-previa">Vai aparecer como: <b>{previa}{ancora === EU ? "" : ` de ${quemE}`}</b></p>}
              {inicio.outros > 0 && <p className="ed-dica">Os outros vínculos de {nomeDe(f, id)} se corrigem no perfil, em “Parentes próximos”.</p>}
              <div className="ed-campos">
                <Campo id="cf-nome" rotulo="Como a família chama essa pessoa" marca="opcional" valor={p.nome} onMudar={(v) => mudar({ nome: v })} max={60}
                  exemplo="Vó Cida, Tio Zé, Juliana" />
                <Campo id="cf-completo" rotulo="Nome completo" marca="opcional" valor={p.nomeCompleto} onMudar={(v) => mudar({ nomeCompleto: v })} max={120}
                  dica="Se não souber, deixe em branco." />
              </div>
              {iguais.length > 0 && (
                <div className="cf-igual" role="alert">
                  <p><b>Já existe {iguais.map((x) => `${nomeDe(f, x.id)} (${parentesco(f, x.id)})`).join(", ")} na família.</b> É a mesma pessoa?</p>
                  <div className="cf-igual-bt">
                    <button type="button" className="btn btn-p btn-sm" onClick={() => usarQuemJaExiste(iguais[0])}><Icone nome="certo" />Sim, é a mesma: só ligar</button>
                    <button type="button" className="btn-l" onClick={() => setOutraPessoa(true)}>Não, é outra pessoa</button>
                  </div>
                </div>
              )}
              {/* Cônjuge, Outros familiares (ou sem parentesco): o gênero não vem da escolha, então pergunta */}
              {!RELACAO[rel]?.[3] && (editando || rel) && (
                <fieldset className="qd">
                  <legend>Para escrever o parentesco do jeito certo</legend>
                  <div className="qd-modos">
                    {[["f", "Ela"], ["m", "Ele"], ["", "Prefiro não dizer"]].map(([g, nome]) => (
                      <label key={nome} className={`qd-modo${p.genero === g ? " on" : ""}`}>
                        <input type="radio" name="cf-genero" checked={p.genero === g} onChange={() => mudar({ genero: g })} />
                        {p.genero === g && <Icone nome="certo" tam={16} />}{nome}
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}

          {idPasso === "datas" && (
            <>
              <div className="cf-foto">
                {p.fotoArq ? <Miniatura arq={p.fotoArq} className="cf-foto-img" /> : editando ? <Avatar id={id} tam={120} /> : <span className="cf-foto-vazia"><Icone nome="foto" tam={36} /></span>}
                <div className="cf-foto-bt">
                  <BotaoArquivos className="btn btn-s" rotulo={p.fotoArq || original?.foto ? "Trocar a foto" : "Escolher uma foto"} icone="enviarfoto"
                    disabled={foto === "abrindo"} onArquivos={escolherFoto} />
                  {p.fotoArq && <button type="button" className="btn-l" onClick={() => mudar({ fotoArq: null })}><Icone nome="lixo" />Tirar a foto</button>}
                  {foto && <span className={foto === "abrindo" ? "ed-dica" : "ed-erro"} role="status">{foto === "abrindo" ? "Abrindo a foto…" : foto}</span>}
                </div>
              </div>
              <CampoData id="cf-nasc" legenda="Quando nasceu" valor={p.nascimento || {}} onMudar={(d) => mudar({ nascimento: d })} erro={erroData(p.nascimento)} />
              <label className="ed-check">
                <input type="checkbox" checked={!!p.faleceu} onChange={(e) => mudar({ faleceu: e.target.checked })} />
                <span>Essa pessoa já faleceu</span>
              </label>
              {p.faleceu && <CampoData id="cf-morte" legenda="Quando faleceu" valor={p.falecimento || {}} onMudar={(d) => mudar({ falecimento: d })} erro={erroData(p.falecimento)} />}
              <Campo id="cf-origem" rotulo="De onde é" marca="opcional" valor={p.origem} onMudar={(v) => mudar({ origem: v })} max={120} exemplo="Caruaru, PE" />
            </>
          )}

          {idPasso === "historia" && (
            <div className="ed-campos">
              <Campo id="cf-bio" rotulo="Uma pequena biografia" marca="opcional" valor={p.bio} onMudar={(v) => mudar({ bio: v })} longo linhas={5} max={4000}
                exemplo="Costurava para a vizinhança inteira e cantava enquanto trabalhava." />
              <Campo id="cf-outras" rotulo="Outras informações" marca="opcional" valor={p.outras} onMudar={(v) => mudar({ outras: v })} longo linhas={3} max={2000}
                exemplo="Profissão, apelidos, onde morou, um jeito de falar." />
            </div>
          )}
        </div>

        <div className="ed-botoes">
          {ultimo
            ? <button type="button" className="btn btn-p" onClick={guardar}><Icone nome="certo" />Guardar</button>
            : <button type="button" className="btn btn-p" onClick={continuar}><Icone nome="seguir" />Continuar</button>}
          {i > 0 && <button type="button" className="btn btn-s" onClick={() => { setErro(""); setI(i - 1); }}><Icone nome="voltar" />Voltar</button>}
          {!ultimo && (editando || rel) && <button type="button" className="btn-l" onClick={guardar}>Guardar agora e completar depois</button>}
        </div>
      </section>
      <p className="ed-ajuda"><Icone nome="conselho" />Fica só nesta conta. A pessoa não precisa ter conta no Memória Viva.</p>
    </div>
  );
}
