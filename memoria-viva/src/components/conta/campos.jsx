import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import { ComVoz } from "./voz.jsx";
import { ETIQUETAS_TEMPO, MESES, dataVazia, modoData, textoData } from "./guardados.js";

/** Campo de texto grande, com exemplo e o microfone para falar em vez de escrever. */
export function Campo({ id, rotulo, valor, onMudar, exemplo, longo, linhas = 4, max = 400, obrigatorio, marca, erro, dica }) {
  const props = {
    id, value: valor || "", onChange: (e) => onMudar(e.target.value), "aria-invalid": !!erro,
    "aria-describedby": `${id}-dica`, required: obrigatorio,
  };
  return (
    <div className="ed-campo">
      <label htmlFor={id}>
        {rotulo}
        {marca && <span className={`ed-marca${marca === "obrigatório" ? " ed-obrig" : ""}`}> ({marca})</span>}
      </label>
      <ComVoz rotulo={rotulo} valor={valor} onMudar={onMudar}>
        {longo ? <textarea rows={linhas} maxLength={max} {...props} /> : <input type="text" maxLength={max} {...props} />}
      </ComVoz>
      <span id={`${id}-dica`} className={erro ? "ed-erro" : "ed-dica"}>{erro || dica || (exemplo && `Exemplo: ${exemplo}`)}</span>
    </div>
  );
}

const anoAgora = new Date().getFullYear();
const ANO = /^\d{4}$/;

/** Erro da data, ou "" se está boa (tudo é opcional, mas o que foi escrito precisa fazer sentido). */
export function erroData(d) {
  if (!d) return "";
  const modo = modoData(d);
  if (["dia", "mes", "ano", "periodo"].includes(modo) && d.ano) {
    if (!ANO.test(d.ano)) return "O ano precisa ter 4 números, como 1975.";
    if (d.ano < 1800 || d.ano > anoAgora) return `O ano precisa ficar entre 1800 e ${anoAgora}.`;
  }
  if (modo === "dia" && d.dia && !d.mes) return "Escolha também o mês, ou deixe o dia em branco.";
  if (modo === "periodo" && d.anoFim) {
    if (!d.ano) return "Escreva também o primeiro ano do período.";
    if (!ANO.test(d.anoFim) || d.anoFim < d.ano || d.anoFim > anoAgora) return "O segundo ano precisa ser depois do primeiro.";
  }
  return "";
}

const MODOS = [["dia", "O dia exato"], ["mes", "O mês e o ano"], ["ano", "Só o ano"], ["decada", "A década"], ["periodo", "Um período"], ["naosei", "Não sei"]];
const DECADAS = Array.from({ length: 11 }, (_, k) => String(1920 + k * 10));

/** Ao trocar o que a pessoa sabe, aproveita o que já foi escrito (o ano vira década, e assim por diante). */
function paraModo(d, modo) {
  const ano = ["dia", "mes", "ano", "periodo"].includes(modo) ? d.ano : ""; // a década não vira um ano exato
  return {
    ...dataVazia(), modo, ano,
    mes: ["dia", "mes"].includes(modo) ? d.mes : "",
    dia: modo === "dia" ? d.dia : "",
    anoFim: modo === "periodo" ? d.anoFim : "",
    decada: modo === "decada" ? d.decada || (ANO.test(d.ano || "") ? String(Math.floor(d.ano / 10) * 10) : "") : "",
    aprox: modo === "ano" ? !!d.aprox : false,
    naoSei: modo === "naosei",
  };
}

function Ano({ id, rotulo = "Ano", valor, onMudar, erro, exemplo = "1975" }) {
  return (
    <div className="ed-campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} type="text" inputMode="numeric" maxLength={4} placeholder={exemplo} value={valor || ""} aria-invalid={!!erro}
        onChange={(e) => onMudar(e.target.value.replace(/\D/g, ""))} />
    </div>
  );
}

/**
 * Quando foi, do jeito que a pessoa sabe: primeiro ela diz o que sabe (o dia, o ano, a década...),
 * depois só aparecem os campos daquilo. "Não sei" também é uma resposta.
 */
export function CampoData({ id, legenda = "Quando aconteceu", valor, onMudar, erro }) {
  const d = { ...dataVazia(), ...valor };
  const modo = modoData(d);
  const mudar = (parte, v) => onMudar({ ...d, modo, [parte]: v });
  const texto = textoData(d);

  return (
    <fieldset className="qd" aria-describedby={`${id}-msg`}>
      <legend>{legenda} <span className="ed-marca">(opcional)</span></legend>
      <p className="qd-perg" id={`${id}-perg`}>O que você sabe sobre a data?</p>
      <div className="qd-modos" role="radiogroup" aria-labelledby={`${id}-perg`}>
        {MODOS.map(([k, nome]) => (
          <label key={k} className={`qd-modo${modo === k ? " on" : ""}`}>
            <input type="radio" name={`${id}-modo`} checked={modo === k} onChange={() => onMudar(paraModo(d, k))} />
            {modo === k && <Icone nome="certo" tam={16} />}{nome}
          </label>
        ))}
      </div>

      {(modo === "dia" || modo === "mes") && (
        <div className={`qd-campos qd-${modo}`}>
          {modo === "dia" && (
            <div className="ed-campo">
              <label htmlFor={`${id}-dia`}>Dia</label>
              <select id={`${id}-dia`} value={d.dia} onChange={(e) => mudar("dia", e.target.value)}>
                <option value="">—</option>
                {Array.from({ length: 31 }, (_, k) => String(k + 1).padStart(2, "0")).map((x) => <option key={x} value={x}>{Number(x)}</option>)}
              </select>
            </div>
          )}
          <div className="ed-campo">
            <label htmlFor={`${id}-mes`}>Mês</label>
            <select id={`${id}-mes`} value={d.mes} onChange={(e) => mudar("mes", e.target.value)}>
              <option value="">—</option>
              {MESES.map((m, k) => <option key={m} value={String(k + 1).padStart(2, "0")}>{m}</option>)}
            </select>
          </div>
          <Ano id={`${id}-ano`} valor={d.ano} onMudar={(v) => mudar("ano", v)} erro={erro} />
        </div>
      )}
      {modo === "ano" && (
        <div className="qd-campos qd-ano">
          <Ano id={`${id}-ano`} valor={d.ano} onMudar={(v) => mudar("ano", v)} erro={erro} />
          <label className="ed-check">
            <input type="checkbox" checked={!!d.aprox} onChange={(e) => mudar("aprox", e.target.checked)} />
            <span>Mais ou menos (não tenho certeza)</span>
          </label>
        </div>
      )}
      {modo === "decada" && (
        <div className="qd-decadas" role="radiogroup" aria-label="Década">
          {DECADAS.map((x) => (
            <label key={x} className={`qd-modo qd-decada${d.decada === x ? " on" : ""}`}>
              <input type="radio" name={`${id}-decada`} checked={d.decada === x} onChange={() => mudar("decada", x)} />
              {d.decada === x && <Icone nome="certo" tam={16} />}Anos {x.slice(2)}<span className="sr"> (de {x} a {Number(x) + 9})</span>
            </label>
          ))}
        </div>
      )}
      {modo === "periodo" && (
        <div className="qd-campos qd-periodo">
          <Ano id={`${id}-ano`} rotulo="De (ano)" valor={d.ano} onMudar={(v) => mudar("ano", v)} erro={erro} exemplo="1970" />
          <Ano id={`${id}-fim`} rotulo="Até (ano)" valor={d.anoFim} onMudar={(v) => mudar("anoFim", v)} erro={erro} exemplo="1978" />
        </div>
      )}

      <p id={`${id}-msg`} className={erro ? "ed-erro" : "ed-dica"} role={erro ? "alert" : undefined}>
        {erro || (modo === "naosei" ? "Tudo bem, não precisa saber. Se lembrar a fase da vida ou a ocasião, escolha abaixo."
          : texto ? `Vai aparecer assim: ${texto}` : modo ? "Preencha só o que souber." : "Escolha o que você lembra. Também pode deixar em branco.")}
      </p>
    </fieldset>
  );
}

/** Fase da vida, momento ou ocasião: etiquetas para tocar (uma ou várias). Não são datas. */
export function EtiquetasTempo({ id, valor = [], onMudar }) {
  return (
    <fieldset className="et" aria-describedby={`${id}-dica`}>
      <legend>Fase ou ocasião <span className="ed-marca">(opcional, pode escolher várias)</span></legend>
      <p id={`${id}-dica`} className="ed-dica">Não precisa saber a data: toque no que você lembra.</p>
      {ETIQUETAS_TEMPO.map(([grupo, lista]) => (
        <div key={grupo} className="et-grupo" role="group" aria-label={grupo}>
          <p className="et-nome" aria-hidden="true">{grupo}</p>
          <div className="et-lista">
            {lista.map(([k, nome]) => {
              const on = valor.includes(k);
              return (
                <button key={k} type="button" className={`et-tag${on ? " on" : ""}`} aria-pressed={on}
                  onClick={() => onMudar(on ? valor.filter((x) => x !== k) : [...valor, k])}>
                  {on ? <Icone nome="certo" tam={16} /> : <Icone nome="mais" tam={16} />}{nome}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

/** Janela (sobe de baixo no celular, centralizada no computador), no mesmo jeito dos Ajustes. */
export function Janela({ id, aberta, onFechar, titulo, className = "", children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (aberta && !d.open) d.showModal();
    else if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <dialog ref={ref} className={`aj ${className}`} aria-labelledby={`${id}-t`} onClose={() => aberta && onFechar()}>
      {aberta && (
        <div className="aj-in">
          <div className="aj-cab">
            <h2 id={`${id}-t`}>{titulo}</h2>
            <button type="button" className="aj-fechar" onClick={onFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** Texto livre que cresce enquanto a pessoa escreve (sem barra de rolagem dentro do campo). */
export function TextoLivre({ valor, onMudar, linhas = 2, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const t = ref.current;
    t.style.height = "auto";
    t.style.height = `${t.scrollHeight + 2}px`;
  }, [valor]);
  return <textarea ref={ref} rows={linhas} value={valor || ""} onChange={(e) => onMudar(e.target.value)} {...props} />;
}
