import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.js';

/**
 * Erro de negócio com código estável.
 * Os services lançam AppException; o filtro global a converte no corpo
 * de erro padrão da API.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }

  static notFound(code: ErrorCode, message: string): AppException {
    return new AppException(HttpStatus.NOT_FOUND, code, message);
  }

  /** 422: a requisição é válida, mas viola uma regra de negócio. */
  static businessRule(
    code: ErrorCode,
    message: string,
    details?: unknown,
  ): AppException {
    return new AppException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      code,
      message,
      details,
    );
  }

  static conflict(code: ErrorCode, message: string): AppException {
    return new AppException(HttpStatus.CONFLICT, code, message);
  }

  static badRequest(
    code: ErrorCode,
    message: string,
    details?: unknown,
  ): AppException {
    return new AppException(HttpStatus.BAD_REQUEST, code, message, details);
  }
}
