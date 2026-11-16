import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { Campo, CampoData, erroData } from "./campos.jsx";
import { Miniatura } from "./midia.jsx";
import { BotaoArquivos } from "./arquivos.jsx";
import { SeletorRelacao } from "./Familia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { ehCheio, prepararFoto } from "./guardados.js";
import { CATEGORIA, CATEGORIAS, EU, RELACAO, guardarPessoa, lacoDireto, ligar, mesmoNome, nomeDe, novaPessoa, parentesco, relacaoDe } from "./familia.js";

const PASSOS = [
  ["quem", "Quem você quer acrescentar?", "Pode ser alguém da família, uma amizade ou qualquer pessoa importante na sua história."],
  ["datas", "Foto e datas", "Tudo aqui é opcional. Se não souber a data, escolha “Não sei” ou só a década."],
  ["historia", "A história dessa pessoa", "Uma pequena biografia: quem era, o que fazia, do que gostava. Pode falar em vez de escrever."],
];

/** Um pedaço numerado da primeira parte (1 · quem é, 2 · o vínculo, 3 · o nome). */
function Bloco({ n, titulo, children }) {
  return (
    <section className="cf-bloco" aria-label={titulo}>
      <h2 className="cf-bloco-t"><span className="cf-num" aria-hidden="true">{n}</span>{titulo}</h2>
      {children}
    </section>
  );
}

/**
 * Cadastrar (ou completar) uma pessoa, em três partes curtas. Pode guardar em qualquer parte.
 * Primeiro a categoria (família, amigos, pessoas importantes, outros vínculos); depois o vínculo:
 * na família, o parentesco (que monta a árvore); fora dela, o que a pessoa é para você, com as suas palavras.
 */
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
  const [p, setP] = useState(() => {
    if (original) return structuredClone({ categoria: "familia", vinculo: "", ...original });
    // vindo da árvore (de=, rel=) é família; vindo de "Adicionar amigo" etc., a categoria já vem escolhida
    const cat = CATEGORIA[q.get("cat")] ? q.get("cat") : q.get("de") || q.get("rel") ? "familia" : "";
    return novaPessoa("", cat);
  });
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
  const cat = p.categoria;
  const familia = cat === "familia";
  const quemE = nomeDe(f, ancora);
  const iguais = !editando && !outraPessoa ? mesmoNome(f, p.nome || p.nomeCompleto) : [];

  // família: o parentesco é obrigatório para quem entra; fora da família, só a categoria
  const erroVinculo = () => {
    if (!cat) return "Escolha se é da família, uma amizade, uma pessoa importante ou outro vínculo.";
    if (!familia) return "";
    if (!rel && (!editando || inicio.sozinho)) return "Escolha o parentesco (ou “Outros familiares”).";
    if (rel === "outro" && !rotulo.trim()) return "Escreva que vínculo é esse.";
    return "";
  };
  const validar = () => {
    const ev = erroVinculo();
    if (ev) { setI(0); setErro(ev); return false; }
    const e = erroData(p.nascimento) || (p.faleceu && erroData(p.falecimento));
    if (e) { setI(1); setErro(e); return false; }
    return true;
  };

  const mudouLaco = familia && rel && (!editando || ancora !== inicio.ancora || rel !== inicio.rel || rotulo.trim() !== inicio.rotulo || volta.trim() !== inicio.volta);
  const guardar = () => {
    if (!validar()) return;
    const pessoa = { ...p, nome: p.nome.trim(), nomeCompleto: p.nomeCompleto.trim(), vinculo: familia ? "" : p.vinculo.trim(), falecimento: p.faleceu ? p.falecimento : null };
    let f2 = guardarPessoa(f, pessoa);
    if (mudouLaco) f2 = ligar(f2, ancora, pessoa.id, rel, rotulo.trim(), volta.trim());
    const nome = pessoa.nome || pessoa.nomeCompleto || "A pessoa";
    onSalvar(f2, editando ? "Pronto, guardado." : familia ? `${nome} entrou na família.` : `${nome} foi guardada em “${CATEGORIA[cat][1]}”.`, pessoa.id);
  };
  // é alguém que já está cadastrado: na família, só cria o laço; fora dela, abre o perfil (sem cadastrar duas vezes)
  const usarQuemJaExiste = (outro) => {
    const ev = erroVinculo();
    if (ev) { setErro(ev); return; }
    if (!familia || outro.categoria && outro.categoria !== "familia") { onSalvar(f, `${nomeDe(f, outro.id)} já estava cadastrado(a).`, outro.id); return; }
    onSalvar(ligar(f, ancora, outro.id, rel, rotulo.trim(), volta.trim()), `${nomeDe(f, outro.id)} foi ligado(a) a ${quemE}.`, outro.id);
  };
  const escolherRel = (k) => {
    setErro("");
    setRel(k);
    if (RELACAO[k][3]) mudar({ genero: RELACAO[k][3] }); // Filho, Avó...: o gênero já vem da escolha
  };
  // como vai aparecer, já com a escolha feita ("Juliana, filha de Maria" / "Amiga de infância")
  const previa = familia
    ? rel && rel !== "outro" ? `${lacoDireto(ligar(guardarPessoa(f, p), ancora, p.id, rel), p.id, ancora)}${ancora === EU ? "" : ` de ${quemE}`}` : ""
    : cat ? p.vinculo.trim() || CATEGORIA[cat][2] : "";

  const escolherFoto = async (fs) => {
    if (!fs[0]) return;
    setFoto("abrindo");
    try { const a = await prepararFoto(fs[0]); mudar({ fotoArq: a.id, fotoRecorte: null }); setFoto(""); }
    catch (e) { setFoto(ehCheio(e) ? "Não há mais espaço neste aparelho." : "Não deu para abrir essa foto. Tente outra."); }
  };

  const continuar = () => {
    if (i === 0 && erroVinculo()) { setErro(erroVinculo()); return; }
    setErro("");
    setI(i + 1);
  };

  return (
    <div className="c-wrap ed cf">
      <div className="ed-topo">
        <p className="ed-passo"><Icone nome="familia" />{editando ? `Completar: ${nomeDe(f, id)}` : "Nova pessoa"} · parte {i + 1} de {PASSOS.length}</p>
        <ol className="ed-trilha" aria-hidden="true">{PASSOS.map((x, k) => <li key={x[0]} className={k < i ? "feito" : k === i ? "agora" : undefined} />)}</ol>
        <button type="button" className="btn-l" onClick={onSair}><Icone nome="fechar" />Cancelar</button>
      </div>

      <section className="ed-cartao" aria-labelledby="cf-pergunta">
        <h1 id="cf-pergunta" className="ed-pergunta" ref={titulo} tabIndex={-1}>{editando && i === 0 ? `Quem é ${nomeDe(f, id)}` : pergunta}</h1>
        <p className="ed-dica-grande">{editando && i === 0 ? "Dá para mudar a categoria, o vínculo, o nome e o resto. Nada muda até você guardar." : dica}</p>
        {erro && <p className="ed-erro" role="alert">{erro}</p>}

        <div className="ed-corpo">
          {idPasso === "quem" && (
            <>
              <Bloco n={1} titulo="Essa pessoa é…">
                <fieldset className="cf-cats">
                  <legend className="sr">Categoria</legend>
                  {CATEGORIAS.map(([k, nome, , icone, explica]) => (
                    <label key={k} className={`cf-cat cf-cat-${k}${cat === k ? " on" : ""}`}>
                      <input type="radio" name="cf-cat" checked={cat === k} onChange={() => mudar({ categoria: k })} />
                      <span className="cf-cat-ic"><Icone nome={cat === k ? "certo" : icone} tam={26} /></span>
                      <span className="cf-cat-txt"><b>{nome}</b><span>{explica}</span></span>
                    </label>
                  ))}
                </fieldset>
              </Bloco>

              {familia && (
                <Bloco n={2} titulo="O parentesco">
                  {/* ao editar alguém que já tem laço, a outra ponta fica fixa (os demais se corrigem no perfil) */}
                  {editando && !inicio.sozinho ? (
                    <p className="fr-ancora"><Avatar id={ancora} tam={40} /><span>Parentesco com <b>{ancora === EU ? `você (${quemE})` : quemE}</b></span></p>
                  ) : (
                    <div className="ed-campo">
                      <label htmlFor="cf-ancora">É parente de quem?</label>
                      <select id="cf-ancora" value={ancora} onChange={(e) => setAncora(e.target.value)}>
                        {[EU, ...f.pessoas.filter((x) => !x.removida && x.id !== id && (x.categoria || "familia") === "familia").map((x) => x.id)].map((x) => (
                          <option key={x} value={x}>{x === EU ? `Você (${nomeDe(f, EU)})` : `${nomeDe(f, x)} (${parentesco(f, x)})`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <SeletorRelacao id="cf" pergunta={`${editando ? nomeDe(f, id) : "Essa pessoa"} é o quê de ${ancora === EU ? "você" : quemE}?`} valor={rel}
                    onEscolher={escolherRel} rotulo={rotulo} onRotulo={setRotulo}
                    perguntaVolta={`E ${ancora === EU ? "você é" : `${quemE} é`} o quê dessa pessoa?`} rotuloVolta={volta} onRotuloVolta={setVolta} />
                  {/* Cônjuge, Outros familiares: o gênero não vem da escolha, então pergunta */}
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
                  {inicio.outros > 0 && <p className="ed-dica">Os outros vínculos de {nomeDe(f, id)} se corrigem no perfil, em “Ligações”.</p>}
                </Bloco>
              )}

              {cat && !familia && (
                <Bloco n={2} titulo="O que essa pessoa é para você">
                  <div className="qd-modos" role="group" aria-label="Sugestões de vínculo">
                    {CATEGORIA[cat][5].map((v) => (
                      <button key={v} type="button" className={`qd-modo${p.vinculo === v ? " on" : ""}`} aria-pressed={p.vinculo === v} onClick={() => mudar({ vinculo: p.vinculo === v ? "" : v })}>
                        {p.vinculo === v && <Icone nome="certo" tam={16} />}{v}
                      </button>
                    ))}
                  </div>
                  <Campo id="cf-vinculo" rotulo="Ou escreva do seu jeito" marca="opcional" valor={p.vinculo} onMudar={(v) => mudar({ vinculo: v })} max={60}
                    exemplo="Amiga do coral, a moça da padaria, meu primeiro chefe" />
                  <p className="ed-dica">Não entra na árvore da família. Se essa pessoa tiver ligação com alguém da família (madrinha da Juliana, por exemplo), dá para dizer no perfil dela, em “Ligações”.</p>
                </Bloco>
              )}

              {previa && <p className="fr-previa">Vai aparecer como: <b>{previa}</b></p>}

              {cat && (
                <Bloco n={3} titulo="O nome">
                  <div className="ed-campos">
                    <Campo id="cf-nome" rotulo="Como você chama essa pessoa" marca="opcional" valor={p.nome} onMudar={(v) => mudar({ nome: v })} max={60}
                      exemplo={familia ? "Vó Cida, Tio Zé, Juliana" : "Dona Lurdes, Zezinho, Ana"} />
                    <Campo id="cf-completo" rotulo="Nome completo" marca="opcional" valor={p.nomeCompleto} onMudar={(v) => mudar({ nomeCompleto: v })} max={120}
                      dica="Se não souber, deixe em branco." />
                  </div>
                  {iguais.length > 0 && (
                    <div className="cf-igual" role="alert">
                      <p><b>Já existe {iguais.map((x) => `${nomeDe(f, x.id)} (${parentesco(f, x.id)})`).join(", ")}.</b> É a mesma pessoa?</p>
                      <div className="cf-igual-bt">
                        <button type="button" className="btn btn-p btn-sm" onClick={() => usarQuemJaExiste(iguais[0])}><Icone nome="certo" />{familia ? "Sim, é a mesma: só ligar" : "Sim, abrir o perfil"}</button>
                        <button type="button" className="btn-l" onClick={() => setOutraPessoa(true)}>Não, é outra pessoa</button>
                      </div>
                    </div>
                  )}
                </Bloco>
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
                  {editando
                    ? <Link className="btn-l" para={`${ROTAS.familia}/rostos?para=${id}`}><Icone nome="selecionar" />Recortar de uma foto de grupo</Link>
                    : <span className="ed-dica">Depois de guardar, dá também para recortar o rosto de uma foto de grupo.</span>}
                  {p.fotoArq && <button type="button" className="btn-l" onClick={() => mudar({ fotoArq: null, fotoRecorte: null })}><Icone nome="lixo" />Tirar a foto</button>}
                  {p.fotoArq && p.fotoRecorte && <span className="ed-dica">Recorte aproximado de “{p.fotoRecorte.origem}”, escolhido por você.</span>}
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
          {!ultimo && (editando || (cat && (!familia || rel))) && <button type="button" className="btn-l" onClick={guardar}>Guardar agora e completar depois</button>}
        </div>
      </section>
      <p className="ed-ajuda"><Icone nome="conselho" />Fica só nesta conta. A pessoa não precisa ter conta no Memória Viva.</p>
    </div>
  );
}
