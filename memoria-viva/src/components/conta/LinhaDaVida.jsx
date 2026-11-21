import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { Miniatura } from "./midia.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { TIPOS, capaDe, resumo, textoQuando, tituloDe } from "./guardados.js";
import { carregarLinha } from "./memoriasServidor.js";
import { pessoa } from "../../dados/conta.js";

const POR_PAGINA = 30;

/** Os filtros da tela (Filtros.jsx) no formato da API. Pessoa: o nome (no servidor, as pessoas ainda são pelo nome). */
function filtrosDaApi(f) {
  return {
    ano: f.ano, decada: f.decada, de: f.de, ate: f.ate,
    etiqueta: [f.etapa, f.ocasiao].filter(Boolean),
    pessoa: f.pessoa ? pessoa(f.pessoa)?.nome || f.pessoa : "",
  };
}

/** Grupos por década, na ordem que veio do servidor (ele já ordenou). "Sem data" por último. */
function agrupar(memorias) {
  const grupos = [];
  for (const m of memorias) {
    const titulo = m.semData || m.anoNaLinha == null ? "Sem data definida" : `Anos ${Math.floor(m.anoNaLinha / 10) * 10}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.titulo === titulo) ultimo.itens.push(m);
    else grupos.push({ titulo, itens: [m] });
  }
  return grupos;
}

const plural = (n) => `${n} ${n === 1 ? "memória" : "memórias"}`;

/** O rótulo curto ao lado da linha, sem fingir mais precisão do que a pessoa deu. */
function rotuloAno(m) {
  if (m.anoNaLinha == null) return "•";
  const d = m.data || {};
  if (d.modo === "decada") return "Década";
  if (d.modo === "periodo" && d.anoFim && d.anoFim !== d.ano) return `${d.ano}–${d.anoFim}`;
  if (d.aprox) return `~${d.ano}`;
  return String(m.anoNaLinha);
}

/**
 * Linha da vida (conta com login): as memórias confirmadas do acervo, na ordem em que aconteceram,
 * vindas do servidor em páginas. A ordem e a regra de quem vê estão no servidor (GET /familias/:id/linha).
 * mudou: qualquer valor que muda quando uma memória é guardada, editada ou apagada (a linha recarrega).
 */
export default function LinhaDaVida({ filtro, mudou }) {
  const [estado, setEstado] = useState({ memorias: [], total: 0, proxima: null, carregando: true, erro: "" });
  const pedido = useRef(0);
  const chaveFiltro = JSON.stringify(filtro);

  const carregar = async (depois = null) => {
    const n = ++pedido.current; // se o filtro mudar no meio, a resposta antiga é ignorada
    setEstado((e) => ({ ...e, carregando: true, erro: "", ...(depois ? {} : { memorias: [] }) }));
    try {
      const r = await carregarLinha({ depois, limite: POR_PAGINA, filtros: filtrosDaApi(filtro) });
      if (n !== pedido.current) return;
      setEstado((e) => ({ memorias: depois ? [...e.memorias, ...r.memorias] : r.memorias, total: r.total, proxima: r.proxima, carregando: false, erro: "" }));
    } catch (falha) {
      if (n !== pedido.current) return;
      setEstado((e) => ({ ...e, carregando: false, erro: falha?.message || "Não deu para abrir a linha da vida agora." }));
    }
  };

  useEffect(() => { carregar(); }, [chaveFiltro, mudou]); // eslint-disable-line react-hooks/exhaustive-deps

  const { memorias, total, proxima, carregando, erro } = estado;

  if (erro && !memorias.length) {
    return (
      <div className="hs-vazio lt-erro" role="alert">
        <p>{erro}</p>
        <button type="button" className="btn btn-s" onClick={() => carregar()}><Icone nome="voltar" />Tentar de novo</button>
      </div>
    );
  }
  if (carregando && !memorias.length) return <p className="hs-vazio" role="status">Abrindo a linha da vida…</p>;
  if (!memorias.length) {
    return (
      <p className="hs-vazio">
        {Object.values(filtro).some(Boolean)
          ? "Nenhuma memória confirmada com esses filtros."
          : "Ainda não há memórias confirmadas na linha da vida. As que você guardar aparecem aqui, na ordem em que aconteceram."}
      </p>
    );
  }

  return (
    <section className="lt-container" aria-label="Linha da vida: as memórias na ordem em que aconteceram">
      <p className="lt-conta" role="status" aria-live="polite">Mostrando {memorias.length} de {plural(total)}.</p>
      {agrupar(memorias).map((g) => (
        <div key={g.titulo} className="lt-decada">
          <h2 className="mao lt-decada-titulo">{g.titulo}</h2>
          <ol className="lt-lista">
            {g.itens.map((m) => {
              const capa = capaDe(m);
              const quando = textoQuando(m) || (m.anoNaLinha ? `${m.anoNaLinha} (pela data das fotos)` : "");
              const resumoTexto = m.descricao || m.extra?.porque || m.extra?.lembranca || m.extra?.contexto || "";
              return (
                <li key={m.id} className="lt-item">
                  <span className="lt-ano" aria-hidden="true">{rotuloAno(m)}</span>
                  <Link className={`lt-card${capa ? " tem-foto" : ""}`} para={`${ROTAS.memoria}/${m.id}`}>
                    {capa && <span className="lt-midia" aria-hidden="true"><Miniatura arq={capa} /></span>}
                    <span className="lt-corpo">
                      <span className="lt-tipo"><Icone nome={TIPOS[m.tipo]?.icone || "memorias"} tam={16} />{resumo(m)}</span>
                      <b className="lt-titulo">{tituloDe(m)}</b>
                      {(quando || m.lugar) && <span className="lt-lugar">{[quando, m.lugar].filter(Boolean).join(" · ")}</span>}
                      {resumoTexto && <span className="lt-texto">{resumoTexto}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {erro && <p className="ed-erro" role="alert">{erro}</p>}
      {proxima && (
        <button type="button" className="btn btn-s lt-mais" onClick={() => carregar(proxima)} disabled={carregando}>
          {carregando ? "Abrindo…" : `Mostrar mais memórias (${total - memorias.length})`}
        </button>
      )}
    </section>
  );
}
