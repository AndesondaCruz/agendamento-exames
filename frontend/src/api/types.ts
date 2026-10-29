/**
 * Tipos do contrato HTTP da API (espelham os DTOs de resposta do NestJS,
 * documentados no Swagger em /api/docs).
 */

export interface Exam {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface Shift {
  /** 1 = segunda ... 7 = domingo (ISO 8601). */
  weekday: number;
  start: string;
  end: string;
}

export interface Doctor {
  id: number;
  name: string;
  crm: string;
  workingWeekdays: number[];
  shifts: Shift[];
}

export interface Slot {
  /** "08:00", horário local da clínica. */
  time: string;
  /** ISO 8601 com offset, ex.: "2030-01-07T08:00:00.000-03:00". */
  startsAt: string;
  endsAt: string;
}

export type UnavailableReason =
  'PAST_DATE' | 'NOT_WORKING_DAY' | 'NO_AVAILABLE_SLOTS';

export interface Availability {
  date: string;
  timezone: string;
  doctor: { id: number; name: string };
  exam: Exam;
  slots: Slot[];
  unavailableReason: UnavailableReason | null;
}

export interface Appointment {
  id: string;
  patientName: string;
  startsAt: string;
  endsAt: string;
  exam: Exam;
  doctor: { id: number; name: string; crm: string };
  createdAt: string;
}

export interface CreateAppointmentInput {
  patientName: string;
  examId: number;
  doctorId: number;
  startsAt: string;
}

/** Formato único de erro da API. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Array<{ field: string; messages: string[] }>;
}
