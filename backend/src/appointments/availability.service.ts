import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
import type { Env } from '../config/env.js';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { Clock } from '../common/time/clock.js';
import {
  clinicDateOf,
  formatMinutes,
  instantAtMinute,
  minutesSinceDayStart,
  parseClinicDay,
  toClinicIso,
  type ClinicDay,
} from '../common/time/clinic-calendar.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { ExamResponse } from '../exams/dto/exam.response.js';
import { ExamsService } from '../exams/exams.service.js';
import { generateSlots, type MinuteRange } from './domain/slot-generator.js';
import {
  AvailabilityResponse,
  UnavailableReason,
} from './dto/availability.response.js';
import { Appointment } from './entities/appointment.entity.js';

@Injectable()
export class AvailabilityService {
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
   * Fluxo: valida a data -> carrega médico e exame (404 se não existirem) ->
   * descarta datas passadas e dias sem expediente -> busca os agendamentos
   * do dia -> delega a regra para a função pura generateSlots.
   */
  async getAvailability(
    doctorId: number,
    examId: number,
    date: string,
  ): Promise<AvailabilityResponse> {
    const day = parseClinicDay(date, this.timezone);
    if (!day) {
      throw AppException.badRequest(
        ErrorCode.INVALID_DATE,
        `Data inválida: "${date}".`,
      );
    }

    const [doctor, exam] = await Promise.all([
      this.doctorsService.findByIdOrFail(doctorId),
      this.examsService.findByIdOrFail(examId),
    ]);

    const response = (
      slots: AvailabilityResponse['slots'],
      unavailableReason: UnavailableReason | null,
    ): AvailabilityResponse => ({
      date,
      timezone: this.timezone,
      doctor: { id: doctor.id, name: doctor.name },
      exam: ExamResponse.from(exam),
      slots,
      unavailableReason,
    });

    const now = this.clock.now();
    const today = clinicDateOf(now, this.timezone);

    // Comparação lexicográfica é segura no formato YYYY-MM-DD.
    if (date < today) {
      return response([], UnavailableReason.PAST_DATE);
    }

    const shifts = await this.doctorsService.findShifts(
      doctor.id,
      day.isoWeekday,
    );
    if (shifts.length === 0) {
      return response([], UnavailableReason.NOT_WORKING_DAY);
    }

    const busy = await this.findBusyRanges(doctor.id, day);

    const slotMinutes = generateSlots({
      shifts: shifts.map((shift) => ({
        start: shift.startMinute,
        end: shift.endMinute,
      })),
      durationMinutes: exam.durationMinutes,
      busy,
      notBefore: date === today ? minutesSinceDayStart(now, day) : undefined,
    });

    const slots = slotMinutes.map((minute) => ({
      time: formatMinutes(minute),
      startsAt: toClinicIso(
        instantAtMinute(day, minute, this.timezone),
        this.timezone,
      ),
      endsAt: toClinicIso(
        instantAtMinute(day, minute + exam.durationMinutes, this.timezone),
        this.timezone,
      ),
    }));

    return response(
      slots,
      slots.length ? null : UnavailableReason.NO_AVAILABLE_SLOTS,
    );
  }

  /** Agendamentos do médico que tocam o dia, convertidos para minutos do dia. */
  private async findBusyRanges(
    doctorId: number,
    day: ClinicDay,
  ): Promise<MinuteRange[]> {
    const appointments = await this.appointmentsRepository.find({
      select: { startsAt: true, endsAt: true },
      where: {
        doctorId,
        startsAt: LessThan(day.end),
        endsAt: MoreThan(day.start),
      },
    });

    return appointments.map((appointment) => ({
      start: minutesSinceDayStart(appointment.startsAt, day),
      end: minutesSinceDayStart(appointment.endsAt, day),
    }));
  }
}
