import { useEffect, useRef, useState } from 'react';
import { BookingPage } from './features/booking/BookingPage';
import { ManageAppointmentPage } from './features/manage/ManageAppointmentPage';

/**
 * Navegação pelo hash da URL (#meu-agendamento): duas telas não justificam
 * uma biblioteca de rotas, e o hash funciona em qualquer hospedagem estática
 * sem configurar fallback no servidor. Só hashes da lista são rotas: o link
 * "Pular para o conteúdo" (#conteudo) não troca de tela.
 */
const ROUTES = {
  '#agendar': 'booking',
  '#meu-agendamento': 'manage',
} as const;

type View = (typeof ROUTES)[keyof typeof ROUTES];

function viewFromHash(hash: string): View | null {
  return hash in ROUTES ? ROUTES[hash as keyof typeof ROUTES] : null;
}

const NAV: Array<{ href: keyof typeof ROUTES; view: View; label: string }> = [
  { href: '#agendar', view: 'booking', label: 'Agendar exame' },
  { href: '#meu-agendamento', view: 'manage', label: 'Meu agendamento' },
];

export default function App() {
  const [view, setView] = useState<View>(
    () => viewFromHash(window.location.hash) ?? 'booking',
  );
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const onHashChange = () => {
      const next = viewFromHash(window.location.hash);
      if (next) setView(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Trocou de tela: leva o foco ao conteúdo, como numa navegação de página.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [view]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white"
          >
            +
          </span>
          <div>
            <p className="font-semibold text-slate-900">Clínica Imagem</p>
            <p className="text-xs text-slate-500">
              Agendamento de exames de imagem
            </p>
          </div>

          <nav aria-label="Principal" className="ml-auto">
            <ul className="flex gap-1 text-sm font-medium">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={view === item.view ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2 ${
                      view === item.view
                        ? 'bg-brand-50 text-brand-800'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto outline-none w-full max-w-6xl flex-1 px-4 py-6 sm:py-10"
      >
        {view === 'booking' ? <BookingPage /> : <ManageAppointmentPage />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Horários no fuso de Brasília (America/Sao_Paulo).
      </footer>
    </div>
  );
}
