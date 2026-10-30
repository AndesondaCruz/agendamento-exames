import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  cacheHeaderDoc,
  withCacheHeader,
} from '../common/cache/cache-header.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { ApiErrorResponse } from '../common/http/api-error.decorator.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQuery, DoctorIdParam } from './dto/availability.query.js';
import { AvailabilityResponse } from './dto/availability.response.js';

const PATH = '/api/doctors/1/availability';

@ApiTags('Médicos')
@Controller('doctors')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':doctorId/availability')
  @ApiOperation({
    summary: 'Horários livres do médico para um exame numa data',
    description:
      'Datas passadas, dias sem atendimento ou sem horários livres retornam 200 com `slots: []` e o motivo em `unavailableReason`.',
  })
  @ApiOkResponse({ type: AvailabilityResponse, headers: cacheHeaderDoc })
  @ApiErrorResponse(400, PATH, 'Parâmetros ou data inválidos', [
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos na requisição.',
      details: [
        { field: 'date', messages: ['date deve estar no formato YYYY-MM-DD.'] },
      ],
    },
    { code: ErrorCode.INVALID_DATE, message: 'Data inválida: "2030-02-30".' },
  ])
  @ApiErrorResponse(404, PATH, 'Médico ou exame inexistente', [
    { code: ErrorCode.DOCTOR_NOT_FOUND, message: 'Médico 99 não encontrado.' },
    { code: ErrorCode.EXAM_NOT_FOUND, message: 'Exame 999 não encontrado.' },
  ])
  async getAvailability(
    @Param() { doctorId }: DoctorIdParam,
    @Query() { examId, date }: AvailabilityQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AvailabilityResponse> {
    return withCacheHeader(
      res,
      await this.availabilityService.getAvailability(doctorId, examId, date),
    );
  }
}
