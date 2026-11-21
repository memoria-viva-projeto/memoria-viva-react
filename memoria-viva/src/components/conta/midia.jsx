import { useEffect, useState } from "react";
import Icone from "./Icone.jsx";
import { urlDoArquivo } from "./guardados.js";

/** Endereço de um arquivo guardado no navegador (mini = miniatura). Some sozinho quando a tela sai. */
export function useArquivo(id, mini) {
  const [r, setR] = useState(null);
  useEffect(() => {
    if (!id) return setR(null);
    let vivo = true, achado;
    urlDoArquivo(id, mini).then((x) => { achado = x; if (vivo) setR(x); }).catch(() => vivo && setR(null));
    return () => {
      vivo = false;
      if (achado && !achado.fica) URL.revokeObjectURL(achado.url);
    };
  }, [id, mini]);
  return r;
}

/** Se o endereço não abrir (arquivo apagado, sem acesso, sem internet), a tela mostra um aviso no lugar. */
function useFalhou(url) {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => setFalhou(false), [url]);
  return [falhou, () => setFalhou(true)];
}

/** Miniatura quadrada da foto. */
export function Miniatura({ arq, alt = "", className = "" }) {
  const r = useArquivo(arq, true);
  const [falhou, falhar] = useFalhou(r?.url);
  return (
    <span className={`mi ${className}`}>
      {r && !falhou ? <img src={r.url} alt={alt} loading="lazy" onError={falhar} /> : <Icone nome="foto" tam={30} />}
      {falhou && <span className="sr">Arquivo indisponível</span>}
    </span>
  );
}

/** Foto inteira, sem cortar (para ver e para marcar pessoas). */
export function FotoInteira({ arq, alt = "", onCarregar, ...props }) {
  const r = useArquivo(arq, false);
  const [falhou, falhar] = useFalhou(r?.url);
  if (falhou) return <span className="fi-carregando" role="status">Esta foto não está disponível agora.</span>;
  if (!r) return <span className="fi-carregando">Abrindo a foto…</span>;
  return <img src={r.url} alt={alt} onLoad={onCarregar} onError={falhar} draggable={false} {...props} />;
}
