import { QueryFailedError } from 'typeorm';

/** Códigos SQLSTATE do Postgres usados pela aplicação. */
export const PG_EXCLUSION_VIOLATION = '23P01';

interface PgDriverError {
  code?: string;
  constraint?: string;
}

/**
 * O erro é a violação da exclusion constraint informada?
 * Checa o código E o nome da constraint: outro 23P01 (de outra tabela, no
 * futuro) não deve ser confundido com "horário ocupado".
 */
export function isExclusionViolation(
  error: unknown,
  constraint: string,
): boolean {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError = error.driverError as PgDriverError;
  return (
    driverError.code === PG_EXCLUSION_VIOLATION &&
    driverError.constraint === constraint
  );
}
