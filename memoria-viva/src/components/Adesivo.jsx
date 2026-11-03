// Adesivos folk art: desenhos colados na página como num álbum de recortes.
// Usa as cópias leves em web/ (os PNGs originais continuam na pasta ao lado, intactos).
// Posição, tamanho e giro ficam no CSS de cada tela (classe "ad-…"); "so-desk" esconde no celular.
// fita="gema" (ou turq, uru, azul, papel) prende o desenho com um pedaço de fita, como as fotos.
const PASTA = "/img/folk_art_brasileiro_png/web/";

/** Desenho decorativo: não recebe clique nem é lido pelo leitor de tela. */
export default function Adesivo({ nome, className = "", fita }) {
  const img = (
    <img className={fita ? undefined : `adesivo ${className}`.trim()} src={`${PASTA}${nome}.webp`} alt="" aria-hidden="true"
      loading="lazy" decoding="async" draggable="false" />
  );
  if (!fita) return img;
  return (
    <span className={`adesivo adesivo-fita ${className}`.trim()} aria-hidden="true">
      {img}
      <span className={`tape t-${fita}`} />
    </span>
  );
}
