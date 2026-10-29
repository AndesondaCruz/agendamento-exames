import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/http/error-response.dto.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQuery, DoctorIdParam } from './dto/availability.query.js';
import { AvailabilityResponse } from './dto/availability.response.js';

@ApiTags('Médicos')
@Controller('doctors')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':doctorId/availability')
  @ApiOperation({
    summary: 'Horários livres do médico para um exame numa data',
  })
  @ApiOkResponse({ type: AvailabilityResponse })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Parâmetros ou data inválidos',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Médico ou exame inexistente',
  })
  getAvailability(
    @Param() { doctorId }: DoctorIdParam,
    @Query() { examId, date }: AvailabilityQuery,
  ): Promise<AvailabilityResponse> {
    return this.availabilityService.getAvailability(doctorId, examId, date);
  }
}
