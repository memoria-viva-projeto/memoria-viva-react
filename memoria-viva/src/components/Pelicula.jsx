const FOTOS = [
  ["amarelinha", "amarelinha, 1983"], ["sala-turquesa", "a sala da vó"], ["cozinha", "a cozinha"],
  ["janela", "casa nova"], ["varal", "o varal de fotos"], ["retratos-close", "a parede"],
  ["sinuca", "sábado no bar"], ["escola", "a escola"], ["bebe", "batizado"], ["quintal", "o quintal"],
  ["ladrilho-estrela", "o chão da varanda"], ["sala-azul", "a sala azul"], ["mesinha", "a mesinha"], ["album-verde", "o álbum verde"],
];

/** Rolo de filme com fotos passando sem parar (pausa ao passar o mouse). */
export default function Pelicula() {
  const quadros = [...FOTOS, ...FOTOS]; // duplicado para o loop não ter emenda
  return (
    <section className="reel" aria-label="Lembranças de família">
      <div className="track">
        {quadros.map(([foto, legenda], i) => (
          <div className="fr" key={i}>
            <img src={`/img/${foto}.jpg`} alt="" loading="lazy" />
            <span>{legenda}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
