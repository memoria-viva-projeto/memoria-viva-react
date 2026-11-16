import { useEffect, useRef, useState } from "react";
import Icone from "./Icone.jsx";
import Avatar from "./Avatar.jsx";
import { Miniatura } from "./midia.jsx";
import { BotaoArquivos } from "./arquivos.jsx";
import { Link, ROTAS } from "./rotas.jsx";
import { ehCheio, prepararFoto, tituloDe, urlDoArquivo } from "./guardados.js";
import { guardarPessoa, nomeDe, parentesco } from "./familia.js";

/** Fotos que dá para usar: as das memórias da demonstração e as fotos guardadas neste aparelho. */
function fotosDisponiveis(guardadas, memorias) {
  return [
    ...memorias.filter((m) => m.foto).map((m) => ({ chave: m.id, src: m.foto, titulo: m.titulo })),
    ...guardadas.flatMap((m) => m.itens.filter((it) => it.tipo === "foto").map((it) => ({ chave: it.arq, arq: it.arq, titulo: it.legenda || tituloDe(m) }))),
  ];
}

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Dar rosto às pessoas a partir de uma foto de grupo: a Maria escolhe a foto, aponta o rosto e diz de quem é.
 * Nada é associado sozinho. Se o navegador souber achar rostos (FaceDetector), eles aparecem só como sugestão.
 * O recorte vira a foto da pessoa (marcada como recorte aproximado) e pode ser desfeito aqui, ou trocado no perfil.
 */
export default function Rostos({ f, guardadas, memorias, onMudar }) {
  const [para, setPara] = useState(() => new URLSearchParams(window.location.search).get("para") || "");
  const [foto, setFoto] = useState(null); // { src, titulo, solta }
  const [alvo, setAlvo] = useState(null); // centro e raio do círculo: x, y de 0 a 1; r em fração da largura
  const [sugestoes, setSugestoes] = useState(null); // null: ainda não procurou; []: nenhuma
  const [feitos, setFeitos] = useState([]);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const img = useRef(null);
  const pessoas = f.pessoas.filter((p) => !p.removida);
  const fotos = fotosDisponiveis(guardadas, memorias);

  // endereço temporário de uma foto escolhida do aparelho (ou guardada): some quando troca ou sai
  useEffect(() => () => { if (foto?.solta) URL.revokeObjectURL(foto.src); }, [foto]);

  const abrir = (x) => { setAlvo(null); setSugestoes(null); setAviso(""); setFoto(x); };
  const abrirGuardada = async (x) => {
    const r = await urlDoArquivo(x.arq, false).catch(() => null);
    if (r) abrir({ src: r.url, titulo: x.titulo, solta: true });
    else setAviso("Não deu para abrir essa foto.");
  };
  const abrirDoAparelho = (fs) => fs[0] && abrir({ src: URL.createObjectURL(fs[0]), titulo: fs[0].name.replace(/\.[^.]+$/, ""), solta: true });

  // sugestões do navegador, quando ele sabe (só Chrome com o recurso ligado, por enquanto)
  const procurar = async () => {
    if (!("FaceDetector" in window)) { setSugestoes([]); return; }
    try {
      const el = img.current;
      const achados = await new window.FaceDetector({ fastMode: true, maxDetectedFaces: 20 }).detect(el);
      const W = el.naturalWidth, H = el.naturalHeight;
      setSugestoes(achados.map(({ boundingBox: b }) => ({ x: (b.x + b.width / 2) / W, y: (b.y + b.height / 2) / H, r: (Math.max(b.width, b.height) * 0.75) / W })));
    } catch { setSugestoes([]); }
  };

  const tocar = (e) => {
    const r = img.current.getBoundingClientRect();
    setAlvo((a) => ({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r: a?.r || 0.08 }));
  };
  const mover = (dx, dy) => setAlvo((a) => a && { ...a, x: limitar(a.x + dx, 0, 1), y: limitar(a.y + dy, 0, 1) });

  const usar = async () => {
    const pessoa = pessoas.find((p) => p.id === para);
    if (!pessoa || !alvo) return;
    setOcupado(true);
    try {
      const im = new Image();
      im.src = foto.src;
      await im.decode();
      const W = im.naturalWidth, H = im.naturalHeight, r = alvo.r * W;
      const cv = document.createElement("canvas");
      cv.width = cv.height = 480;
      cv.getContext("2d").drawImage(im, alvo.x * W - r, alvo.y * H - r, 2 * r, 2 * r, 0, 0, 480, 480);
      const blob = await new Promise((ok) => cv.toBlob(ok, "image/jpeg", 0.88));
      const a = await prepararFoto(new File([blob], "rosto.jpg", { type: "image/jpeg" }));
      const antes = { fotoArq: pessoa.fotoArq || null, fotoRecorte: pessoa.fotoRecorte || null };
      onMudar(guardarPessoa(f, { ...pessoa, fotoArq: a.id, fotoRecorte: { origem: foto.titulo } }), `Pronto: ${nomeDe(f, pessoa.id)} ganhou um rosto.`);
      setFeitos((fs) => [{ id: pessoa.id, antes }, ...fs.filter((x) => x.id !== pessoa.id)]);
      setAlvo(null);
      setPara("");
    } catch (e) {
      setAviso(ehCheio(e) ? "Não há mais espaço neste aparelho." : "Não deu para recortar essa foto. Tente outra.");
    } finally { setOcupado(false); }
  };
  const desfazer = (x) => {
    const pessoa = f.pessoas.find((p) => p.id === x.id);
    onMudar(guardarPessoa(f, { ...pessoa, ...x.antes }), `${nomeDe(f, x.id)} voltou à foto de antes.`);
    setFeitos((fs) => fs.filter((y) => y !== x));
  };

  const quem = pessoas.find((p) => p.id === para);
  return (
    <div className="c-wrap fm rs">
      <Link className="btn-l hs-voltar" para={ROTAS.familia}><Icone nome="voltar" />Família</Link>
      <header>
        <p className="mao fm-mao">um rosto para cada nome</p>
        <h1 className="fm-titulo" tabIndex={-1}>Rostos de uma foto de grupo</h1>
        <p className="ed-dica-grande">Escolha uma foto em que a família aparece junta, toque no rosto de alguém e diga quem é. O recorte é aproximado e só vale depois que você confirma.</p>
      </header>

      {!foto ? (
        <section aria-labelledby="rs-f-t" className="rs-fotos">
          <h2 id="rs-f-t" className="c-h2">De qual foto?</h2>
          <ul className="rs-grade">
            {fotos.map((x) => (
              <li key={x.chave}>
                <button type="button" className="rs-opcao" onClick={() => (x.src ? abrir(x) : abrirGuardada(x))}>
                  <span className="foto rs-opcao-foto">{x.src ? <span className="mi"><img src={x.src} alt="" loading="lazy" /></span> : <Miniatura arq={x.arq} />}</span>
                  <span>{x.titulo}</span>
                </button>
              </li>
            ))}
          </ul>
          <BotaoArquivos rotulo="Usar outra foto do aparelho" onArquivos={abrirDoAparelho} />
        </section>
      ) : (
        <section aria-labelledby="rs-r-t" className="rs-recorte">
          <div className="fm-tit">
            <h2 id="rs-r-t" className="c-h2">{foto.titulo}</h2>
            <button type="button" className="btn-l" onClick={() => setFoto(null)}><Icone nome="trocar" />Escolher outra foto</button>
          </div>
          <p className="ed-dica" role="status">
            {sugestoes?.length
              ? `O navegador sugeriu ${sugestoes.length} ${sugestoes.length === 1 ? "rosto" : "rostos"} (contornos tracejados). Confira: só vale o que você escolher.`
              : "Toque no rosto de alguém na foto."}
          </p>
          <div className="rs-quadro">
            {/* tocar na foto põe o círculo ali; as setas e o tamanho, logo abaixo, ajustam sem precisar tocar */}
            <img ref={img} src={foto.src} alt={`Foto: ${foto.titulo}`} onLoad={procurar} onClick={tocar} />
            {sugestoes?.map((s, k) => (
              <button key={k} type="button" className="rs-sug" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.r * 200}%` }} onClick={() => setAlvo(s)}>
                <span className="sr">Usar a sugestão {k + 1}</span>
              </button>
            ))}
            {alvo && <span className="rs-alvo" style={{ left: `${alvo.x * 100}%`, top: `${alvo.y * 100}%`, width: `${alvo.r * 200}%` }} aria-hidden="true" />}
          </div>

          <div className="rs-ajuste">
            {!alvo && <button type="button" className="btn btn-s btn-sm" onClick={() => setAlvo({ x: 0.5, y: 0.4, r: 0.08 })}><Icone nome="selecionar" />Pôr o círculo no meio</button>}
            {alvo && (
              <>
                <div className="ed-campo rs-tam">
                  <label htmlFor="rs-tam">Tamanho do círculo</label>
                  <input id="rs-tam" type="range" min="3" max="30" value={Math.round(alvo.r * 100)} onChange={(e) => setAlvo({ ...alvo, r: e.target.value / 100 })} />
                </div>
                <div className="rs-setas" role="group" aria-label="Mover o círculo">
                  <button type="button" className="rl-bt" onClick={() => mover(-0.01, 0)}><Icone nome="voltar" /><span className="sr">Para a esquerda</span></button>
                  <button type="button" className="rl-bt rs-cima" onClick={() => mover(0, -0.01)}><Icone nome="seguir" /><span className="sr">Para cima</span></button>
                  <button type="button" className="rl-bt rs-baixo" onClick={() => mover(0, 0.01)}><Icone nome="seguir" /><span className="sr">Para baixo</span></button>
                  <button type="button" className="rl-bt" onClick={() => mover(0.01, 0)}><Icone nome="seguir" /><span className="sr">Para a direita</span></button>
                </div>
                <div className="ed-campo">
                  <label htmlFor="rs-quem">De quem é este rosto?</label>
                  <select id="rs-quem" value={para} onChange={(e) => setPara(e.target.value)}>
                    <option value="">Escolha a pessoa</option>
                    {pessoas.map((p) => <option key={p.id} value={p.id}>{nomeDe(f, p.id)} ({parentesco(f, p.id)}){p.fotoArq || p.foto ? " · já tem foto" : ""}</option>)}
                  </select>
                </div>
                <button type="button" className="btn btn-p" disabled={!quem || ocupado} onClick={usar}>
                  <Icone nome="certo" />{quem ? `Usar como foto de ${nomeDe(f, quem.id)}` : "Usar este rosto"}
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {aviso && <p className="ed-erro" role="alert">{aviso}</p>}

      {feitos.length > 0 && (
        <section aria-labelledby="rs-ok-t" className="rs-feitos">
          <h2 id="rs-ok-t" className="mv-h2">Rostos colocados agora</h2>
          <ul>
            {feitos.map((x) => (
              <li key={x.id}>
                <Avatar id={x.id} tam={52} />
                <span><b>{nomeDe(f, x.id)}</b><span>{parentesco(f, x.id)}</span></span>
                <button type="button" className="btn-l" onClick={() => desfazer(x)}><Icone nome="voltar" />Desfazer</button>
              </li>
            ))}
          </ul>
          <p className="ed-dica">Dá para trocar ou tirar a foto depois, no perfil de cada pessoa (Editar → Foto e datas).</p>
        </section>
      )}
    </div>
  );
}
