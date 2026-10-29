import { useId, useState } from 'react';
import { useExamSearch } from '../../../api/hooks';
import type { Exam } from '../../../api/types';
import { OptionCard } from '../../../components/OptionCard';
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../../components/StatusViews';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

interface ExamSearchProps {
  selected?: Exam;
  onSelect: (exam: Exam) => void;
}

export function ExamSearch({ selected, onSelect }: ExamSearchProps) {
  const inputId = useId();
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term.trim(), 300);
  const {
    data: exams,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useExamSearch(debouncedTerm);

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Buscar exame pelo nome
        </label>
        <input
          id={inputId}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Ex.: ressonância, raio-x, ultrassom"
          autoComplete="off"
          maxLength={100}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base placeholder:text-slate-400 focus:border-brand-600"
        />
        <p aria-live="polite" className="mt-1 h-4 text-xs text-slate-500">
          {isFetching && !isPending
            ? 'Buscando…'
            : exams
              ? `${exams.length} exame(s) encontrado(s)`
              : ''}
        </p>
      </div>

      {isPending ? (
        <Skeleton rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : exams.length === 0 ? (
        <EmptyState
          title={`Nenhum exame encontrado para “${debouncedTerm}”.`}
          description="Confira a grafia ou tente um termo mais curto, como “raio” ou “ultra”."
        />
      ) : (
        <fieldset>
          <legend className="sr-only">Exames</legend>
          <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {exams.map((exam) => (
              <OptionCard
                key={exam.id}
                name="exam"
                value={String(exam.id)}
                checked={selected?.id === exam.id}
                onChange={() => onSelect(exam)}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">
                    {exam.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {exam.durationMinutes} min
                  </span>
                </span>
              </OptionCard>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
