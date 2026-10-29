import type { Doctor } from '../../api/types';
import { MAX_DAYS_AHEAD } from '../../config';
import { dateRange, isoWeekday } from '../../lib/dates';

/**
 * Regras do fluxo de agendamento que não dependem de React.
 * Separadas dos componentes para serem testáveis e reutilizáveis
 * (e para não quebrar o Fast Refresh do Vite).
 */

/** Primeira data em que o médico atende, a partir de hoje (para pré-selecionar). */
export function firstWorkingDate(
  doctor: Doctor,
  today: string,
): string | undefined {
  return dateRange(today, MAX_DAYS_AHEAD).find((date) =>
    doctor.workingWeekdays.includes(isoWeekday(date)),
  );
}

/** Mesmas regras do back-end (CreateAppointmentDto). O servidor revalida de qualquer forma. */
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validatePatientName(raw: string): string | null {
  const name = normalizeName(raw);
  if (name.length < 3) return 'Informe o nome completo (pelo menos 3 letras).';
  if (name.length > 120) return 'O nome deve ter no máximo 120 caracteres.';
  if (!PERSON_NAME.test(name))
    return 'Use apenas letras, espaços, apóstrofo, ponto ou hífen.';
  return null;
}
