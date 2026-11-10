import { progresso } from "./arvoreMemoria.js";

// Árvore da memória: desenho limpo e fofo (formas redondas, cores chapadas, poucos detalhes).
// A copa é uma "nuvem" lisa de círculos da mesma cor; as flores são margaridinhas iguais, bem distribuídas.
// Cada estágio muda o tamanho, o formato e o tom da copa — e ganha flores, frutinhos e um passarinho.
// viewBox fixo (320 × 262, chão em y = 250): nada sai do quadro.

const ESTILO = [
  null, // a muda é desenhada à parte
  { escala: [0.58, 0.68], copa: [[160, 118, 40], [131, 134, 28], [189, 132, 30]], cor: "#CFE3B4", flores: [0, 0], frutos: 0 },
  { escala: [0.72, 0.8], copa: [[160, 108, 50], [119, 128, 36], [201, 126, 38], [141, 84, 32], [181, 84, 32]], cor: "#B7D59A", botoes: true, flores: [1, 3], frutos: 0 },
  { escala: [0.86, 0.94], copa: [[160, 96, 64], [104, 122, 46], [216, 118, 48], [130, 66, 42], [192, 64, 42]], cor: "#A6CB88", sombra: "#8DB872", flores: [4, 7], frutos: 0 },
  { escala: [1, 1], copa: [[160, 92, 68], [100, 118, 48], [220, 114, 50], [128, 60, 44], [194, 58, 44], [66, 138, 30], [256, 134, 32]], cor: "#93BE76", sombra: "#77A55E", flores: [7, 7], frutos: 0, passarinho: true,
    // 7 flores em fileiras simétricas (2 · 3 · 2), cores espelhadas
    lugares: [[122, 84, "branca"], [198, 84, "branca"], [90, 116, "laranja"], [160, 112, "branca"], [230, 116, "laranja"], [124, 146, "branca"], [196, 146, "branca"]] },
];
// lugares das flores (na borda de cima e dos lados da copa: nunca empilhadas)
const FLORES = [[160, 40], [112, 78], [208, 74], [84, 118], [236, 112], [140, 118], [184, 120], [160, 76]];
const FRUTOS = [[124, 158], [196, 162], [158, 170], [222, 150], [92, 146]];
const BOTOES = [[138, 82], [186, 92], [160, 66]];

function Margarida({ x, y, cor }) {
  const petala = cor === "branca" ? "#FFFDF8" : "var(--urucum)";
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} r="5.4" cx={Math.sin((a * Math.PI) / 180) * 6.2} cy={-Math.cos((a * Math.PI) / 180) * 6.2} fill={petala} />
      ))}
      <circle r="4.2" fill="var(--gema)" />
    </g>
  );
}

const Tronco = () => (
  <g fill="var(--barro)">
    <path d="M150 252c3-34 4-74 6-116h8c2 42 3 82 6 116z" />
    <path d="M157 178c-12-8-24-14-38-16l1-7c15 2 28 8 40 17z" />
    <path d="M163 168c10-10 22-16 36-19l2 7c-13 3-24 9-34 18z" />
  </g>
);

export default function ArvoreMemoria({ total, rotulo, className = "", crescer = true }) {
  const { i: estagio, fracao, atual } = progresso(total);
  const aria = rotulo || `Árvore da memória: ${atual.nome}, com ${total} ${total === 1 ? "lembrança" : "lembranças"}.`;
  const f = Math.max(0, Math.min(1, fracao));
  const cls = `arv am ${crescer ? "am-cresce" : ""} ${className}`;

  // 1 · a muda: um brotinho com duas folhas redondas num montinho de terra
  if (estagio === 0) {
    return (
      <svg className={cls} viewBox="0 0 320 262" role="img" aria-label={aria}>
        <ellipse className="arv-chao" cx="160" cy="250" rx="44" ry="8" />
        <path d="M134 252q26-20 52 0z" fill="#C49A76" />
        <g className="arv-balanca">
          <path d="M160 246c0-10 0-20-1-30" stroke="#6E9555" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M158 218c-16 2-25-6-26-17 13-3 24 4 26 17z" fill="#93BE76" />
          <path d="M161 214c4-14 16-20 27-16-2 13-14 19-27 16z" fill="#6E9555" />
        </g>
      </svg>
    );
  }

  const e = ESTILO[estagio];
  const escala = e.escala[0] + (e.escala[1] - e.escala[0]) * f;
  const nFlores = Math.round(e.flores[0] + (e.flores[1] - e.flores[0]) * f);
  const [mx, my, mr] = e.copa[0]; // o círculo maior (para o brilho)

  return (
    <svg className={cls} viewBox="0 0 320 262" role="img" aria-label={aria}>
      <ellipse className="arv-chao" cx="160" cy="250" rx={50 + 70 * escala} ry="9" />
      <g className="am-tamanho" style={{ transform: `scale(${escala.toFixed(3)})` }}>
        <g className="arv-balanca">
          <Tronco />
          {/* copa: uma nuvem lisa (com sombra embaixo nos estágios maiores) e um brilho suave */}
          {e.sombra && <g fill={e.sombra}>{e.copa.map(([x, y, r]) => <circle key={`s${x}`} cx={x} cy={y + 9} r={r} />)}</g>}
          <g fill={e.cor} className="am-surge">{e.copa.map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} />)}</g>
          <circle cx={mx - mr * 0.34} cy={my - mr * 0.38} r={mr * 0.32} fill="#FFFDF8" opacity=".22" />

          {e.botoes && BOTOES.slice(0, nFlores).map(([x, y]) => <circle key={x} className="am-surge" cx={x} cy={y} r="5" fill="var(--gema)" />)}
          {!e.botoes && (e.lugares || FLORES).slice(0, nFlores).map(([x, y, cor], k) => (
            <g key={k} className="am-surge"><Margarida x={x} y={y} cor={cor || (k % 2 ? "laranja" : "branca")} /></g>
          ))}
          {FRUTOS.slice(0, e.frutos).map(([x, y], k) => (
            <g key={k} className="am-surge">
              <ellipse cx={x + 3} cy={y - 7} rx="3.6" ry="2" fill="#5C7F45" transform={`rotate(-30 ${x + 3} ${y - 7})`} />
              <circle cx={x} cy={y} r="6.2" fill="var(--urucum-6)" />
            </g>
          ))}
          {e.passarinho && (
            <g className="am-surge"><g className="am-passarinho" transform="translate(170 26) scale(1.35)">
              {/* pezinhos */}
              <path d="M-3 13v5M3 13v5" stroke="var(--urucum-6)" strokeWidth="2" strokeLinecap="round" />
              {/* rabinho */}
              <path d="M-12 4c-7-1-11-5-12-9 6 0 10 2 13 5z" fill="#3C7A73" />
              {/* corpinho redondo e barriguinha */}
              <circle cx="0" cy="2" r="13" fill="var(--turquesa)" />
              <ellipse cx="3" cy="6" rx="8" ry="7" fill="#E2ECE6" />
              {/* asinha */}
              <path d="M-9 1c2-6 9-8 12-4-1 6-7 9-12 4z" fill="#3C7A73" />
              {/* olhinho com brilho, bochecha e biquinho */}
              <circle cx="5" cy="-4" r="2.4" fill="var(--anil)" />
              <circle cx="5.9" cy="-4.9" r=".9" fill="#FFFDF8" />
              <circle cx="9" cy="1" r="2.4" fill="var(--urucum)" opacity=".35" />
              <path d="M12-3l5 1.5-5 2z" fill="var(--gema)" />
            </g></g>
          )}
        </g>
      </g>
    </svg>
  );
}
