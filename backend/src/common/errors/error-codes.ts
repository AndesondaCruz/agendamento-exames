/**
 * Códigos de erro estáveis, documentados na API.
 *
 * O front decide o que mostrar pelo `code` (contrato estável), nunca
 * comparando o texto de `message` (que pode mudar a qualquer momento).
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EXAM_NOT_FOUND: 'EXAM_NOT_FOUND',
  DOCTOR_NOT_FOUND: 'DOCTOR_NOT_FOUND',
  INVALID_DATE: 'INVALID_DATE',
  SLOT_IN_PAST: 'SLOT_IN_PAST',
  OUTSIDE_WORKING_HOURS: 'OUTSIDE_WORKING_HOURS',
  SLOT_NOT_ON_GRID: 'SLOT_NOT_ON_GRID',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  NOT_FOUND: 'NOT_FOUND',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
