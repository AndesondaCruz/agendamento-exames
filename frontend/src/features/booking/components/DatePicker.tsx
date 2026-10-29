import { useState } from 'react';
import type { Doctor } from '../../../api/types';
import { OptionCard } from '../../../components/OptionCard';
import { DAYS_PER_PAGE, MAX_DAYS_AHEAD } from '../../../config';
import {
  addDays,
  dateRange,
  formatDayMonth,
  formatDayNumber,
  formatLongDate,
  formatMonthShort,
  formatWeekdayShort,
  isoWeekday,
} from '../../../lib/dates';

interface DatePickerProps {
  doctor: Doctor;
  today: string;
  selected?: string;
  onSelect: (date: string) => void;
}

/**
 * Faixa de dias em vez de um calendário mensal: no celular é mais fácil
 * tocar, e os dias em que o médico NÃO atende já aparecem desabilitados,
 * então o paciente nem chega a escolher uma data sem horário.
 */
export function DatePicker({
  doctor,
  today,
  selected,
  onSelect,
}: DatePickerProps) {
  const [page, setPage] = useState(0);
  const lastPage = Math.ceil(MAX_DAYS_AHEAD / DAYS_PER_PAGE) - 1;
  const days = dateRange(addDays(today, page * DAYS_PER_PAGE), DAYS_PER_PAGE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {formatDayMonth(days[0]!)} – {formatDayMonth(days.at(-1)!)}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page === 0}
            className="h-9 w-9 rounded-lg border border-slate-300 text-base hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">Dias anteriores</span>
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page === lastPage}
            className="h-9 w-9 rounded-lg border border-slate-300 text-base hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">→</span>
            <span className="sr-only">Próximos dias</span>
          </button>
        </div>
      </div>

      <fieldset>
        <legend className="sr-only">
          Datas disponíveis para {doctor.name}
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {days.map((date) => {
            const works = doctor.workingWeekdays.includes(isoWeekday(date));
            return (
              <OptionCard
                key={date}
                name="date"
                value={date}
                checked={selected === date}
                disabled={!works}
                onChange={() => onSelect(date)}
                ariaLabel={`${formatLongDate(date)}${works ? '' : ' (sem atendimento)'}`}
                className="px-2 py-2 text-center"
              >
                <span className="block text-xs uppercase tracking-wide">
                  {formatWeekdayShort(date)}
                </span>
                <span className="block text-lg font-semibold leading-tight tabular-nums">
                  {formatDayNumber(date)}
                </span>
                <span className="block text-xs">{formatMonthShort(date)}</span>
                {date === today && (
                  <span className="block text-[10px] text-brand-700">hoje</span>
                )}
              </OptionCard>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
