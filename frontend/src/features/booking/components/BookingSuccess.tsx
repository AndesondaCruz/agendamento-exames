import { useEffect, useRef } from 'react';
import type { Appointment } from '../../../api/types';
import { AppointmentDetails } from '../../../components/AppointmentDetails';

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
          {appointment.protocol}
        </span>
      </p>

      <div className="mt-6">
        <AppointmentDetails appointment={appointment} />
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Guarde o protocolo. Com ele e o seu CPF, você consulta ou cancela o
        exame em{' '}
        <a
          href="#meu-agendamento"
          className="font-medium text-brand-700 underline underline-offset-2"
        >
          Meu agendamento
        </a>
        .
      </p>

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
