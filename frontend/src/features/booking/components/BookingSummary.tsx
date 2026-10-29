import { formatClinicTime, formatLongDate } from '../../../lib/dates';
import type { BookingState } from '../bookingReducer';

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`text-right font-medium ${value ? 'text-slate-800' : 'text-slate-500'}`}
      >
        {value ?? '—'}
      </dd>
    </div>
  );
}

/** Resumo sempre visível: o paciente confere as escolhas sem rolar a página. */
export function BookingSummary({ state }: { state: BookingState }) {
  const { exam, doctor, date, slot } = state;

  return (
    <aside
      aria-label="Resumo do agendamento"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-2 font-semibold text-slate-900">Resumo</h2>
      <dl className="divide-y divide-slate-100">
        <Row label="Exame" value={exam?.name} />
        <Row
          label="Duração"
          value={exam ? `${exam.durationMinutes} min` : undefined}
        />
        <Row label="Médico" value={doctor?.name} />
        <Row label="Data" value={date ? formatLongDate(date) : undefined} />
        <Row
          label="Horário"
          value={
            slot
              ? `${slot.time} às ${formatClinicTime(slot.endsAt)}`
              : undefined
          }
        />
      </dl>
    </aside>
  );
}
