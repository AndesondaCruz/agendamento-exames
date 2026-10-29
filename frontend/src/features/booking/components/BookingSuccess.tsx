import { useEffect, useRef } from 'react';
import type { Appointment } from '../../../api/types';
import {
  clinicDateOf,
  formatClinicTime,
  formatLongDate,
} from '../../../lib/dates';

interface BookingSuccessProps {
  appointment: Appointment;
  onNewBooking: () => void;
}

export function BookingSuccess({
  appointment,
  onNewBooking,
}: BookingSuccessProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Leva o foco ao título: leitores de tela anunciam a confirmação na hora.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const protocol = appointment.id.slice(0, 8).toUpperCase();

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-brand-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700"
      >
        ✓
      </div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold text-slate-900 outline-none"
      >
        Agendamento confirmado!
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Protocolo{' '}
        <span className="font-mono font-semibold text-slate-700">
          {protocol}
        </span>
      </p>

      <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Paciente</dt>
          <dd className="font-medium">{appointment.patientName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Exame</dt>
          <dd className="text-right font-medium">{appointment.exam.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Médico</dt>
          <dd className="font-medium">{appointment.doctor.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Quando</dt>
          <dd className="text-right font-medium">
            {formatLongDate(clinicDateOf(appointment.startsAt))}, das{' '}
            {formatClinicTime(appointment.startsAt)} às{' '}
            {formatClinicTime(appointment.endsAt)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onNewBooking}
        className="mt-6 rounded-xl border border-brand-600 px-5 py-2.5 font-semibold text-brand-700 hover:bg-brand-50"
      >
        Fazer outro agendamento
      </button>
    </section>
  );
}
