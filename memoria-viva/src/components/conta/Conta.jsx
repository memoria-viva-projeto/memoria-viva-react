import { Fragment, useLayoutEffect, useState } from "react";
import "../../conta.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import { CONTA, legado } from "../../dados/conta.js";
import Navegacao from "./Navegacao.jsx";
import PerguntaDoDia from "./PerguntaDoDia.jsx";
import Guardar from "./Guardar.jsx";
import { CartaoMemoria, CartaoConselho } from "./Feed.jsx";
import Lateral from "./Lateral.jsx";
import Ajustes from "./Ajustes.jsx";
import Icone from "./Icone.jsx";
import { PROXIMA_ETAPA, lerAjustes, salvarAjustes, aplicarAjustes, confete, menosMovimento } from "./efeitos.js";

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "bom dia" : h < 18 ? "boa tarde" : "boa noite";
}

/** Página inicial da conta da Maria (a visão dela). */
export default function Conta() {
  const [ajustes, setAjustes] = useState(lerAjustes);
  const [ajustesAberto, setAjustesAberto] = useState(false);
  const [memorias, setMemorias] = useState(CONTA.memorias);
  const [aviso, setAviso] = useState(null);
  const [anuncio, setAnuncio] = useState("");

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("pg-conta");
    document.title = "Sua história · Memória Viva";
    return () => html.classList.remove("pg-conta");
  }, []);

  useLayoutEffect(() => { aplicarAjustes(ajustes); salvarAjustes(ajustes); }, [ajustes]);

  const avisar = (texto = PROXIMA_ETAPA) => setAviso({ texto, n: Date.now() });

  const mudarMemoria = (id) => (fn) => setMemorias((ms) => ms.map((m) => (m.id === id ? fn(m) : m)));

  // Confirmar vale igual no cartão e em "Esperando você": muda o selo, solta confete e sai da lista.
  const confirmar = (id, origem) => {
    confete(origem);
    setMemorias((ms) => ms.map((m) => (m.id === id ? { ...m, status: "confirmada" } : m)));
    const m = memorias.find((x) => x.id === id);
    setAnuncio(`Pronto. “${m.titulo}” agora está confirmada por você.`);
  };

  const ver = (id) => {
    const el = document.getElementById(`mem-${id}`);
    el.scrollIntoView({ behavior: menosMovimento() ? "auto" : "smooth", block: "start" });
    el.querySelector(".selo").focus({ preventScroll: true });
  };

  const feed = memorias.filter((m) => m.tipo !== "conselho").sort((a, b) => a.publicadaHaDias - b.publicadaHaDias);
  const conselho = memorias.find((m) => m.tipo === "conselho");
  const total = legado(memorias).lembrancas;

  return (
    <div className="conta">
      <FaixaAzulejos semente="conta da maria" tamanho={22} girar={false} pares={PARES_URUCUM_ANIL} />
      <a className="c-pular" href="#sua-historia">Ir para sua história</a>
      <Navegacao onAviso={avisar} onAbrirAjustes={() => setAjustesAberto(true)} />

      <main className="c-wrap c-grid" id="inicio">
        <div className="c-cima">
          <div className="sd">
            <p className="mao sd-oi">{saudacao()}, {CONTA.pessoa.nome}!</p>
            <h1 className="sd-titulo">Qual lembrança vem hoje?</h1>
            <p className="sd-legado">Sua história já tem <b>{total} lembranças</b> guardadas para quem vem depois.</p>
          </div>
          <PerguntaDoDia onAviso={avisar} />
          <Guardar onAviso={avisar} />
        </div>

        <section className="c-feed" id="sua-historia" aria-labelledby="feed-t">
          <h2 id="feed-t" className="c-h2">Sua história</h2>
          {feed.map((m, i) => (
            <Fragment key={m.id}>
              <CartaoMemoria m={m} i={i} onConfirmar={confirmar} onMudar={mudarMemoria(m.id)} onAviso={avisar} />
              {i === 1 && conselho && <CartaoConselho m={conselho} i={i + 1} onAviso={avisar} />}
            </Fragment>
          ))}
        </section>

        <Lateral memorias={memorias} onConfirmar={confirmar} onVer={ver} onAviso={avisar} />
      </main>

      <footer className="c-rodape">
        <p>Conta de demonstração · as pessoas e histórias são fictícias.</p>
      </footer>

      <p className="sr" aria-live="polite">{anuncio}</p>

      {aviso && (
        <div className="c-aviso" role="status" key={aviso.n}>
          <Icone nome="conselho" />
          <p>{aviso.texto}</p>
          <button type="button" className="btn btn-s btn-sm" onClick={() => setAviso(null)}>
            <Icone nome="certo" />Entendi
          </button>
        </div>
      )}

      <Ajustes aberto={ajustesAberto} onFechar={() => setAjustesAberto(false)} ajustes={ajustes} onMudar={setAjustes} />
    </div>
  );
}
