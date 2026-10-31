// Dados fictícios, só para o protótipo.
const FASES = [
  { ano: 1943, foto: "1943-infancia", titulo: "Infância",
    texto: "Maria, aos 6 anos, na porta de casa com os pais, Josefa e Severino. O laço no cabelo foi a mãe que costurou.",
    alt: "Menina sorrindo, sentada entre a mãe e o pai na porta de casa", legenda: "eu e meus pais", giro: -3 },
  { ano: 1955, foto: "1955-juventude", titulo: "Um retrato de juventude",
    texto: "Aos 18 anos, tirou o primeiro retrato num estúdio do centro. Guardou a foto dentro da Bíblia por sessenta anos.",
    alt: "Retrato de Maria jovem, de cabelo curto ondulado, olhando para o lado", legenda: "meu primeiro retrato", giro: 2 },
  { ano: 1957, foto: "1957-casamento", titulo: "Casamento com Antônio",
    texto: "Casou com Antônio na igreja matriz de Caruaru, num sábado de junho. O buquê era de rosas brancas do quintal da madrinha.",
    alt: "Maria de noiva, com véu e buquê, ao lado de Antônio de terno", legenda: "o sim, junho de 1957", giro: -2 },
  { ano: 1982, foto: "1982-bodas", titulo: "Bodas de prata",
    texto: "Vinte e cinco anos de casados, comemorados no quintal, debaixo da buganvília que ela mesma plantou.",
    alt: "Maria e Antônio abraçados diante de uma buganvília florida", legenda: "25 anos, debaixo da buganvília", giro: 3 },
  { ano: 2010, foto: "2010-cozinha", titulo: "Uma tarde na cozinha",
    texto: "O bolo de fubá de todo domingo. A receita nunca foi escrita: Maria ensina de olho, de mão e de cheiro.",
    alt: "Maria de avental vermelho segurando uma forma com bolo de fubá", legenda: "o bolo de domingo", giro: -2 },
  { ano: 2022, foto: "2022-reencontro", titulo: "O reencontro",
    texto: "Filhos, netos e bisnetos juntos pela primeira vez depois de anos. Maria no meio, como sempre.",
    alt: "Maria no centro de um grupo sorridente de filhos e netos", legenda: "todo mundo junto", giro: 2 },
];

/** Página de uma pessoa: abertura com o retrato de hoje e a linha do tempo da vida dela. */
export default function Maria() {
  return (
    <>
      <section className="band" style={{ background: "var(--papel)" }}>
        <div className="wrap maria-abre">
          <div>
            <span className="eyebrow" style={{ color: "var(--urucum-6)" }}>a história de</span>
            <h1>Maria</h1>
            <p className="sobre">Maria de Lourdes Ferreira · nasceu em 1937, em Caruaru (PE)</p>
            <p className="lede">Costureira, cozinheira de domingo e plantadora de buganvília. Esta é a vida dela, contada pelas fotos que guardou.</p>
          </div>
          <div className="foto leg cant">
            <span className="tape t-gema" style={{ left: "38%", top: -12 }} />
            <img src="/img/maria/hoje.jpg" alt="Maria hoje, de cabelos brancos e casaco verde, sorrindo ao lado de um vaso de flores" />
            <span className="lg">hoje, aos 89</span>
          </div>
        </div>
      </section>

      <section className="band" style={{ background: "var(--linho)" }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow" style={{ color: "var(--urucum-6)" }}>de 1943 até hoje</span>
            <h2 className="h2" style={{ color: "var(--anil)" }}>A vida de Maria</h2>
          </div>

          <ol className="vida">
            {FASES.map((f) => (
              <li className="fase" key={f.ano}>
                <div className="txt">
                  <span className="ano">{f.ano}</span>
                  <h3>{f.titulo}</h3>
                  <p>{f.texto}</p>
                </div>
                <div className="foto leg" style={{ transform: `rotate(${f.giro}deg)` }}>
                  <span className="tape t-gema" style={{ left: "36%", top: -12 }} />
                  <img src={`/img/maria/${f.foto}.jpg`} alt={f.alt} />
                  <span className="lg">{f.legenda}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
