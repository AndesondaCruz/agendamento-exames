import { useEffect } from 'react';
import { useAvailability } from '../../../api/hooks';
import type { Doctor, Exam, Slot, UnavailableReason } from '../../../api/types';
import { OptionCard } from '../../../components/OptionCard';
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../../components/StatusViews';

interface SlotPickerProps {
  exam: Exam;
  doctor: Doctor;
  date: string;
  selected?: Slot;
  onSelect: (slot: Slot) => void;
  onSelectedSlotGone: () => void;
}

const EMPTY_MESSAGES: Record<
  UnavailableReason,
  (doctor: string) => { title: string; hint: string }
> = {
  PAST_DATE: () => ({
    title: 'Essa data já passou.',
    hint: 'Escolha uma data a partir de hoje.',
  }),
  NOT_WORKING_DAY: (doctor) => ({
    title: `${doctor} não atende neste dia.`,
    hint: 'Escolha outra data.',
  }),
  NO_AVAILABLE_SLOTS: () => ({
    title: 'Não há horários livres nesta data.',
    hint: 'Todos os horários já foram reservados ou já passaram. Tente outro dia.',
  }),
};

/** Manhã / Tarde / Noite: escanear 20 horários fica bem mais fácil agrupado. */
function periodOf(time: string): 'Manhã' | 'Tarde' | 'Noite' {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
}

export function SlotPicker({
  exam,
  doctor,
  date,
  selected,
  onSelect,
  onSelectedSlotGone,
}: SlotPickerProps) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useAvailability(doctor.id, exam.id, date);

  // A agenda é recarregada periodicamente. Se o horário escolhido sumiu
  // (outra pessoa reservou), avisa a página, em vez de deixar o paciente
  // descobrir só ao confirmar.
  useEffect(() => {
    if (!data || !selected) return;
    const stillAvailable = data.slots.some(
      (slot) => slot.startsAt === selected.startsAt,
    );
    if (!stillAvailable) {
      onSelectedSlotGone();
    }
  }, [data, selected, onSelectedSlotGone]);

  if (isPending) return <Skeleton rows={2} className="h-10" />;
  if (isError)
    return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (data.slots.length === 0) {
    const message = EMPTY_MESSAGES[
      data.unavailableReason ?? 'NO_AVAILABLE_SLOTS'
    ](doctor.name);
    return <EmptyState title={message.title} description={message.hint} />;
  }

  // Agrupamento manual (Map.groupBy é ES2024 e falta em navegadores mais antigos).
  const groups = new Map<string, Slot[]>();
  for (const slot of data.slots) {
    const period = periodOf(slot.time);
    groups.set(period, [...(groups.get(period) ?? []), slot]);
  }

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="text-xs text-slate-500">
        {data.slots.length} horário(s) livre(s) · exame de{' '}
        {exam.durationMinutes} min
        {isFetching ? ' · atualizando…' : ''}
      </p>

      {[...groups.entries()].map(([period, slots]) => (
        <fieldset key={period}>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            {period}
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {slots.map((slot) => (
              <OptionCard
                key={slot.startsAt}
                name="slot"
                value={slot.startsAt}
                checked={selected?.startsAt === slot.startsAt}
                onChange={() => onSelect(slot)}
                ariaLabel={`${slot.time}, ${exam.durationMinutes} minutos`}
                className="px-2 py-2 text-center font-medium tabular-nums"
              >
                {slot.time}
              </OptionCard>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
