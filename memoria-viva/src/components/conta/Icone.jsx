// Ícones de traço, sempre ao lado de um texto escrito (nunca sozinhos, exceto o fechar).
const DESENHOS = {
  inicio: <path d="M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  memorias: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 15.5l4.5-4 4 3.5 3-2.5 4.5 3.5" /><circle cx="15.5" cy="8.5" r="1.5" /></>,
  conversar: <><path d="M4 5h12v8H9l-3.5 3v-3H4z" /><path d="M16 9h4v8h-1.5v3L15 17h-5v-2" /></>,
  familia: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15.6 14.3c2.6-.4 4.5 1.2 4.9 4.7" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  foto: <><path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  microfone: <><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" /></>,
  receita: <><path d="M4 11h16v1.5A6.5 6.5 0 0113.5 19h-3A6.5 6.5 0 014 12.5z" /><path d="M8.5 7.5c0-1.5 1-1.5 1-3M12 7.5c0-1.5 1-1.5 1-3M15.5 7.5c0-1.5 1-1.5 1-3" /></>,
  musica: <><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>,
  conselho: <path d="M9 17h6M10 20.5h4M12 3.5a6 6 0 00-3.5 10.9c.5.4.5 1 .5 1.6h6c0-.6 0-1.2.5-1.6A6 6 0 0012 3.5z" />,
  coracao: <path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0112 7.3a4.2 4.2 0 017.5 2.5C19.5 15.4 12 20 12 20z" />,
  lembro: <><path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0112 7.3a4.2 4.2 0 017.5 2.5C19.5 15.4 12 20 12 20z" /><path d="M9.5 12.5l2 2 3.5-4" /></>,
  comentar: <path d="M4 5h16v11h-9l-5 4v-4H4z" />,
  certo: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  corrigir: <path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3" />,
  ver: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  ouvir: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  pausar: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  lua: <path d="M19 14.5A7.5 7.5 0 019.5 5 7.5 7.5 0 1019 14.5z" />,
  sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  automatico: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 010 16z" fill="currentColor" /></>,
  contraste: <><circle cx="12" cy="12" r="8" /><path d="M12 4v16M12 8h6M12 12h8M12 16h6" /></>,
  movimento: <path d="M3 12c2.5-4 5-4 7.5 0s5 4 7.5 0M3 17c2.5-4 5-4 7.5 0s5 4 7.5 0M3 7c2.5-4 5-4 7.5 0s5 4 7.5 0" />,
  trocar: <path d="M4 9h13l-3-3M20 15H7l3 3" />,
  voltar: <path d="M19 12H5M11 6l-6 6 6 6" />,
  sair: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  entrar: <path d="M10 4H5v16h5M13 8l4 4-4 4M17 12H8" />,
  convidar: <><circle cx="10" cy="8" r="3.2" /><path d="M3.5 19.5c.7-3.5 3.3-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.3M18 13v6M15 16h6" /></>,
  linha: <><path d="M3 12h18" /><circle cx="6" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="18" cy="12" r="2" fill="currentColor" /></>,
  espiral: <path d="M12.6 12.4a1 1 0 11-1.4-1.3 2.4 2.4 0 013.3 1.8 3.8 3.8 0 01-3.7 4.4 5.2 5.2 0 01-5.3-5.1A6.6 6.6 0 0112 5.6a8 8 0 018 7.6" />,
  ler: <path d="M4 5.5c3-1 5.5-1 8 1 2.5-2 5-2 8-1V19c-3-1-5.5-1-8 1-2.5-2-5-2-8-1zM12 6.5V20" />,
  enviar: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
  ajustes: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5" />,
  pin: <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  altofalante: <><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /></>,
  ajuda: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.6 2.6 0 015 .8c0 1.8-2.5 2.2-2.5 4" /><circle cx="12" cy="17.2" r=".6" fill="currentColor" /></>,
  costura: <><path d="M5 19L17.5 6.5" /><ellipse cx="18.6" cy="5.4" rx="1.6" ry="1" transform="rotate(-45 18.6 5.4)" /><path d="M7 13c-2 1-3 3-1.5 4.5S10 18 11 16" /></>,
  album: <><rect x="7" y="3.5" width="13.5" height="13.5" rx="1.5" /><path d="M3.5 7v13.5H17" /><path d="M7 13.5l3.5-3 3 2.5 2.5-2 4.5 3.5" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3z" /></>,
  marcar: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /><path d="M12 1.5v2" /></>,
  lixo: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />,
  estrela: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  anexo: <path d="M8.5 12.5l6-6a3 3 0 014.2 4.2l-7.8 7.8a5 5 0 01-7-7L11 4.5" />,
  link: <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />,
  calendario: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></>,
  selecionar: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 12.5l3 3 5-6" /></>,
  seguir: <path d="M5 12h14M13 6l6 6-6 6" />,
  parar: <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />,
  buscar: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>,
  enviarfoto: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4 14v6h16v-6" /></>,
};

export default function Icone({ nome, tam = 24, className }) {
  return (
    <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {DESENHOS[nome]}
    </svg>
  );
}
