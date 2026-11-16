import { useState } from "react";
import Icone from "./Icone.jsx";
import Adesivo from "../Adesivo.jsx";

export default function CriarConta({ onConcluir, onUsarDemo }) {
    const [etapa, setEtapa] = useState(1);
    const [modo, setModo] = useState("criar"); // "criar" (novo álbum) | "convite" (código da família)
    const [dados, setDados] = useState({
        nome: "",
        nomeCompleto: "",
        nascimento: "",
        cidadeNatal: "",
        genero: "f",
        codigoConvite: "",
    });

    const atualizar = (campo, valor) =>
        setDados((prev) => ({ ...prev, [campo]: valor }));

    const finalizar = (e) => {
        e.preventDefault();
        if (!dados.nome.trim()) return;

        const idUsuario =
            dados.nome
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, "-") +
            "-" +
            Math.floor(100 + Math.random() * 900);

        const codigoFamilia =
            modo === "convite" && dados.codigoConvite.trim()
                ? dados.codigoConvite.trim().toUpperCase()
                : "MV-" + Math.floor(1000 + Math.random() * 9000);

        const novoPerfil = {
            id: idUsuario,
            nome: dados.nome.trim(),
            nomeCompleto: (dados.nomeCompleto || dados.nome).trim(),
            nascimento: dados.nascimento,
            cidadeNatal: dados.cidadeNatal.trim(),
            cidadeAtual: dados.cidadeNatal.trim(),
            profissao: "",
            genero: dados.genero,
            bio: "",
            foto: "/img/avatar-padrao.jpg",
            capa: "ladrilho",
            interesses: [],
            outrosGostos: [],
            favoritos: {},
            demonstracao: false,
            codigoFamilia,
        };

        const novaFamilia = {
            pessoas: [
                {
                    id: idUsuario,
                    nome: dados.nome.trim(),
                    nomeCompleto: (dados.nomeCompleto || dados.nome).trim(),
                    nascimento: dados.nascimento,
                    categoria: "familia",
                    relacao: "eu",
                    eu: true,
                },
            ],
            lacos: [],
        };

        onConcluir({ perfil: novoPerfil, familia: novaFamilia, modo });
    };

    return (
        <div className="c-wrap cc-tela">
            <header className="cc-cab">
                <span className="mao cc-mao">bem-vindo ao Memória Viva</span>
                <h1 className="cc-titulo" tabIndex={-1}>
                    Vamos montar o seu álbum <Adesivo nome="casinha_colorida" className="junto" />
                </h1>
                <p className="cc-sub">Etapa {etapa} de 3 · sem pressa, tudo fica guardado neste aparelho.</p>
            </header>

            <ol className="cc-passos" aria-label="Progresso do cadastro">
                <li className={etapa >= 1 ? "on" : ""}>1. Como começar</li>
                <li className={etapa >= 2 ? "on" : ""}>2. Sobre você</li>
                <li className={etapa >= 3 ? "on" : ""}>3. Suas raízes</li>
            </ol>

            <form className="cc-card" onSubmit={finalizar}>
                {etapa === 1 && (
                    <div className="cc-bloco">
                        <h2>Como você quer entrar?</h2>
                        <div className="cc-opcoes">
                            <button
                                type="button"
                                className={`cc-opcao${modo === "criar" ? " on" : ""}`}
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
                                <span>Código da família (ex: MV-4821)</span>
                                <input
                                    type="text"
                                    placeholder="MV-0000"
                                    value={dados.codigoConvite}
                                    onChange={(e) => atualizar("codigoConvite", e.target.value)}
                                    required
                                />
                            </label>
                        )}

                        <div className="cc-acoes">
                            <button type="button" className="btn btn-p" onClick={() => setEtapa(2)}>
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {etapa === 2 && (
                    <div className="cc-bloco">
                        <h2>Como a família chama você?</h2>
                        <label className="cc-campo">
                            <span>Nome ou apelido carinhoso *</span>
                            <input
                                type="text"
                                placeholder="Ex: Dona Ana, Seu João, Tia Lúcia..."
                                value={dados.nome}
                                onChange={(e) => atualizar("nome", e.target.value)}
                                required
                                autoFocus
                            />
                        </label>

                        <label className="cc-campo">
                            <span>Nome completo (opcional)</span>
                            <input
                                type="text"
                                placeholder="Como aparece nos documentos"
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
                                    onClick={() => atualizar("genero", "f")}
                                >
                                    Mãe, avó, tia
                                </button>
                                <button
                                    type="button"
                                    className={`qd-modo${dados.genero === "m" ? " on" : ""}`}
                                    onClick={() => atualizar("genero", "m")}
                                >
                                    Pai, avô, tio
                                </button>
                            </div>
                        </fieldset>

                        <div className="cc-acoes">
                            <button type="button" className="btn-l" onClick={() => setEtapa(1)}>
                                Voltar
                            </button>
                            <button
                                type="button"
                                className="btn btn-p"
                                disabled={!dados.nome.trim()}
                                onClick={() => setEtapa(3)}
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {etapa === 3 && (
                    <div className="cc-bloco">
                        <h2>Suas raízes na árvore</h2>
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
                                value={dados.cidadeNatal}
                                onChange={(e) => atualizar("cidadeNatal", e.target.value)}
                            />
                        </label>

                        <div className="cc-acoes">
                            <button type="button" className="btn-l" onClick={() => setEtapa(2)}>
                                Voltar
                            </button>
                            <button type="submit" className="btn btn-p">
                                <Icone nome="certo" /> Criar meu álbum
                            </button>
                        </div>
                    </div>
                )}
            </form>

            <footer className="cc-demo">
                <p>Quer só explorar primeiro?</p>
                <button type="button" className="btn-l" onClick={onUsarDemo}>
                    Entrar na conta de demonstração da Maria
                </button>
            </footer>
        </div>
    );
}