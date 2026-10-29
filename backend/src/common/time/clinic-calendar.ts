import { DateTime } from 'luxon';

/**
 * Conversões entre instantes absolutos (Date / UTC no banco) e o calendário
 * local da clínica (data + minutos do dia), que é como os turnos são definidos.
 *
 * Fica isolado aqui para que o resto do código nunca faça conta de fuso
 * "na mão": é a fonte clássica de bugs de agendamento.
 */

export interface ClinicDay {
  /** "YYYY-MM-DD" no fuso da clínica. */
  date: string;
  /** 1 = segunda ... 7 = domingo (ISO 8601). */
  isoWeekday: number;
  /** 00:00 do dia, no fuso da clínica. */
  start: Date;
  /** 00:00 do dia seguinte (limite exclusivo). */
  end: Date;
}

/** Interpreta "YYYY-MM-DD" como um dia no fuso da clínica. Null se inválida. */
export function parseClinicDay(
  date: string,
  timezone: string,
): ClinicDay | null {
  const day = DateTime.fromISO(date, { zone: timezone });

  if (!day.isValid || day.toISODate() !== date) {
    return null; // rejeita "2030-02-30" e formatos fora de YYYY-MM-DD
  }

  return {
    date,
    isoWeekday: day.weekday,
    start: day.startOf('day').toJSDate(),
    end: day.plus({ days: 1 }).startOf('day').toJSDate(),
  };
}

/** Minutos desde o 00:00 do dia (pode ser fracionário, ex.: 09:21:30 -> 561.5). */
export function minutesSinceDayStart(instant: Date, day: ClinicDay): number {
  return (instant.getTime() - day.start.getTime()) / 60_000;
}

/** Instante correspondente a "minuto X" do dia na clínica. */
export function instantAtMinute(
  day: ClinicDay,
  minute: number,
  timezone: string,
): Date {
  return DateTime.fromJSDate(day.start, { zone: timezone })
    .plus({ minutes: minute })
    .toJSDate();
}

/** Data local ("YYYY-MM-DD") de um instante, no fuso da clínica. */
export function clinicDateOf(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toISODate()!;
}

/** ISO 8601 com o offset da clínica: "2030-01-07T08:00:00.000-03:00". */
export function toClinicIso(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toISO()!;
}

/** "08:00" a partir de minutos do dia. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
