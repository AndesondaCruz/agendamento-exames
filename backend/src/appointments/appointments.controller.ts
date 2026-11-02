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
import { RateLimit } from '../common/rate-limit/rate-limit.js';
import { AppointmentsService } from './appointments.service.js';
import { AppointmentResponse } from './dto/appointment.response.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import {
  CancelAppointmentDto,
  LookupAppointmentDto,
} from './dto/manage-appointment.dto.js';

const PATH = '/api/appointments';

const LOOKUP_NOT_FOUND = {
  code: ErrorCode.NOT_FOUND,
  message:
    'Nenhum agendamento encontrado com esse protocolo e CPF. Confira os dados.',
};

const TOO_MANY_REQUESTS_DESCRIPTION =
  'Limite de requisições por IP excedido. O cabeçalho Retry-After diz em quantos segundos tentar de novo.';

const TOO_MANY_REQUESTS = {
  code: ErrorCode.TOO_MANY_REQUESTS,
  message: 'Muitas tentativas. Aguarde 42 segundos e tente novamente.',
};

@ApiTags('Agendamentos')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RateLimit('create')
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
  @ApiErrorResponse(429, PATH, TOO_MANY_REQUESTS_DESCRIPTION, [
    TOO_MANY_REQUESTS,
  ])
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentResponse> {
    return this.appointmentsService.create(dto);
  }

  @Post('lookup')
  @RateLimit('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consulta um agendamento pelo protocolo e CPF',
    description:
      'POST e não GET: o CPF vai no corpo, para não ficar registrado em URLs e logs.',
  })
  @ApiOkResponse({ type: AppointmentResponse })
  @ApiErrorResponse(400, `${PATH}/lookup`, 'Protocolo ou CPF inválidos', [
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos na requisição.',
      details: [{ field: 'patientCpf', messages: ['patientCpf inválido.'] }],
    },
  ])
  @ApiErrorResponse(
    404,
    `${PATH}/lookup`,
    'Protocolo e CPF não correspondem a um agendamento',
    [LOOKUP_NOT_FOUND],
  )
  @ApiErrorResponse(429, `${PATH}/lookup`, TOO_MANY_REQUESTS_DESCRIPTION, [
    TOO_MANY_REQUESTS,
  ])
  lookup(@Body() dto: LookupAppointmentDto): Promise<AppointmentResponse> {
    return this.appointmentsService.lookup(dto.protocol, dto.patientCpf);
  }

  @Post(':id/cancel')
  @RateLimit('cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancela um agendamento e libera o horário',
    description:
      'Exige o CPF do paciente. Não apaga o registro: o status vira CANCELLED. Cancelar de novo devolve o mesmo resultado (idempotente).',
  })
  @ApiOkResponse({ type: AppointmentResponse })
  @ApiErrorResponse(400, `${PATH}/{id}/cancel`, 'Id ou CPF inválidos', [
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos na requisição.',
      details: [{ field: 'patientCpf', messages: ['patientCpf inválido.'] }],
    },
  ])
  @ApiErrorResponse(
    404,
    `${PATH}/{id}/cancel`,
    'Agendamento inexistente ou CPF não confere',
    [LOOKUP_NOT_FOUND],
  )
  @ApiErrorResponse(
    422,
    `${PATH}/{id}/cancel`,
    'O exame já começou ou já passou',
    [
      {
        code: ErrorCode.CANCELLATION_NOT_ALLOWED,
        message:
          'Não é possível cancelar um exame que já começou ou já passou.',
      },
    ],
  )
  @ApiErrorResponse(429, `${PATH}/{id}/cancel`, TOO_MANY_REQUESTS_DESCRIPTION, [
    TOO_MANY_REQUESTS,
  ])
  cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponse> {
    return this.appointmentsService.cancel(id, dto.patientCpf);
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
