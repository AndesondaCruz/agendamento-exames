import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ErrorCode } from '../errors/error-codes.js';
import { ErrorResponseDto } from './error-response.dto.js';

interface ErrorExample {
  code: ErrorCode;
  message: string;
  details?: Array<{ field: string; messages: string[] }>;
}

/**
 * Documenta no Swagger uma resposta de erro com exemplos REAIS do endpoint.
 *
 * Sem isso, todo endpoint mostraria o mesmo exemplo fixo do DTO de erro
 * (ex.: um 409 SLOT_UNAVAILABLE na busca de exames), o que confunde quem
 * consome a API. Cada endpoint declara os códigos que de fato pode devolver.
 */
export function ApiErrorResponse(
  status: number,
  path: string,
  description: string,
  examples: ErrorExample[],
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      type: ErrorResponseDto,
      examples: Object.fromEntries(
        examples.map((example) => [
          example.code,
          {
            summary: example.code,
            value: {
              statusCode: status,
              code: example.code,
              message: example.message,
              ...(example.details && { details: example.details }),
              path,
              timestamp: '2030-01-07T13:00:00.000Z',
            },
          },
        ]),
      ),
    }),
  );
}
