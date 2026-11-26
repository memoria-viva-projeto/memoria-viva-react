import { useRef } from "react";
import Icone from "./Icone.jsx";
import Divisoria from "./Divisoria.jsx";
import PerguntaDoDia from "./PerguntaDoDia.jsx";
import Guardar from "./Guardar.jsx";
import Lateral from "./Lateral.jsx";
import { TileGuardada } from "./CartaoGuardada.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { azulejoDaFamilia } from "../../dados/conta.js";
import { planoDeFamilia } from "./planos.js";

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "bom dia" : h < 18 ? "boa tarde" : "boa noite";
}

const lembrancas = (n) => `${n} ${n === 1 ? "lembrança" : "lembranças"}`;

/** Um passo do começo: número (ou ✓ quando feito), título, explicação e o que fazer. */
function Passo({ n, feito, titulo, children }) {
  return (
    <li className={`pp-passo${feito ? " feito" : ""}`}>
      <span className="pp-n" aria-hidden="true">{feito ? <Icone nome="certo" tam={22} /> : n}</span>
      <div className="pp-corpo">
        <h3>{titulo}{feito && <span className="sr"> (feito)</span>}</h3>
        {children}
      </div>
    </li>
  );
}

/**
 * Primeiros passos: aparece no lugar da pergunta do dia enquanto ela ainda não tem fotos para perguntar.
 * Só passos que a tela consegue conferir de verdade (nada de progresso inventado).
 */
function PrimeirosPassos({ total, perfil }) {
  const guardou = total > 0;
  const contou = Boolean(perfil.bio?.trim());
  const familia = planoDeFamilia();
  const feitos = [guardou, contou].filter(Boolean).length;
  return (
    <section className="pp" aria-labelledby="pp-t">
      <FaixaAzulejos semente={azulejoDaFamilia()} tamanho={26} girar={false} pares={PARES_URUCUM_ANIL} className="pp-faixa" />
      <div className="pp-cab">
        <span className="mao pp-oi">primeiros passos</span>
        <h2 id="pp-t">Vamos começar o seu acervo</h2>
        <p>Faça no seu tempo. {feitos === 0 ? "Comece pelo primeiro." : `${feitos} de 2 passos principais feitos.`}</p>
      </div>
      <ol className="pp-passos">
        <Passo n={1} feito={guardou} titulo="Guarde a primeira lembrança">
          {guardou ? (
            <p>Você já tem {lembrancas(total)} no acervo. <Link className="btn-l" para={ROTAS.historia}>Ver suas memórias</Link></p>
          ) : (
            <>
              <p>Uma foto solta ou um álbum inteiro. Depois você conta a história por trás dela.</p>
              <div className="pp-acoes">
                <Link className="btn btn-p" para={`${ROTAS.guardar}/foto`}><Icone nome="foto" />Uma foto</Link>
                <Link className="btn btn-s" para={`${ROTAS.guardar}/album`}><Icone nome="album" />Um álbum</Link>
              </div>
            </>
          )}
        </Passo>
        <Passo n={2} feito={contou} titulo="Conte quem você é">
          <p>{contou ? "Sua apresentação já está no perfil." : "Algumas palavras sobre você, para a família conhecer a sua história."}</p>
          {!contou && <div className="pp-acoes"><Link className="btn btn-s" para={`${ROTAS.editar}?passo=apresentacao`}><Icone nome="corrigir" />Escrever no perfil</Link></div>}
        </Passo>
        <Passo n={3} feito={false} titulo="Chame a família">
          {familia ? (
            <>
              <p>Quem você convidar vê o acervo e a árvore, e comenta no feed da família.</p>
              <div className="pp-acoes"><Link className="btn btn-s" para={ROTAS.familia}><Icone nome="convidar" />Convidar a família</Link></div>
            </>
          ) : (
            <>
              <p>Convidar a família e o feed com os comentários de todos fazem parte dos planos Família.</p>
              <div className="pp-acoes"><Link className="btn btn-s" para={ROTAS.planos}><Icone nome="cadeado" />Ver os planos Família</Link></div>
            </>
          )}
        </Passo>
      </ol>
    </section>
  );
}

/** Prévia da história: fotos e títulos; a história completa fica em outra tela. */
function Previa({ memorias, guardadas }) {
  // as que a pessoa guardou vêm primeiro (são as mais novas)
  const recentes = [...guardadas, ...[...memorias].sort((a, b) => a.publicadaHaDias - b.publicadaHaDias)].slice(0, 6);
  const total = memorias.length + guardadas.length;

  if (total === 0) {
    return (
      <section className="hp hp-vazia" aria-labelledby="hp-t">
        <h2 id="hp-t" className="c-h2">Sua história</h2>
        <p>Ainda não há lembranças guardadas. Que tal começar por uma foto?</p>
        <Link className="btn btn-p" para={ROTAS.guardar}><Icone nome="mais" />Guardar a primeira lembrança</Link>
      </section>
    );
  }

  return (
    <section className="hp" aria-labelledby="hp-t">
      <div className="hp-cab">
        <h2 id="hp-t" className="c-h2">Sua história</h2>
        <span className="hp-n">{lembrancas(total)}</span>
      </div>
      <ul className="hp-grade">
        {recentes.map((m) => (
          <li key={m.id}>
            {m.criadaEm ? <TileGuardada m={m} /> : <Link className="hp-it" para={`${ROTAS.historia}#mem-${m.id}`}>
              <img src={m.foto} alt="" loading="lazy" />
              {m.status === "aguardando" && <span className="hp-selo">Esperando você</span>}
              <span className="hp-leg"><b>{m.titulo}</b><span>{m.quando}</span></span>
            </Link>}
          </li>
        ))}
      </ul>
      <Link className="btn btn-s hp-tudo" para={ROTAS.historia}><Icone nome="ler" />Ver sua história completa</Link>
    </section>
  );
}

/**
 * Início: só o essencial, nesta ordem —
 * saudação → pergunta do dia → o que espera por você → guardar → prévia da história.
 */
export default function Inicio({ memorias, guardadas, carregou, perfil, onVer, onAviso }) {
  const gradeRef = useRef(null);
  const painel = { get current() { return gradeRef.current?.querySelector(".c-lateral"); } };
  // a pergunta do dia precisa de fotos confirmadas; sem elas, o começo vira "primeiros passos"
  const temPergunta = memorias.some((m) => m.foto && m.status === "confirmada");
  const total = memorias.length + guardadas.length;
  return (
    <div className="c-wrap c-grid inicio" ref={gradeRef}>
      <div className="c-centro">
        <div className="sd">
          <p className="mao sd-oi">{saudacao()}, {perfil.nome}!</p>
          <h1 className="sd-titulo" tabIndex={-1}>Qual lembrança vem hoje?</h1>
        </div>
        {temPergunta ? <PerguntaDoDia memorias={memorias} onAviso={onAviso} /> : <PrimeirosPassos total={total} perfil={perfil} />}
        {/* sem nada guardado, o passo 1 já oferece foto e álbum: aqui não repete, e a história vazia não aparece */}
        {total > 0 && <Guardar />}
        {total > 0 && <Previa memorias={memorias} guardadas={guardadas} />}
      </div>

      <Lateral memorias={memorias} guardadas={guardadas} carregou={carregou} onVer={onVer}>
        <Divisoria alvo={gradeRef} painel={painel} variavel="--lado-dir" min={280} max={460} chave="mv-largura-lateral" rotulo="Ajustar a largura da coluna da direita" />
      </Lateral>
    </div>
  );
}
