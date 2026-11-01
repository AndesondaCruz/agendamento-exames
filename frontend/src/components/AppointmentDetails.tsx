import type { Appointment } from '../api/types';
import { clinicDateOf, formatClinicTime, formatLongDate } from '../lib/dates';

/**
 * Os dados de um agendamento, numa lista de definição (dl): leitores de
 * tela anunciam cada par "Exame: Raio-X de Tórax". Usado na confirmação e
 * na tela "Meu agendamento".
 */
export function AppointmentDetails({
  appointment,
}: {
  appointment: Appointment;
}) {
  const rows: Array<[string, string, string?]> = [
    ['Paciente', appointment.patientName],
    ...(appointment.patientCpfMasked
      ? [
          ['CPF', appointment.patientCpfMasked, 'font-mono'] as [
            string,
            string,
            string,
          ],
        ]
      : []),
    ['Exame', appointment.exam.name],
    ['Médico', appointment.doctor.name],
    [
      'Quando',
      `${formatLongDate(clinicDateOf(appointment.startsAt))}, das ${formatClinicTime(
        appointment.startsAt,
      )} às ${formatClinicTime(appointment.endsAt)}`,
    ],
  ];

  return (
    <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
      {rows.map(([label, value, extraClass]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-slate-500">{label}</dt>
          <dd className={`text-right font-medium ${extraClass ?? ''}`}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
