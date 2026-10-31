import FaixaAzulejos from "./FaixaAzulejos.jsx";

export default function Rodape() {
  return (
    <footer>
      <FaixaAzulejos semente="rodape" tamanho={48} />
      <div className="wrap foot">
        <div style={{ background: "#FFFDF8", padding: "12px 16px", transform: "rotate(-2deg)" }}>
          <img src="/img/logo-h.png" alt="Memória Viva" style={{ height: 44, width: "auto" }} />
        </div>
        <p className="mao" style={{ fontSize: "clamp(40px,5vw,64px)", color: "var(--gema)" }}>conta pra mim.</p>
      </div>
    </footer>
  );
}
