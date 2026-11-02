import type { Doctor } from '../../api/types';
import { MAX_DAYS_AHEAD } from '../../config';
import {
  isValidBirthDate,
  isValidBrazilianPhone,
  isValidCpf,
  onlyDigits,
} from '../../lib/brazil';
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

export interface PatientData {
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
}

export type PatientField = keyof PatientData;

export const emptyPatient: PatientData = {
  name: '',
  cpf: '',
  birthDate: '',
  phone: '',
  email: '',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Uma mensagem por campo inválido; objeto vazio = tudo certo. */
export function validatePatient(
  patient: PatientData,
  today: string,
): Partial<Record<PatientField, string>> {
  const errors: Partial<Record<PatientField, string>> = {};

  const nameError = validatePatientName(patient.name);
  if (nameError) errors.name = nameError;

  if (!isValidCpf(patient.cpf))
    errors.cpf = 'CPF inválido. Confira os 11 números.';

  if (!isValidBirthDate(patient.birthDate, today))
    errors.birthDate = 'Informe uma data de nascimento válida.';

  if (!isValidBrazilianPhone(patient.phone))
    errors.phone = 'Informe o telefone com DDD, ex.: (85) 98765-4321.';

  const email = patient.email.trim();
  if (email && (!EMAIL.test(email) || email.length > 254))
    errors.email = 'Informe um e-mail válido, ou deixe em branco.';

  return errors;
}

/** Converte o formulário no corpo do POST: só dígitos, sem campos vazios. */
export function toPatientPayload(patient: PatientData) {
  const email = patient.email.trim().toLowerCase();
  return {
    patientName: normalizeName(patient.name),
    patientCpf: onlyDigits(patient.cpf),
    patientBirthDate: patient.birthDate,
    patientPhone: onlyDigits(patient.phone),
    ...(email ? { patientEmail: email } : {}),
  };
}

export function validatePatientName(raw: string): string | null {
  const name = normalizeName(raw);
  if (name.length < 3) return 'Informe o nome completo (pelo menos 3 letras).';
  if (name.length > 120) return 'O nome deve ter no máximo 120 caracteres.';
  if (!PERSON_NAME.test(name))
    return 'Use apenas letras, espaços, apóstrofo, ponto ou hífen.';
  return null;
}
