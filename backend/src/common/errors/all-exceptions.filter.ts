import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';

/** Formato único de erro de toda a API (documentado no Swagger). */
export interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

/**
 * Filtro global: TODO erro sai da API no mesmo formato.
 *
 * - AppException (regras de negócio): status + código definidos no service.
 * - HttpException do Nest (ex.: rota inexistente): código derivado do status.
 * - Qualquer outro erro: 500 genérico. O detalhe vai para o LOG, nunca para
 *   o cliente, para não vazar stack trace, SQL ou estrutura interna.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const body = this.toErrorBody(
      exception,
      request.originalUrl ?? request.url,
    );

    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, path: string): ErrorBody {
    const base = { path, timestamp: new Date().toISOString() };

    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        ...(exception.details !== undefined && { details: exception.details }),
        ...base,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        code: CODE_BY_STATUS[status] ?? `HTTP_${status}`,
        message: this.extractMessage(exception),
        ...base,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Erro interno inesperado. Tente novamente em instantes.',
      ...base,
    };
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;

    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('; ');
    return typeof message === 'string' ? message : exception.message;
  }
}
