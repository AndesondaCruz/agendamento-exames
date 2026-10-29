import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/http/error-response.dto.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentResponse } from './dto/appointment.response.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';

@ApiTags('Agendamentos')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agenda um exame com um médico em um horário disponível',
  })
  @ApiCreatedResponse({ type: AppointmentResponse })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Corpo inválido (VALIDATION_ERROR)',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'EXAM_NOT_FOUND / DOCTOR_NOT_FOUND',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'SLOT_UNAVAILABLE: o horário foi ocupado (inclusive por uma requisição simultânea)',
  })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'SLOT_IN_PAST / OUTSIDE_WORKING_HOURS / SLOT_NOT_ON_GRID',
  })
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponse> {
    return this.appointmentsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um agendamento' })
  @ApiOkResponse({ type: AppointmentResponse })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.findById(id);
  }
}
