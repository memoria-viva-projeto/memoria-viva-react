import { useEffect, useRef, useState } from "react";
import FaixaAzulejos from "./FaixaAzulejos.jsx";
import { reduzirMovimento } from "../azulejaria.js";

const PALAVRAS = ["vó.", "mãe.", "tio.", "vô.", "madrinha.", "pai.", "tia."];

// Cada item da "mesa": posição, profundidade do parallax e de onde ele "cai" ao abrir.
const MESA = [
  { pos: { left: "0", top: "3%", width: "52%" }, prof: 18, cai: { "--fx": "-80px", "--fy": "-40px", "--fr": "-14deg" }, flut: { "--d": "8s" },
    foto: { src: "amarelinha.jpg", giro: -5, legenda: "a rua de baixo, 1983", fita: ["t-turq", { left: "36%", top: -12 }] } },
  { pos: { left: "55%", top: "0", width: "36%" }, prof: 26, cai: { "--fy": "-90px", "--fr": "16deg" }, flut: { "--d": "7s", "--dl": "-2s" },
    foto: { src: "janela-casal.jpg", giro: 6, legenda: "casa nova!", fita: ["t-uru", { left: "30%", top: -12 }] } },
  { pos: { left: "22%", top: "34%", width: "52%", zIndex: 3 }, prof: 10, cai: { "--fy": "60px", "--fr": "8deg" }, flut: { "--d": "9s", "--dl": "-1s" }, logo: true },
  { pos: { left: "2%", top: "58%", width: "28%" }, prof: 30, cai: { "--fx": "-60px", "--fy": "40px" }, flut: { "--d": "6.5s", "--dl": "-3s" },
    foto: { src: "bebe.jpg", giro: 4, cantoneiras: true } },
  { pos: { left: "70%", top: "46%", width: "30%" }, prof: 22, cai: { "--fx": "60px", "--fr": "-10deg" }, flut: { "--d": "7.5s", "--dl": "-4s" },
    foto: { src: "cachorro.jpg", giro: -4, legenda: "o Pipoca" } },
  { pos: { left: "52%", top: "76%", width: "30%" }, prof: 14, cai: { "--fy": "80px", "--fr": "-6deg" }, flut: { "--d": "8.5s", "--dl": "-2.5s" },
    foto: { src: "cafe.jpg", giro: 3, recorte: true } },
];

function FotoAlbum({ src, giro, legenda, fita, cantoneiras, recorte }) {
  const classes = ["foto", legenda && "leg", cantoneiras && "cant"].filter(Boolean).join(" ");
  return (
    <div className={classes} style={{ transform: `rotate(${giro}deg)` }}>
      {fita && <span className={`tape ${fita[0]}`} style={fita[1]} />}
      <img src={`/img/${src}`} alt="" style={recorte ? { aspectRatio: "4/3", objectFit: "cover" } : undefined} />
      {legenda && <span className="lg">{legenda}</span>}
    </div>
  );
}

function Carimbo() {
  return (
    <div className="stamp" style={{ left: "80%", top: "84%", width: 110 }}>
      <svg viewBox="0 0 120 120" width="100%">
        <defs><path id="carimbo" d="M60 60m-42 0a42 42 0 1 1 84 0a42 42 0 1 1-84 0" /></defs>
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text fontFamily="Montserrat, sans-serif" fontSize="10" fontWeight="800" fill="currentColor" letterSpacing="1">
          <textPath href="#carimbo" textLength="258" lengthAdjust="spacingAndGlyphs">ACERVO DA FAMÍLIA · MEMÓRIA VIVA ·</textPath>
        </text>
        <text x="60" y="66" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="20" fill="currentColor">1983</text>
      </svg>
    </div>
  );
}

export default function Hero() {
  const [palavra, setPalavra] = useState(0);
  const mesaRef = useRef(null);
  const itensRef = useRef([]);

  // palavra que troca
  useEffect(() => {
    if (reduzirMovimento()) return;
    const t = setInterval(() => setPalavra((p) => (p + 1) % PALAVRAS.length), 2200);
    return () => clearInterval(t);
  }, []);

  // parallax: as fotos seguem o mouse
  const mover = (e) => {
    if (reduzirMovimento() || !window.matchMedia("(pointer:fine)").matches) return;
    const r = mesaRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    itensRef.current.forEach((el, i) => {
      if (el) el.style.transform = `translate(${(-x * MESA[i].prof).toFixed(1)}px, ${(-y * MESA[i].prof).toFixed(1)}px)`;
    });
  };
  const soltar = () => itensRef.current.forEach((el) => el && (el.style.transform = ""));

  return (
    <section className="hero" id="inicio" onPointerMove={mover} onPointerLeave={soltar}>
      <div className="wrap">
        <div>
          <span className="mao" style={{ fontSize: "clamp(28px,3vw,38px)", color: "var(--urucum-7)", display: "inline-block", transform: "rotate(-2deg)" }}>
            fotos, receitas, músicas e causos
          </span>
          <h1 style={{ marginTop: 12 }}>
            Conta pra mim, <span className="who"><span className="who-medida" aria-hidden="true">madrinha.</span><span key={palavra}>{PALAVRAS[palavra]}</span></span>
          </h1>
          <p className="lede">
            Junte as lembranças de várias gerações num só lugar. A IA ajuda a organizar e a fazer as perguntas certas. A família confirma o que é verdade.
          </p>
          <div className="ctas">
            <a className="btn btn-p" href="#comecar">Começar o acervo da família</a>
            <a className="btn btn-s" href="#como">Ver como funciona</a>
          </div>
        </div>

        <div className="mesa" ref={mesaRef} aria-hidden="true">
          {MESA.map((item, i) => (
            <div key={i} className="it drop" ref={(el) => (itensRef.current[i] = el)} style={{ ...item.pos, ...item.cai }}>
              <div className="in" style={{ ...item.flut, animationDelay: `${i * 0.12}s, ${0.9 + i * 0.12}s` }}>
                {item.logo ? (
                  <div className="card-logo" style={{ transform: "rotate(-2deg)" }}>
                    <span className="tape t-gema" style={{ left: -16, top: 12, transform: "rotate(-38deg)" }} />
                    <span className="tape t-gema" style={{ right: -16, top: 12, transform: "rotate(38deg)" }} />
                    <img src="/img/logo.png" alt="" />
                  </div>
                ) : (
                  <FotoAlbum {...item.foto} />
                )}
              </div>
            </div>
          ))}
          <Carimbo />
        </div>
      </div>
      <FaixaAzulejos semente="capa" tamanho={56} />
    </section>
  );
}
