import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "../../conta.css";
import FaixaAzulejos from "../FaixaAzulejos.jsx";
import { PARES_URUCUM_ANIL } from "../../azulejaria.js";
import Icone from "./Icone.jsx";
import { api } from "../../api.js";
import { aplicarAjustes, lerAjustes } from "./efeitos.js";
import { nascimentoParaServidor } from "./perfilServidor.js";
import { carregarCatalogo, pessoasTexto, preco } from "./planos.js";
import "../../planos.css";

/**
 * Criar conta (/cadastro), em 4 etapas: como começar (álbum novo ou código de convite), sobre você,
 * suas raízes e o acesso (e-mail, senha e nome do acervo). A conta é criada no servidor; o que a pessoa
 * contou nas etapas 2 e 3 vai para o perfil dela (e para a pessoa dela na família que convidou).
 * A senha fica só na memória da página (nunca na URL nem no navegador).
 */
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // a mesma regra do servidor
const REGRAS_SENHA = [
    { id: "tam", texto: "pelo menos 8 caracteres", ok: (s) => s.length >= 8 },
    { id: "letra", texto: "pelo menos uma letra", ok: (s) => /\p{L}/u.test(s) },
    { id: "num", texto: "pelo menos um número", ok: (s) => /\d/.test(s) },
];
// as 5 etapas: o nome aparece no progresso; a frase, na arte ao lado (só no computador)
const ETAPAS = [
    ["Como começar", "Sua história, contada por você."],
    ["Sobre você", "Cada apelido carrega uma lembrança."],
    ["Suas raízes", "As raízes vêm antes dos galhos."],
    ["Seu plano", "Comece grátis. Cresça quando a família chegar."],
    ["Seu acesso", "Quase lá: só falta o seu acesso."],
];
// em qual etapa fica cada campo (para voltar à etapa certa quando o servidor apontar um erro)
const ETAPA_DO_CAMPO = { codigo: 1, nome: 2, idPlano: 4, ciclo: 4, email: 5, senha: 5, familia: 5 };

/** Progresso de verdade (não parece botão): "Etapa 2 de 5 · Sobre você" e uma barra em partes. */
function Progresso({ etapa }) {
    return (
        <div className="cc-prog">
            <p className="cc-prog-t"><b>Etapa {etapa} de {ETAPAS.length}</b> · {ETAPAS[etapa - 1][0]}</p>
            <ol className="cc-prog-barra" aria-label="Progresso do cadastro">
                {ETAPAS.map(([nome], i) => {
                    const n = i + 1;
                    return (
                        <li key={nome} className={n < etapa ? "feita" : n === etapa ? "atual" : undefined} aria-current={n === etapa ? "step" : undefined}>
                            <span className="sr">{nome}{n < etapa ? " (feita)" : ""}</span>
                        </li>
                    );
                })}
            </ol>
            <p className="cc-prog-dica">Sem pressa: dá para voltar e mudar.</p>
        </div>
    );
}

function conferirAcesso(d) {
    const e = {};
    if (!d.email.trim()) e.email = "Escreva seu e-mail.";
    else if (!EMAIL_OK.test(d.email.trim())) e.email = "Confira o e-mail: falta o @ ou o domínio (ex.: voce@email.com).";
    const faltam = REGRAS_SENHA.filter((r) => !r.ok(d.senha)).map((r) => r.texto);
    if (!d.senha) e.senha = "Crie uma senha.";
    else if (faltam.length) e.senha = `A senha precisa de ${faltam.join(" e ")}.`;
    if (!d.familia.trim()) e.familia = "Dê um nome para o seu acervo.";
    return e;
}

// e-mail e nome da família podem chegar do formulário da página inicial
function valoresIniciais() {
    const q = new URLSearchParams(window.location.search);
    return {
        nome: "",
        nomeCompleto: "",
        nascimento: "",
        cidadeNatal: "",
        genero: "f",
        codigoConvite: "",
        email: q.get("email") || "",
        senha: "",
        familia: (q.get("familia") || "").slice(0, 40),
    };
}

export default function CriarConta() {
    const [etapa, setEtapa] = useState(1);
    const [modo, setModo] = useState("criar"); // "criar" (novo álbum) | "convite" (código da família)
    const [dados, setDados] = useState(valoresIniciais);
    const [familiaConvite, setFamiliaConvite] = useState(null); // nome da família do código, depois de conferido
    const [erros, setErros] = useState({});
    const [erroGeral, setErroGeral] = useState("");
    const [verSenha, setVerSenha] = useState(false);
    const [enviando, setEnviando] = useState(false);
    // plano escolhido no cadastro (simulação: nada é cobrado). Começa no Grátis.
    const [planos, setPlanos] = useState(null);
    const [idPlano, setIdPlano] = useState(null);
    const [ciclo, setCiclo] = useState("mensal");
    const titulo = useRef(null);
    const primeiraVez = useRef(true);

    useEffect(() => {
        let vale = true;
        carregarCatalogo().then((cat) => {
            if (!vale) return;
            setPlanos(cat);
            setIdPlano((atual) => atual ?? cat.find((p) => p.gratis)?.id ?? cat[0]?.id);
        });
        return () => { vale = false; };
    }, []);
    const escolhido = planos?.find((p) => p.id === idPlano);

    useLayoutEffect(() => {
        const html = document.documentElement;
        html.classList.add("pg-conta");
        aplicarAjustes({ ...lerAjustes(), tema: "claro" }); // como a entrada, sempre claro
        document.title = "Criar conta · Memória Viva";
        if (window.location.search) window.history.replaceState(null, "", "/cadastro"); // tira o e-mail da barra
        return () => html.classList.remove("pg-conta");
    }, []);

    // a cada etapa, o leitor de tela começa pelo título dela
    useEffect(() => {
        if (primeiraVez.current) { primeiraVez.current = false; return; }
        titulo.current?.focus();
    }, [etapa]);

    const atualizar = (campo, valor) => {
        setDados((prev) => ({ ...prev, [campo]: valor }));
        if (erros[campo]) setErros(({ [campo]: _, ...resto }) => resto);
        if (campo === "codigoConvite") setFamiliaConvite(null);
    };

    const irPara = (n) => { setErroGeral(""); setEtapa(n); };

    // etapa 1 → 2: com convite, confere o código antes de seguir
    const continuarDoInicio = async () => {
        if (modo === "criar") return irPara(2);
        if (!dados.codigoConvite.trim()) return setErros({ codigo: "Escreva o código que você recebeu." });
        if (familiaConvite) return irPara(2);
        setEnviando(true);
        try {
            const r = await api("/convites/conferir", { corpo: { codigo: dados.codigoConvite } });
            setFamiliaConvite(r.familia.nome);
            irPara(2);
        } catch (falha) {
            setErros({ codigo: falha.campos?.codigo || falha.message });
        } finally {
            setEnviando(false);
        }
    };

    const finalizar = async (e) => {
        e.preventDefault();
        if (enviando) return;
        setErroGeral("");
        const achados = conferirAcesso(dados);
        setErros(achados);
        if (Object.keys(achados).length) return;

        setEnviando(true);
        try {
            const conta = await api("/auth/cadastro", {
                corpo: {
                    nome: (dados.nomeCompleto || dados.nome).trim(),
                    email: dados.email,
                    senha: dados.senha,
                    familia: dados.familia,
                    ...(modo === "convite" ? { codigo: dados.codigoConvite } : {}),
                    ...(escolhido ? { idPlano: escolhido.id, ...(escolhido.gratis ? {} : { ciclo }) } : {}),
                },
            });
            setDados((d) => ({ ...d, senha: "" })); // a conta existe: a senha sai da memória da página
            // o que ela contou nas etapas 2 e 3 vai para a pessoa dela em cada família (o acervo dela e a de quem convidou)
            const perfil = {
                nome: dados.nome.trim(),
                genero: dados.genero,
                cidadeNatal: dados.cidadeNatal.trim(),
                nascimento: nascimentoParaServidor(dados.nascimento),
                ...(dados.nomeCompleto.trim() ? { nomeCompleto: dados.nomeCompleto.trim() } : {}),
            };
            // se falhar, a conta já existe e o perfil dá para completar depois: segue do mesmo jeito
            await Promise.allSettled(conta.familias.map((f) => api(`/pessoas/${f.idPessoa}`, { metodo: "PATCH", corpo: perfil })));
            window.location.href = "/conta";
        } catch (falha) {
            const porCampo = falha.campos || {};
            const campo = Object.keys(ETAPA_DO_CAMPO).find((c) => porCampo[c]);
            setErros(porCampo);
            if (campo) {
                if (campo === "codigo") setFamiliaConvite(null);
                setEtapa(ETAPA_DO_CAMPO[campo]);
            } else setErroGeral(falha.message);
            setEnviando(false);
        }
    };

    // liga o campo ao erro dele (leitores de tela leem o erro junto)
    const ligarErro = (campo, ...extra) => ({
        "aria-invalid": erros[campo] ? "true" : undefined,
        "aria-describedby": [...extra, erros[campo] && `cc-${campo}-erro`].filter(Boolean).join(" ") || undefined,
    });
    const erro = (campo) => erros[campo] && <p className="ed-erro" id={`cc-${campo}-erro`}>{erros[campo]}</p>;

    return (
        <div className="conta entrar cc">
            <FaixaAzulejos semente="nova conta" tamanho={22} girar={false} pares={PARES_URUCUM_ANIL} />
            {/* o mesmo layout da entrada: arte à esquerda (computador) e o painel à direita */}
            <div className="en-grade">
                <aside className="en-arte" aria-hidden="true">
                    <FaixaAzulejos semente="nova conta arte" tamanho={80} girar={false} pares={PARES_URUCUM_ANIL} className="en-azulejos" />
                    <div className="en-fotos">
                        <div className="foto leg en-f1">
                            <span className="tape t-turq" style={{ left: "50%", top: -13, transform: "translateX(-50%) rotate(-3deg)" }} />
                            <img src="/img/maria/1957-casamento.jpg" alt="" />
                            <span className="lg">o dia do sim</span>
                        </div>
                        <div className="foto cant en-f2">
                            <span className="tape t-uru" style={{ left: "50%", top: -13, transform: "translateX(-50%) rotate(4deg)" }} />
                            <img src="/img/maria/2010-cozinha.jpg" alt="" />
                        </div>
                    </div>
                    <p className="en-frase">{ETAPAS[etapa - 1][1]}</p>
                </aside>

                <main className="en-painel cc-painel">
                <header className="cc-cab">
                    <a className="en-logo" href="/" aria-label="Memória Viva, voltar para o site">
                        <img className="marca-clara" src="/marca/logo.svg" width="600" height="307" alt="" />
                        <img className="marca-escura" src="/marca/logo-fundo-escuro.svg" width="600" height="307" alt="" />
                    </a>
                    <span className="mao cc-mao">bem-vindo ao Memória Viva</span>
                    <h1 className="cc-titulo">Vamos montar o seu álbum</h1>
                    <Progresso etapa={etapa} />
                </header>

                <form className="cc-card" onSubmit={finalizar} noValidate aria-busy={enviando || undefined}>
                    {etapa === 1 && (
                        <div className="cc-bloco">
                            <h2 tabIndex={-1} ref={titulo}>Como você quer entrar?</h2>
                            <div className="cc-opcoes">
                                <button
                                    type="button"
                                    className={`cc-opcao${modo === "criar" ? " on" : ""}`}
                                    aria-pressed={modo === "criar"}
                                    onClick={() => setModo("criar")}
                                >
                                    <Icone nome="album" tam={26} />
                                    <span>
                                        <b>Criar um novo álbum de família</b>
                                        <span>Vou começar a guardar minhas histórias e convidar parentes</span>
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className={`cc-opcao${modo === "convite" ? " on" : ""}`}
                                    aria-pressed={modo === "convite"}
                                    onClick={() => setModo("convite")}
                                >
                                    <Icone nome="familia" tam={26} />
                                    <span>
                                        <b>Entrar com código de convite</b>
                                        <span>Alguém da minha família já começou um álbum</span>
                                    </span>
                                </button>
                            </div>

                            {modo === "convite" && (
                                <label className="cc-campo">
                                    <span>Código da família (ex.: MV-7K3P-Q9XD)</span>
                                    <input
                                        type="text"
                                        placeholder="MV-0000-0000"
                                        autoComplete="off"
                                        autoCapitalize="characters"
                                        spellCheck={false}
                                        maxLength={40}
                                        value={dados.codigoConvite}
                                        onChange={(e) => atualizar("codigoConvite", e.target.value)}
                                        {...ligarErro("codigo")}
                                    />
                                    {erro("codigo")}
                                </label>
                            )}

                            <div className="cc-acoes">
                                <button type="button" className="btn btn-p" disabled={enviando} onClick={continuarDoInicio}>
                                    {enviando ? "Conferindo…" : "Continuar"}
                                </button>
                            </div>
                        </div>
                    )}

                    {etapa === 2 && (
                        <div className="cc-bloco">
                            <h2 tabIndex={-1} ref={titulo}>Como a família chama você?</h2>
                            {familiaConvite && (
                                <p className="cc-dica"><Icone nome="certo" tam={18} /> Você vai entrar na <b>{familiaConvite}</b>.</p>
                            )}
                            <label className="cc-campo">
                                <span>Nome ou apelido carinhoso *</span>
                                <input
                                    type="text"
                                    placeholder="Ex: Dona Ana, Seu João, Tia Lúcia..."
                                    maxLength={80}
                                    value={dados.nome}
                                    onChange={(e) => atualizar("nome", e.target.value)}
                                    required
                                    {...ligarErro("nome")}
                                />
                                {erro("nome")}
                            </label>

                            <label className="cc-campo">
                                <span>Nome completo (opcional)</span>
                                <input
                                    type="text"
                                    placeholder="Como aparece nos documentos"
                                    maxLength={120}
                                    value={dados.nomeCompleto}
                                    onChange={(e) => atualizar("nomeCompleto", e.target.value)}
                                />
                            </label>

                            <fieldset className="cc-genero">
                                <legend>Como escrever seus parentescos na árvore?</legend>
                                <div className="cc-genero-opcoes">
                                    <button
                                        type="button"
                                        className={`qd-modo${dados.genero === "f" ? " on" : ""}`}
                                        aria-pressed={dados.genero === "f"}
                                        onClick={() => atualizar("genero", "f")}
                                    >
                                        Mãe, avó, tia
                                    </button>
                                    <button
                                        type="button"
                                        className={`qd-modo${dados.genero === "m" ? " on" : ""}`}
                                        aria-pressed={dados.genero === "m"}
                                        onClick={() => atualizar("genero", "m")}
                                    >
                                        Pai, avô, tio
                                    </button>
                                </div>
                            </fieldset>

                            <div className="cc-acoes">
                                <button type="button" className="btn-l" onClick={() => irPara(1)}>
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-p"
                                    disabled={!dados.nome.trim()}
                                    onClick={() => irPara(3)}
                                >
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {etapa === 3 && (
                        <div className="cc-bloco">
                            <h2 tabIndex={-1} ref={titulo}>Suas raízes na árvore</h2>
                            <p className="cc-dica">
                                Esses dados já criam o seu primeiro retrato na árvore genealógica.
                            </p>

                            <label className="cc-campo">
                                <span>Data de nascimento</span>
                                <input
                                    type="date"
                                    value={dados.nascimento}
                                    onChange={(e) => atualizar("nascimento", e.target.value)}
                                />
                            </label>

                            <label className="cc-campo">
                                <span>Cidade onde nasceu ou cresceu</span>
                                <input
                                    type="text"
                                    placeholder="Ex: Campinas, SP"
                                    maxLength={120}
                                    value={dados.cidadeNatal}
                                    onChange={(e) => atualizar("cidadeNatal", e.target.value)}
                                />
                            </label>

                            <div className="cc-acoes">
                                <button type="button" className="btn-l" onClick={() => irPara(2)}>
                                    Voltar
                                </button>
                                <button type="button" className="btn btn-p" onClick={() => irPara(4)}>
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {etapa === 4 && (
                        <div className="cc-bloco">
                            <h2 tabIndex={-1} ref={titulo}>Escolha o seu plano</h2>
                            <p className="cc-dica">
                                Comece no Grátis ou escolha outro. É uma simulação: nada é cobrado, e dá para mudar depois na aba Planos.
                            </p>

                            {escolhido && !escolhido.gratis && escolhido.valorAnual != null && (
                                <fieldset className="pl-ciclo cc-ciclo">
                                    <legend>Cobrança</legend>
                                    {[["mensal", "Mensal"], ["anual", "Anual (cerca de 2 meses grátis)"]].map(([c, t]) => (
                                        <label key={c} className={`aj-op${ciclo === c ? " on" : ""}`}>
                                            <input type="radio" name="cc-ciclo" value={c} checked={ciclo === c} onChange={() => setCiclo(c)} />
                                            <span>{t}</span>
                                        </label>
                                    ))}
                                </fieldset>
                            )}

                            {!planos ? <p role="status">Carregando os planos…</p> : (
                                <fieldset className="pl-escolha">
                                    <legend className="sr">Planos</legend>
                                    <div className="pl-opcoes">
                                        {planos.map((p) => {
                                            const pr = preco(p, ciclo);
                                            return (
                                                <label key={p.id} className={`pl-op${idPlano === p.id ? " on" : ""}`}>
                                                    <input type="radio" name="cc-plano" value={p.id} checked={idPlano === p.id} onChange={() => setIdPlano(p.id)} />
                                                    <span className="pl-op-topo">
                                                        <span className="pl-op-nome">{p.nome}</span>
                                                        <span className="pl-op-preco">{p.gratis ? "R$ 0" : pr.valor}<small>{p.gratis ? " para sempre" : ` ${pr.rotulo}`}</small></span>
                                                    </span>
                                                    <span className="pl-op-det">{p.espacoGb} GB de espaço · {pessoasTexto(p)}</span>
                                                    <span className={`pl-op-fam${p.feedFamilia ? " sim" : ""}`}>
                                                        <Icone nome={p.feedFamilia ? "certo" : "cadeado"} tam={18} />
                                                        {p.feedFamilia ? "Convidar a família e feed com comentários" : "Sem convites nem feed da família"}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {erro("idPlano")}
                                    {erro("ciclo")}
                                </fieldset>
                            )}

                            <div className="cc-acoes">
                                <button type="button" className="btn-l" onClick={() => irPara(3)}>
                                    Voltar
                                </button>
                                <button type="button" className="btn btn-p" disabled={!escolhido} onClick={() => irPara(5)}>
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {etapa === 5 && (
                        <div className="cc-bloco">
                            <h2 tabIndex={-1} ref={titulo}>Seu acesso</h2>
                            {escolhido && (
                                <p className="cc-resumo-plano">
                                    <Icone nome="estrela" tam={20} />
                                    <span>Plano <b>{escolhido.nome}</b>{!escolhido.gratis && ` · ${ciclo === "anual" ? "anual" : "mensal"}`}</span>
                                    <button type="button" className="btn-l" onClick={() => irPara(4)}>Mudar</button>
                                </p>
                            )}
                            <p className="cd-aviso">
                                <Icone nome="ajuda" />
                                <span>Sua senha é guardada de forma protegida e nunca fica salva neste navegador.</span>
                            </p>

                            <label className="cc-campo">
                                <span>E-mail</span>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    spellCheck={false}
                                    placeholder="voce@email.com"
                                    maxLength={180}
                                    value={dados.email}
                                    onChange={(e) => atualizar("email", e.target.value)}
                                    {...ligarErro("email")}
                                />
                                {erro("email")}
                            </label>

                            <div className="cc-campo">
                                <label htmlFor="cc-senha">Senha</label>
                                <div className="cd-senha">
                                    <input
                                        id="cc-senha"
                                        type={verSenha ? "text" : "password"}
                                        autoComplete="new-password"
                                        maxLength={200}
                                        value={dados.senha}
                                        onChange={(e) => atualizar("senha", e.target.value)}
                                        {...ligarErro("senha", "cc-senha-regras")}
                                    />
                                    <button type="button" className="btn btn-s btn-sm" aria-controls="cc-senha" onClick={() => setVerSenha((x) => !x)}>
                                        <Icone nome="ver" tam={20} />{verSenha ? "Ocultar senha" : "Mostrar senha"}
                                    </button>
                                </div>
                                <div id="cc-senha-regras" className="cd-regras">
                                    <p className="ed-dica">A senha precisa ter:</p>
                                    <ul>
                                        {REGRAS_SENHA.map((r) => {
                                            const ok = r.ok(dados.senha);
                                            return (
                                                <li key={r.id} className={ok ? "ok" : undefined}>
                                                    {ok ? <Icone nome="certo" tam={18} /> : <span className="cd-ponto" />}
                                                    {r.texto}{ok && <span className="sr"> (feito)</span>}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                {erro("senha")}
                            </div>

                            <label className="cc-campo">
                                <span>{modo === "convite" ? "Nome do seu acervo" : "Nome da família"}</span>
                                <input
                                    type="text"
                                    autoComplete="off"
                                    maxLength={40}
                                    placeholder="Ex.: Família de Helena"
                                    value={dados.familia}
                                    onChange={(e) => atualizar("familia", e.target.value)}
                                    {...ligarErro("familia", "cc-familia-dica")}
                                />
                                <span className="ed-dica" id="cc-familia-dica">
                                    {modo === "convite" && familiaConvite
                                        ? `Além de entrar na ${familiaConvite}, você ganha um acervo só seu. Esse nome desenha os azulejos da capa dele.`
                                        : "Esse nome desenha os azulejos da capa do seu acervo."}
                                </span>
                                {erro("familia")}
                            </label>

                            {erroGeral && <p className="ed-erro" role="alert">{erroGeral}</p>}

                            <div className="cc-acoes">
                                <button type="button" className="btn-l" onClick={() => irPara(4)}>
                                    Voltar
                                </button>
                                <button type="submit" className="btn btn-p" disabled={enviando}>
                                    <Icone nome="certo" /> {enviando ? "Criando…" : "Criar meu álbum"}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <footer className="cc-demo">
                    <p>Já tenho uma conta — <a className="btn-l" href="/entrar">Entrar</a></p>
                    <p>Quer só explorar primeiro?</p>
                    <a className="btn-l" href="/conta">
                        Entrar na conta de demonstração da Maria
                    </a>
                </footer>
                </main>
            </div>
        </div>
    );
}
