import { useState } from "react";
import Icone from "./Icone.jsx";
import { Campo, CampoData, EtiquetasTempo, erroData } from "./campos.jsx";
import { EscolherPessoas } from "./pessoas.jsx";
import { pessoa } from "../../dados/conta.js";
import { textoQuando } from "./guardados.js";

const nomes = (refs) => {
  const n = refs.map((p) => pessoa(p).nome);
  return n.length > 2 ? `${n.slice(0, 2).join(", ")} e mais ${n.length - 2}` : n.join(" e ");
};

/**
 * Quando · Onde · Quem, numa linha só: cada um é um botão que abre o campo ali mesmo.
 * Quando já tem resposta, o botão mostra a resposta (dá para conferir sem abrir nada).
 */
export default function Detalhes({ id = "dt", m, mudar, sugestoes, comPessoas = true, rotulos = {} }) {
  const [aberto, setAberto] = useState(null);
  const data = textoQuando(m);
  const erro = erroData(m.data);
  const alternar = (k) => setAberto((a) => (a === k ? null : k));
  const pronto = (
    <button type="button" className="btn btn-s btn-sm dt-pronto" onClick={() => setAberto(null)}><Icone nome="certo" />Pronto</button>
  );

  const chip = (k, icone, valor, vazio) => (
    <button type="button" className={`dt-chip${valor ? " on" : ""}${aberto === k ? " aberto" : ""}`} aria-expanded={aberto === k} onClick={() => alternar(k)}>
      <Icone nome={icone} tam={20} />
      <span>{valor || vazio}</span>
    </button>
  );

  return (
    <div className="dt">
      <div className="dt-chips" role="group" aria-label="Quando, onde e com quem (opcional)">
        {chip("data", "calendario", data, rotulos.data || "Quando foi?")}
        {chip("lugar", "pin", m.lugar, rotulos.lugar || "Onde foi?")}
        {comPessoas && chip("pessoas", "marcar", m.pessoas.length ? nomes(m.pessoas) : "", rotulos.pessoas || "Quem estava?")}
      </div>
      {erro && aberto !== "data" && <p className="ed-erro" role="alert">{erro}</p>}

      {aberto === "data" && (
        <div className="dt-painel">
          <CampoData id={`${id}-data`} legenda={rotulos.legendaData || "Quando aconteceu"} valor={m.data} onMudar={(d) => mudar({ data: d })} erro={erro} />
          <EtiquetasTempo id={`${id}-etiquetas`} valor={m.etiquetas} onMudar={(etiquetas) => mudar({ etiquetas })} />
          {pronto}
        </div>
      )}
      {aberto === "lugar" && (
        <div className="dt-painel">
          <Campo id={`${id}-lugar`} rotulo={rotulos.legendaLugar || "Onde foi"} valor={m.lugar} onMudar={(v) => mudar({ lugar: v })} max={160}
            exemplo={rotulos.exemploLugar || "Casa da família, em Campinas"} />
          {pronto}
        </div>
      )}
      {aberto === "pessoas" && (
        <div className="dt-painel">
          <EscolherPessoas id={`${id}-pessoas`} rotulo={rotulos.legendaPessoas || "Quem estava"} valor={m.pessoas} onMudar={(p) => mudar({ pessoas: p })} sugestoes={sugestoes} />
          {pronto}
        </div>
      )}
    </div>
  );
}
