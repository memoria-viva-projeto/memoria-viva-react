import { createContext, useContext } from "react";

// Telas de dentro da conta. A troca é feita sem recarregar (o que a Maria confirmou continua lá).
export const ROTAS = {
  inicio: "/conta", historia: "/conta/historia", perfil: "/conta/perfil", editar: "/conta/perfil/editar",
  guardar: "/conta/guardar", // + "/foto", "/album"... (um caminho para cada tipo)
  memoria: "/conta/memoria", // + "/<id>" (uma memória guardada)
  familia: "/conta/familia", // + "/arvore", "/novo", "/<id>", "/<id>/editar"
  conversar: "/conta/conversar", // + "?sobre=<id da memória>" e, vindo da pergunta do dia, "&pergunta=<n>"
};

/** Conversar sobre uma memória (e, da pergunta do dia, já com a pergunta). */
export const conversarSobre = (id, pergunta) => `${ROTAS.conversar}?sobre=${encodeURIComponent(id)}${pergunta != null ? `&pergunta=${pergunta}` : ""}`;

export const Navegar = createContext(() => {});

/** Link interno da conta: muda de tela sem recarregar a página. */
export function Link({ para, ...props }) {
  const ir = useContext(Navegar);
  const clicar = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // abrir em nova aba continua funcionando
    e.preventDefault();
    ir(para);
  };
  return <a href={para} onClick={clicar} {...props} />;
}
