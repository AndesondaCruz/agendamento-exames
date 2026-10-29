import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Env } from '../config/env.js';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { isExclusionViolation } from '../common/errors/postgres-errors.js';
import { Clock } from '../common/time/clock.js';
import {
  clinicDateOf,
  formatMinutes,
  minutesSinceDayStart,
  parseClinicDay,
} from '../common/time/clinic-calendar.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { ExamsService } from '../exams/exams.service.js';
import { generateSlots } from './domain/slot-generator.js';
import { AppointmentResponse } from './dto/appointment.response.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import {
  Appointment,
  APPOINTMENT_NO_OVERLAP_CONSTRAINT,
} from './entities/appointment.entity.js';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  private readonly timezone: string;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly doctorsService: DoctorsService,
    private readonly examsService: ExamsService,
    private readonly clock: Clock,
    config: ConfigService<Env, true>,
  ) {
    this.timezone = config.get('CLINIC_TIMEZONE', { infer: true });
  }

  /**
   * Cria um agendamento. O back-end revalida TUDO, mesmo que o front só
   * mostre horários válidos: a API pode ser chamada direto (curl, Postman).
   *
   * Validações em ordem (da mais barata para a mais cara):
   *  1. exame e médico existem               -> 404
   *  2. não está no passado                  -> 422 SLOT_IN_PAST
   *  3. cabe inteiro num turno do médico     -> 422 OUTSIDE_WORKING_HOURS
   *  4. está na grade de horários do exame   -> 422 SLOT_NOT_ON_GRID
   *  5. não sobrepõe outro agendamento       -> 409 SLOT_UNAVAILABLE
   *
   * A regra 5 NÃO é checada com um SELECT antes do INSERT: entre o SELECT e o
   * INSERT outra requisição poderia reservar o horário (race condition).
   * Quem garante é a exclusion constraint, atomicamente, dentro do Postgres.
   */
  async create(dto: CreateAppointmentDto): Promise<AppointmentResponse> {
    const [exam, doctor] = await Promise.all([
      this.examsService.findByIdOrFail(dto.examId),
      this.doctorsService.findByIdOrFail(dto.doctorId),
    ]);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + exam.durationMinutes * 60_000);

    if (startsAt.getTime() < this.clock.now().getTime()) {
      throw AppException.businessRule(
        ErrorCode.SLOT_IN_PAST,
        'Não é possível agendar em uma data e hora que já passou.',
      );
    }

    const day = parseClinicDay(
      clinicDateOf(startsAt, this.timezone),
      this.timezone,
    )!;
    const startMinute = minutesSinceDayStart(startsAt, day);
    const shifts = (
      await this.doctorsService.findShifts(doctor.id, day.isoWeekday)
    ).map((shift) => ({ start: shift.startMinute, end: shift.endMinute }));

    const fitsInAShift = shifts.some(
      (shift) =>
        startMinute >= shift.start &&
        startMinute + exam.durationMinutes <= shift.end,
    );
    if (!fitsInAShift) {
      throw AppException.businessRule(
        ErrorCode.OUTSIDE_WORKING_HOURS,
        `${doctor.name} não atende neste dia/horário, ou o exame (${exam.durationMinutes} min) não cabe inteiro no turno.`,
      );
    }

    const grid = generateSlots({
      shifts,
      durationMinutes: exam.durationMinutes,
    });
    if (!grid.includes(startMinute)) {
      throw AppException.businessRule(
        ErrorCode.SLOT_NOT_ON_GRID,
        `Horário fora da grade deste exame. Horários possíveis no dia: ${grid
          .map(formatMinutes)
          .join(', ')}.`,
      );
    }

    try {
      const appointment = await this.appointmentsRepository.save(
        this.appointmentsRepository.create({
          patientName: dto.patientName,
          examId: exam.id,
          doctorId: doctor.id,
          startsAt,
          endsAt,
        }),
      );

      this.logger.log(
        `Agendamento ${appointment.id} criado: médico ${doctor.id}, exame ${exam.id}, ${startsAt.toISOString()}`,
      );

      return AppointmentResponse.from(appointment, exam, doctor, this.timezone);
    } catch (error) {
      if (isExclusionViolation(error, APPOINTMENT_NO_OVERLAP_CONSTRAINT)) {
        throw AppException.conflict(
          ErrorCode.SLOT_UNAVAILABLE,
          'Este horário não está mais disponível para este médico. Escolha outro.',
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<AppointmentResponse> {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: { exam: true, doctor: true },
    });

    if (!appointment) {
      throw AppException.notFound(
        ErrorCode.NOT_FOUND,
        `Agendamento ${id} não encontrado.`,
      );
    }

    return AppointmentResponse.from(
      appointment,
      appointment.exam,
      appointment.doctor,
      this.timezone,
    );
  }
}
