import { ApiError, NetworkError } from '../api/client';

/**
 * Traduz qualquer erro numa mensagem para o paciente. A decisão é pelo
 * `code` estável da API, nunca pelo texto técnico da mensagem.
 */
const MESSAGES_BY_CODE: Record<string, string> = {
  SLOT_UNAVAILABLE:
    'Este horário acabou de ser reservado por outra pessoa. A agenda foi atualizada: escolha outro horário.',
  SLOT_IN_PAST: 'Esse horário já passou. Escolha um horário futuro.',
  OUTSIDE_WORKING_HOURS:
    'Esse horário não faz parte da agenda do médico. Escolha outro horário.',
  SLOT_NOT_ON_GRID:
    'Esse horário não está disponível para este exame. Escolha outro horário.',
  EXAM_NOT_FOUND:
    'O exame selecionado não foi encontrado. Busque o exame novamente.',
  DOCTOR_NOT_FOUND:
    'O médico selecionado não foi encontrado. Escolha outro médico.',
  TOO_MANY_REQUESTS:
    'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente de novo.',
};

export function userMessageFor(error: unknown): string {
  if (error instanceof NetworkError) {
    return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  }
  if (error instanceof ApiError) {
    if (MESSAGES_BY_CODE[error.code]) return MESSAGES_BY_CODE[error.code]!;
    if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
      return error.details.flatMap((detail) => detail.messages).join(' ');
    }
    if (error.status >= 500) {
      return 'O servidor teve um problema inesperado. Tente novamente em instantes.';
    }
    return error.message;
  }
  return 'Algo deu errado. Tente novamente.';
}

/** Erros em que a ação certa é escolher outro horário (e recarregar a agenda). */
export function isSlotError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    [
      'SLOT_UNAVAILABLE',
      'SLOT_IN_PAST',
      'OUTSIDE_WORKING_HOURS',
      'SLOT_NOT_ON_GRID',
    ].includes(error.code)
  );
}
