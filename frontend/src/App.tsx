import { BookingPage } from './features/booking/BookingPage';

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
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
        </div>
      </header>

      <main
        id="conteudo"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10"
      >
        <BookingPage />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Horários no fuso de Brasília (America/Sao_Paulo).
      </footer>
    </div>
  );
}
