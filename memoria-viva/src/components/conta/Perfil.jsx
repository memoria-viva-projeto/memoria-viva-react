import Icone from "./Icone.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { BotaoOuvir } from "./voz.jsx";
import { MuralFamilia } from "./Familia.jsx";
import { CAPAS, GOSTOS, idade, legado, pessoa, resumoFamilia } from "../../dados/conta.js";

export const dataPorExtenso = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "";

const editar = (passo) => `${ROTAS.editar}?passo=${passo}`;

/** Link pequeno "Mudar" / "Contar" de cada parte do perfil (abre só aquela etapa). */
function Mudar({ passo, vazio, children }) {
  return (
    <Link className="btn-l pf-mudar" para={editar(passo)}>
      <Icone nome={vazio ? "mais" : "corrigir"} />{vazio ? "Contar" : "Mudar"}<span className="sr"> {children}</span>
    </Link>
  );
}

/** Perfil: uma pequena representação de quem a pessoa é, com tudo editável por partes. */
export default function Perfil({ perfil, familia, memorias, onAviso, onAbrirAjustes }) {
  const anos = idade(perfil.nascimento);
  const capa = CAPAS.find((c) => c.id === perfil.capa) || CAPAS[0];
  const gostos = GOSTOS.filter((g) => perfil.interesses?.includes(g.id));
  const outros = perfil.outrosGostos || [];
  const fav = perfil.favoritos || {};
  const resumo = resumoFamilia();
  const l = legado(memorias);
  const ajudante = perfil.ajudante && pessoa(perfil.ajudante);
  const ordem = [...memorias].sort((a, b) => b.ano - a.ano);

  const quem = [
    ["Nasceu em", perfil.nascimento && `${dataPorExtenso(perfil.nascimento)}${anos !== null ? ` · ${anos} anos` : ""}`, "inicio", "nascimento"],
    ["Cidade natal", perfil.cidadeNatal, "pin", "origem"],
    ["Mora em", perfil.cidadeAtual, "pin", "origem"],
    ["Ofício", perfil.profissao, "costura", "origem"],
    ["Família", resumo, "familia", null],
  ];
  const favoritos = [
    ["Comida que é a sua cara", fav.comida, "receita"],
    ["Música que marcou", fav.musica, "musica"],
    ["Lugar preferido", fav.lugar, "pin"],
  ];

  const textoFalado = () => [
    `${perfil.nomeCompleto}.`, anos !== null && `${anos} anos.`, perfil.cidadeNatal && `Nasceu em ${perfil.cidadeNatal}.`,
    perfil.bio, gostos.length && `Gosta de: ${[...gostos.map((g) => g.nome), ...outros].join(", ")}.`,
    fav.comida && `Comida preferida: ${fav.comida}.`, fav.musica && `Música que marcou: ${fav.musica}.`,
  ].filter(Boolean).join(" ");

  return (
    <div className="c-wrap pf">
      <header className="pf-cab">
        <div className="pf-capa" style={{ backgroundImage: `url(${capa.foto})` }} role="img" aria-label={`Capa ilustrativa: ${capa.nome}`}>
          <span className="pf-ilustra" aria-hidden="true">imagem ilustrativa</span>
        </div>
        <div className="pf-id">
          <img className="pf-foto" src={perfil.foto} alt={`Foto de ${perfil.nome}`} />
          <div className="pf-nomes">
            <h1 className="pf-nome" tabIndex={-1}>{perfil.nomeCompleto}</h1>
            <p className="pf-sub">
              {[anos !== null && `${anos} anos`, perfil.cidadeNatal && `de ${perfil.cidadeNatal}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="pf-botoes">
            <Link className="btn btn-p" para={ROTAS.editar}><Icone nome="corrigir" />Editar perfil</Link>
            <BotaoOuvir texto={textoFalado} rotulo="Ouvir seu perfil" className="btn btn-s" />
            <button type="button" className="btn btn-s" onClick={onAbrirAjustes} aria-haspopup="dialog"><Icone nome="ajustes" />Ajustes</button>
          </div>
        </div>
      </header>

      {/* nas palavras dela */}
      <section className="pf-apresenta" aria-labelledby="pf-ap">
        <div className="pf-tit">
          <h2 id="pf-ap" className="pf-h2">Sobre você</h2>
          <Mudar passo="apresentacao" vazio={!perfil.bio}>sua apresentação</Mudar>
        </div>
        {perfil.bio ? (
          <blockquote className="pf-bio"><span className="mao">nas suas palavras</span><p>“{perfil.bio}”</p></blockquote>
        ) : (
          <p className="pf-vazio">Conte em poucas palavras quem você é. Pode falar em vez de escrever.</p>
        )}
        <dl className="pf-quem">
          {quem.map(([rotulo, valor, icone, passo]) => (
            <div key={rotulo} className={valor ? undefined : "vazio"}>
              <dt><Icone nome={icone} tam={22} />{rotulo}</dt>
              <dd>{valor || (passo ? <Link className="btn-l" para={editar(passo)}><Icone nome="mais" />Contar</Link> : "—")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="pf-bloco" aria-labelledby="pf-gostos">
        <div className="pf-tit">
          <h2 id="pf-gostos" className="pf-h2">Do que você gosta</h2>
          <Mudar passo="gostos" vazio={!gostos.length && !outros.length}>do que você gosta</Mudar>
        </div>
        {gostos.length + outros.length > 0 ? (
          <ul className="pf-gostos">
            {gostos.map((g) => (
              <li key={g.id}>
                {g.foto ? <img src={g.foto} alt="" loading="lazy" /> : <span className="pf-gosto-ic"><Icone nome={g.icone} tam={34} /></span>}
                <span>{g.nome}</span>
              </li>
            ))}
            {outros.map((o) => <li key={o} className="pf-gosto-txt"><span className="pf-gosto-ic"><Icone nome="coracao" tam={30} /></span><span>{o}</span></li>)}
          </ul>
        ) : (
          <p className="pf-vazio">Escolha tocando nas fotos: cozinhar, plantas, música, café com os amigos…</p>
        )}
        {gostos.some((g) => g.foto) && <p className="pf-nota">As fotos dos gostos são ilustrativas, não são lembranças suas.</p>}
        <ul className="pf-fav">
          {favoritos.map(([rotulo, valor, icone]) => (
            <li key={rotulo}>
              <span className="pf-fav-ic blob"><Icone nome={icone} /></span>
              <div><span>{rotulo}</span><b>{valor || <Link className="btn-l" para={editar("favoritos")}><Icone nome="mais" />Contar</Link>}</b></div>
            </li>
          ))}
        </ul>
      </section>

      {/* sua família: o retrato no álbum com a família em volta (de geração em geração) */}
      <MuralFamilia f={familia} ajudante={ajudante} />

      <section className="pf-bloco pf-legado" aria-labelledby="pf-leg">
        <h2 id="pf-leg" className="pf-h2">Seu legado</h2>
        <ul className="pf-numeros">
          <li><b>{l.lembrancas}</b> lembranças</li>
          <li><b>{l.decadas}</b> décadas</li>
          <li><b>{l.cidades}</b> cidades</li>
        </ul>
        <p>Tudo o que você conta fica guardado para quem vem depois.</p>
        <button type="button" className="btn btn-s" onClick={() => onAviso()}><Icone nome="linha" />Ver minha linha da vida</button>
      </section>

      <section className="pf-lembrancas" aria-labelledby="pf-lem">
        <h2 id="pf-lem" className="pf-h2">Suas lembranças</h2>
        <ul className="pf-grade">
          {ordem.map((m) => (
            <li key={m.id}>
              <button type="button" className={`pf-tile${m.foto ? "" : " pf-tile-txt"}`} onClick={() => onAviso()}>
                {m.foto ? <img src={m.foto} alt="" loading="lazy" /> : <span className="pf-frase">“{m.frase}”</span>}
                <span className="pf-tile-leg"><b>{m.titulo}</b><span>{m.quando}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
