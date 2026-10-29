import { CLINIC_TIMEZONE } from '../config';

/**
 * Datas de calendário ("YYYY-MM-DD") manipuladas SEM depender do fuso do
 * navegador. Armadilha clássica: new Date('2030-01-07') é meia-noite UTC,
 * que no Brasil vira dia 06 às 21h. Por isso toda conta usa Date.UTC e
 * toda formatação fixa timeZone: 'UTC'.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcDate(date: string): Date {
  const match = ISO_DATE.exec(date);
  if (!match) throw new RangeError(`Data inválida: "${date}"`);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function fromUtcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Data de hoje no fuso da clínica (não no fuso do computador do paciente). */
export function clinicToday(now: Date = new Date()): string {
  // 'en-CA' formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const value = toUtcDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtcDate(value);
}

/** 1 = segunda ... 7 = domingo (mesmo padrão ISO da API). */
export function isoWeekday(date: string): number {
  const day = toUtcDate(date).getUTCDay(); // 0 = domingo
  return day === 0 ? 7 : day;
}

/** Lista de N datas consecutivas a partir de `start`. */
export function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

const weekdayShort = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  timeZone: 'UTC',
});
const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});
const longDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "seg" */
export function formatWeekdayShort(date: string): string {
  return weekdayShort.format(toUtcDate(date)).replace('.', '');
}

/** "07 de jan" */
export function formatDayMonth(date: string): string {
  return dayMonth.format(toUtcDate(date)).replace('.', '');
}

const monthShort = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
});

/** "07" */
export function formatDayNumber(date: string): string {
  return date.slice(8, 10);
}

/** "jan" */
export function formatMonthShort(date: string): string {
  return monthShort.format(toUtcDate(date)).replace('.', '');
}

/** "segunda-feira, 07 de janeiro de 2030" */
export function formatLongDate(date: string): string {
  return longDate.format(toUtcDate(date));
}

/** Hora local da clínica a partir de um ISO com offset: "08:00". */
export function formatClinicTime(isoDateTime: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CLINIC_TIMEZONE,
  }).format(new Date(isoDateTime));
}

/** Data local da clínica ("YYYY-MM-DD") a partir de um ISO com offset. */
export function clinicDateOf(isoDateTime: string): string {
  return clinicToday(new Date(isoDateTime));
}

const WEEKDAY_NAMES = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/** [1,2,3,4,5] -> "seg a sex"; [2,4] -> "ter, qui". */
export function describeWeekdays(weekdays: number[]): string {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b);
  if (sorted.length === 0) return 'sem atendimento';

  const isConsecutive = sorted.every(
    (day, i) => i === 0 || day === sorted[i - 1]! + 1,
  );
  const name = (day: number) => WEEKDAY_NAMES[day - 1] ?? '?';

  if (isConsecutive && sorted.length >= 3) {
    return `${name(sorted[0]!)} a ${name(sorted.at(-1)!)}`;
  }
  return sorted.map(name).join(', ');
}
