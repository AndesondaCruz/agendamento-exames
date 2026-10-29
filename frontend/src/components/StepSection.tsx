import { useId, type ReactNode } from 'react';

interface StepSectionProps {
  step: number;
  title: string;
  description?: string;
  isDone: boolean;
  isLocked: boolean;
  lockedHint?: string;
  children: ReactNode;
}

/**
 * Bloco numerado de um passo do agendamento. Passos futuros ficam
 * "travados" com uma dica do que falta, em vez de sumirem: o paciente
 * enxerga o caminho inteiro desde o início.
 */
export function StepSection({
  step,
  title,
  description,
  isDone,
  isLocked,
  lockedHint,
  children,
}: StepSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={`scroll-mt-6 rounded-2xl border bg-white p-4 shadow-sm transition sm:p-6 ${
        isLocked
          ? 'border-dashed border-slate-300 bg-slate-50 shadow-none'
          : 'border-slate-200'
      }`}
    >
      <header className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            isDone ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700'
          }`}
        >
          {isDone ? '✓' : step}
        </span>
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-slate-900">
            <span className="sr-only">Passo {step}: </span>
            {title}
          </h2>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
      </header>

      {isLocked ? (
        <p className="text-sm text-slate-500">{lockedHint}</p>
      ) : (
        children
      )}
    </section>
  );
}
