import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import Memoria from "./Memoria.jsx";
import { TileGuardada } from "./CartaoGuardada.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { abrirFamiliaDeOutro, familiasComoMembro } from "./convitesServidor.js";

/**
 * A família de outra pessoa, para quem entrou pelo código (/conta/familias/<id>): só para ver.
 * As memórias e a árvore vêm do servidor; guardar, mudar e apagar continuam com a dona.
 * idMemoria: abre uma memória dessa família (/conta/familias/<id>/memoria/<srv-n>).
 */
export default function FamiliaMembro({ idFamilia, idMemoria }) {
  const f = familiasComoMembro().find((x) => String(x.id) === String(idFamilia));
  const [dados, setDados] = useState(null);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!f) return;
    let vale = true;
    setFalhou(false);
    abrirFamiliaDeOutro(f.id).then((d) => vale && setDados(d)).catch(() => vale && setFalhou(true));
    return () => { vale = false; };
  }, [idFamilia, tentativa]);

  if (!f) {
    return (
      <div className="c-wrap fm">
        <Link className="btn-l hs-voltar" para={ROTAS.familia}><Icone nome="voltar" />Família</Link>
        <h1 className="fm-titulo" tabIndex={-1}>Não encontramos esta família na sua conta</h1>
        <p>Pode ser que você tenha saído dela, ou que o endereço esteja errado.</p>
      </div>
    );
  }

  const aqui = `${ROTAS.familias}/${f.id}`;
  if (idMemoria) {
    return <Memoria id={idMemoria} guardadas={dados?.memorias || []} carregou={Boolean(dados) || falhou} falhaServidor={falhou}
      somenteLer voltarPara={[aqui, f.nome]} />;
  }

  const dona = dados?.pessoas.find((p) => p.papel === "dona");
  return (
    <div className="c-wrap fm">
      <Link className="btn-l hs-voltar" para={ROTAS.familia}><Icone nome="voltar" />Família</Link>
      <header className="fm-capa-txt">
        <p className="mao fm-mao">você faz parte</p>
        <h1 className="fm-titulo" tabIndex={-1}>{f.nome}</h1>
        <p className="fm-conta">
          Você entrou com o código de convite. Aqui você vê as memórias e a árvore desta família;
          quem guarda e muda as memórias é {dona ? dona.nome || dona.nomeCompleto : "a dona do acervo"}.
        </p>
      </header>

      {falhou && (
        <div className="fm-demora" role="alert">
          <p>Não deu para abrir esta família agora. Confira a internet e tente de novo.</p>
          <button type="button" className="btn btn-p" onClick={() => setTentativa((n) => n + 1)}><Icone nome="trocar" />Tentar de novo</button>
        </div>
      )}
      {!dados && !falhou && <p role="status">Abrindo…</p>}

      {dados && (
        <>
          <section className="fm-previa" aria-labelledby="fmb-m-t">
            <h2 id="fmb-m-t" className="c-h2">Memórias da família</h2>
            {dados.memorias.length ? (
              <ul className="hp-grade">
                {dados.memorias.map((m) => <li key={m.id}><TileGuardada m={m} para={`${aqui}/memoria/${m.id}`} /></li>)}
              </ul>
            ) : <p className="ed-dica">Esta família ainda não guardou memórias por aqui.</p>}
          </section>

          <section className="fm-previa" aria-labelledby="fmb-p-t">
            <h2 id="fmb-p-t" className="c-h2">Quem está na árvore</h2>
            <ul className="chips">
              {dados.pessoas.map((p) => (
                <li key={p.id}>{p.nome || p.nomeCompleto || "Sem nome"}{p.voce ? " (você)" : ""}</li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
