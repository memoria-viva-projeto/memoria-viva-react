import { useEffect, useRef } from "react";

const ler = (chave) => { try { return Number(localStorage.getItem(chave)) || null; } catch { return null; } };
const salvar = (chave, v) => { try { localStorage.setItem(chave, String(Math.round(v))); } catch { /* sem guardar: tudo bem */ } };

/**
 * Divisória para arrastar e mudar a largura de um painel à direita (só no computador; no celular o CSS a esconde).
 * - alvo: elemento que recebe a variável CSS com a largura (ex.: "--lado-dir")
 * - painel: o painel cuja borda esquerda segue o mouse
 * - min/max: limites em px (max pode ser uma função da largura do alvo)
 * - chave: onde a largura fica guardada neste navegador
 * Também funciona pelo teclado: setas mudam a largura; Home/End vão aos limites. Dois cliques voltam ao padrão.
 */
export default function Divisoria({ alvo, painel, variavel, min, max, chave, rotulo = "Ajustar a largura do painel" }) {
  const ref = useRef(null);
  const limite = () => {
    const el = alvo.current;
    const m = typeof max === "function" ? max(el ? el.getBoundingClientRect().width : 1200) : max;
    return [min, Math.max(min, m)];
  };
  const largura = () => painel.current?.getBoundingClientRect().width || min;
  const aplicar = (v, guardar) => {
    const [a, b] = limite();
    const w = Math.min(b, Math.max(a, v));
    alvo.current?.style.setProperty(variavel, `${w}px`);
    ref.current?.setAttribute("aria-valuenow", String(Math.round(w)));
    ref.current?.setAttribute("aria-valuemax", String(Math.round(b)));
    if (guardar) salvar(chave, w);
    return w;
  };

  // volta com a largura escolhida da última vez
  useEffect(() => {
    const v = ler(chave);
    if (v) aplicar(v, false);
    else ref.current?.setAttribute("aria-valuenow", String(Math.round(largura())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arrastar = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = painel.current;
    if (!el) return;
    // quanto a borda do painel anda para cada px de largura (1 se o layout encosta na direita; 0,5 se fica centralizado)
    const w0 = largura(), x0 = e.clientX, l0 = el.getBoundingClientRect().left;
    aplicar(w0 + 20, false);
    const passo = (l0 - el.getBoundingClientRect().left) / 20 || 1;
    aplicar(w0, false);

    const mover = (ev) => aplicar(w0 + (x0 - ev.clientX) / passo, false);
    const soltar = () => {
      salvar(chave, largura());
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerup", soltar);
      document.documentElement.classList.remove("arrastando");
    };
    document.documentElement.classList.add("arrastando");
    document.addEventListener("pointermove", mover);
    document.addEventListener("pointerup", soltar);
  };

  const tecla = (e) => {
    const [a, b] = limite();
    const passo = e.shiftKey ? 64 : 16;
    const w = largura();
    const novo = { ArrowLeft: w + passo, ArrowRight: w - passo, Home: b, End: a }[e.key];
    if (novo === undefined) return;
    e.preventDefault();
    aplicar(novo, true);
  };

  const padrao = () => {
    alvo.current?.style.removeProperty(variavel);
    try { localStorage.removeItem(chave); } catch { /* nada */ }
    requestAnimationFrame(() => ref.current?.setAttribute("aria-valuenow", String(Math.round(largura()))));
  };

  return (
    <div ref={ref} className="divisoria" role="separator" aria-orientation="vertical" aria-label={rotulo}
      aria-valuemin={min} tabIndex={0} title="Arraste para mudar a largura (dois cliques: volta ao padrão)"
      onPointerDown={arrastar} onKeyDown={tecla} onDoubleClick={padrao} />
  );
}
