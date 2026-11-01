import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import { Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { capaDoYoutube, youtubeDe } from "./youtube.jsx";
import { TIPOS, apagarRascunho, capaDe, limparArquivos, listarRascunhos, tituloDe } from "./guardados.js";

// [tipo, o que dá para fazer, foto do moodboard (ilustrativa)]
const OPCOES = [
  ["foto", "Escolha a foto e conte a história dela. Marque quem aparece.", "retratos-close"],
  ["album", "Muitas fotos de uma vez, contadas uma vez só.", "album-verde"],
  ["musica", "Ache a música, ouça aqui e diga o que ela lembra.", "sala-azul"],
  ["receita", "Escreva como num caderno, do seu jeito.", "cozinha"],
  ["video", "Um vídeo do aparelho ou um link do YouTube.", "amarelinha"],
];
const NOMES = { foto: "Fotografia", album: "Álbum", musica: "Música", receita: "Receita", video: "Vídeo" };

/** Rascunhos sem terminar: continuar (abre direto onde parou) ou descartar. */
function Comecadas() {
  const [lista, setLista] = useState([]);
  const [descartando, setDescartando] = useState(null);
  useEffect(() => { listarRascunhos().then((rs) => setLista(rs.sort((a, b) => b.em - a.em))).catch(() => {}); }, []);
  if (!lista.length) return null;

  const descartar = async (chave) => {
    await apagarRascunho(chave);
    limparArquivos();
    setLista((l) => l.filter((r) => r.chave !== chave));
    setDescartando(null);
  };

  return (
    <section className="gi-comecadas" aria-labelledby="gi-c-t">
      <h2 id="gi-c-t" className="gi-c-titulo"><Icone nome="corrigir" />Começadas, ainda sem guardar</h2>
      <ul>
        {lista.map(({ chave, m, passo }) => {
          const editando = chave.startsWith("editar-");
          const n = m.itens.filter((it) => !it.anexo).length;
          const yt = youtubeDe(m);
          return (
            <li key={chave} className="gi-r">
              {capaDe(m) ? <Miniatura arq={capaDe(m)} className="gi-r-foto" />
                : yt ? <img className="gi-r-foto" src={capaDoYoutube(yt)} alt="" />
                : <span className="gi-r-foto gi-r-ic"><Icone nome={TIPOS[m.tipo].icone} tam={30} /></span>}
              <div className="gi-r-txt">
                <b>{tituloDe(m)}</b>
                <span>{editando ? "Mudanças numa memória já guardada" : NOMES[m.tipo]}{n ? ` · ${n} ${n === 1 ? "arquivo" : "arquivos"}` : ""}</span>
              </div>
              <div className="gi-r-bt">
                {descartando === chave ? (
                  <>
                    <span role="alert">{editando ? "Descartar as mudanças?" : "Apagar o que foi feito?"}</span>
                    <button type="button" className="btn btn-s btn-sm" onClick={() => descartar(chave)}><Icone nome="lixo" />Sim</button>
                    <button type="button" className="btn-l" onClick={() => setDescartando(null)}>Não</button>
                  </>
                ) : (
                  <>
                    <Link className="btn btn-p btn-sm" para={`${ROTAS.guardar}/${m.tipo}?${editando ? `editar=${m.id}` : `rascunho=${chave}`}${passo ? `&passo=${passo}` : ""}`}><Icone nome="seguir" />Continuar</Link>
                    <button type="button" className="btn-l" onClick={() => setDescartando(chave)}>Descartar</button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Guardar": escolher o tipo de memória. Cada opção mostra, com uma foto, o que dá para fazer. */
export default function GuardarInicio({ bancoOk }) {
  return (
    <div className="c-wrap gi">
      <header className="gi-cab">
        <p className="mao gi-mao">vamos guardar?</p>
        <h1 className="gi-titulo" tabIndex={-1}>O que você quer guardar hoje?</h1>
      </header>

      {!bancoOk && (
        <p className="gi-alerta" role="alert">Este navegador não está deixando guardar arquivos (pode ser a janela anônima). O que você guardar pode não ficar salvo.</p>
      )}

      <Comecadas />

      <ul className="gi-ops">
        {OPCOES.map(([id, texto, foto], k) => (
          <li key={id} className={`gi-li-${id}`}>
            <Link className={`gi-op gi-${id}`} para={`${ROTAS.guardar}/${id}`}>
              <span className="gi-op-foto" style={{ backgroundImage: `url(/img/${foto}.jpg)` }} aria-hidden="true">
                <span className={`tape ${["t-gema", "t-turq", "t-uru", "t-azul", "t-papel"][k]}`} />
              </span>
              <span className="gi-op-txt">
                <span className="gi-ic blob"><Icone nome={TIPOS[id].icone} tam={30} /></span>
                <span className="gi-nome">{NOMES[id]}</span>
                <span className="gi-desc">{texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="gi-notas">
        <p><Icone nome="familia" />Pode guardar junto com alguém da família.</p>
        <p><Icone nome="conselho" />Nesta versão de teste, o que você guarda fica neste aparelho, neste navegador. As fotos desta tela são ilustrativas.</p>
      </div>
    </div>
  );
}
