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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorCode } from '../common/errors/error-codes.js';
import { ApiErrorResponse } from '../common/http/api-error.decorator.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentResponse } from './dto/appointment.response.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';

const PATH = '/api/appointments';

@ApiTags('Agendamentos')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agenda um exame com um médico em um horário disponível',
    description:
      'O término é derivado (início + duração do exame). Requisições simultâneas para horários que se sobrepõem: apenas uma é aceita; as demais recebem 409.',
  })
  @ApiCreatedResponse({ type: AppointmentResponse })
  @ApiErrorResponse(400, PATH, 'Corpo inválido', [
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos na requisição.',
      details: [
        {
          field: 'startsAt',
          messages: [
            'startsAt deve informar o fuso (ex.: 2030-01-07T08:00:00-03:00).',
          ],
        },
      ],
    },
  ])
  @ApiErrorResponse(404, PATH, 'Exame ou médico inexistente', [
    { code: ErrorCode.EXAM_NOT_FOUND, message: 'Exame 999 não encontrado.' },
    { code: ErrorCode.DOCTOR_NOT_FOUND, message: 'Médico 99 não encontrado.' },
  ])
  @ApiErrorResponse(
    409,
    PATH,
    'O horário foi ocupado (inclusive por uma requisição simultânea)',
    [
      {
        code: ErrorCode.SLOT_UNAVAILABLE,
        message:
          'Este horário não está mais disponível para este médico. Escolha outro.',
      },
    ],
  )
  @ApiErrorResponse(
    422,
    PATH,
    'Requisição válida, mas viola uma regra de negócio',
    [
      {
        code: ErrorCode.SLOT_IN_PAST,
        message: 'Não é possível agendar em uma data e hora que já passou.',
      },
      {
        code: ErrorCode.OUTSIDE_WORKING_HOURS,
        message:
          'Dra. Helena Marques não atende neste dia/horário, ou o exame (40 min) não cabe inteiro no turno.',
      },
      {
        code: ErrorCode.SLOT_NOT_ON_GRID,
        message:
          'Horário fora da grade deste exame. Horários possíveis no dia: 08:00, 08:40, 09:20, 10:00, 10:40, 11:20.',
      },
    ],
  )
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponse> {
    return this.appointmentsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um agendamento' })
  @ApiOkResponse({ type: AppointmentResponse })
  @ApiErrorResponse(400, `${PATH}/abc`, 'Id malformado (não é UUID)', [
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed (uuid v4 is expected)',
    },
  ])
  @ApiErrorResponse(404, `${PATH}/{id}`, 'Agendamento inexistente', [
    {
      code: ErrorCode.NOT_FOUND,
      message: 'Agendamento 3f2a... não encontrado.',
    },
  ])
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.findById(id);
  }
}
