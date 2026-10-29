import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-codes.js';

export interface FieldError {
  field: string;
  messages: string[];
}

/** Mensagens geradas pelo próprio ValidationPipe (não pelos DTOs), traduzidas. */
const BUILT_IN_MESSAGES: Record<string, (field: string) => string> = {
  whitelistValidation: (field) => `${field} não é um campo permitido.`,
};

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = error.constraints
      ? [
          {
            field,
            messages: Object.entries(error.constraints).map(
              ([constraint, message]) =>
                BUILT_IN_MESSAGES[constraint]?.(field) ?? message,
            ),
          },
        ]
      : [];
    return [...own, ...flatten(error.children ?? [], field)];
  });
}

/**
 * ValidationPipe global:
 * - whitelist: descarta campos não declarados no DTO;
 * - forbidNonWhitelisted: e rejeita a requisição se eles vierem (evita
 *   "mass assignment", ex.: alguém mandar `endsAt` ou `id` no POST);
 * - transform: converte query strings ("7") nos tipos do DTO (7).
 * Erros saem como 400 VALIDATION_ERROR com a lista de campos inválidos.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      AppException.badRequest(
        ErrorCode.VALIDATION_ERROR,
        'Dados inválidos na requisição.',
        flatten(errors),
      ),
  });
}
