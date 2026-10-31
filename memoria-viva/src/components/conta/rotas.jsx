import { createContext, useContext } from "react";

// Telas de dentro da conta. A troca é feita sem recarregar (o que a Maria confirmou continua lá).
export const ROTAS = { inicio: "/conta", historia: "/conta/historia", perfil: "/conta/perfil", editar: "/conta/perfil/editar" };

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
