import FaixaAzulejos from "./FaixaAzulejos.jsx";

// Projeto acadêmico: e-mail e redes abaixo são de demonstração (fictícios). Troque pelos reais se um dia existirem.
const CONTATO = {
  email: "contato@memoriaviva.exemplo",
  redes: [
    ["instagram", "Instagram", "@memoriaviva"],
    ["youtube", "YouTube", "Memória Viva"],
    ["linkedin", "LinkedIn", "Memória Viva"],
  ],
};

const ICONES = {
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5L12 13l8.5-6.5" /></>,
  instagram: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" /></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" /></>,
  linkedin: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.8v.2M11.5 16v-3.2a2.2 2.2 0 014.4 0V16M11.5 10.5V16" /></>,
  escola: <><path d="M2.5 9.5L12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c3 2 8 2 11 0v-4.5" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.2" /></>,
};
const Ic = ({ nome }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONES[nome]}</svg>
);

export default function Rodape() {
  return (
    <footer className="rod">
      <FaixaAzulejos semente="rodape" tamanho={32} />
      <div className="wrap rod-grade">
        <div className="rod-marca">
          <p className="rod-sobre">
            Guardar as fotos, receitas, músicas e causos da família — e conversar sobre eles.
            A IA ajuda a organizar; a família confirma o que é verdade.
          </p>
          <p className="mao rod-frase">
            conta pra mim.
          </p>
        </div>

        <div className="rod-col">
          <h2>Sobre o projeto</h2>
          <ul className="rod-lista">
            <li><Ic nome="escola" /><span>Projeto acadêmico, desenvolvido como trabalho de curso.</span></li>
            <li><Ic nome="info" /><span>Site de demonstração: as famílias, pessoas e histórias são fictícias.</span></li>
          </ul>
        </div>

        <div className="rod-col">
          <h2>Fale com a gente</h2>
          <ul className="rod-lista">
            <li><Ic nome="email" /><a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a></li>
            {CONTATO.redes.map(([ic, nome, perfil]) => (
              <li key={ic}><Ic nome={ic} /><a href="#" onClick={(e) => e.preventDefault()} aria-label={`${nome}: ${perfil} (demonstração)`}>{nome} · {perfil}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="wrap rod-base">
        <p>© {new Date().getFullYear()} Memória Viva · projeto acadêmico sem fins comerciais.</p>
        <p>Contatos e redes de demonstração.</p>
      </div>
    </footer>
  );
}
