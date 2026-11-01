import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { ExamsService } from '../exams/exams.service.js';
import { AvailabilityService } from './availability.service.js';
import { generateSlots, overlaps } from './domain/slot-generator.js';
import { AppointmentResponse } from './dto/appointment.response.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import {
  Appointment,
  APPOINTMENT_NO_OVERLAP_CONSTRAINT,
} from './entities/appointment.entity.js';

/** Conflito detectado pela regra do código (camada 1), dentro da transação. */
class SlotTakenError extends Error {
  constructor(readonly layer: 'código') {
    super('Horário ocupado');
  }
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);
  private readonly timezone: string;

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly doctorsService: DoctorsService,
    private readonly examsService: ExamsService,
    private readonly clock: Clock,
    private readonly availabilityService: AvailabilityService,
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
   * A regra 5 tem DUAS camadas de defesa:
   *  - no código: dentro de uma transação, trava a linha do médico
   *    (SELECT ... FOR UPDATE) e só então confere a sobreposição. Pedidos
   *    para o MESMO médico passam a ser processados um de cada vez, então
   *    não existe a janela entre "consultar" e "gravar". Funciona em
   *    qualquer banco relacional que tenha FOR UPDATE (Postgres, MySQL...);
   *  - no banco: a exclusion constraint recusa a sobreposição mesmo que
   *    algo escape do código (um bug, um script, outra aplicação).
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

    const date = clinicDateOf(startsAt, this.timezone);
    const day = parseClinicDay(date, this.timezone)!;
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

    const requested = {
      start: startMinute,
      end: startMinute + exam.durationMinutes,
    };

    try {
      const appointment = await this.dataSource.transaction(async (manager) => {
        // Camada 1, no código. O lock dura até o fim da transação: um
        // segundo pedido para o mesmo médico espera aqui, e quando segue
        // já enxerga o agendamento que o primeiro gravou.
        await manager
          .getRepository(Doctor)
          .createQueryBuilder('doctor')
          .setLock('pessimistic_write')
          .where('doctor.id = :id', { id: doctor.id })
          .getOne();

        // A MESMA consulta e a MESMA função `overlaps` da disponibilidade:
        // o que a tela mostra como livre é exatamente o que a API aceita.
        const busy = await this.availabilityService.findBusyRanges(
          doctor.id,
          day,
          manager,
        );
        if (busy.some((range) => overlaps(requested, range))) {
          throw new SlotTakenError('código');
        }

        return manager.save(
          manager.create(Appointment, {
            patientName: dto.patientName,
            patientCpf: dto.patientCpf,
            patientBirthDate: dto.patientBirthDate,
            patientPhone: dto.patientPhone,
            patientEmail: dto.patientEmail ?? null,
            examId: exam.id,
            doctorId: doctor.id,
            startsAt,
            endsAt,
          }),
        );
      });

      this.logger.log(
        `Agendamento ${appointment.id} criado: médico ${doctor.id}, exame ${exam.id}, ${startsAt.toISOString()}`,
      );

      // Depois do commit: a próxima consulta de disponibilidade já vem do banco.
      await this.availabilityService.invalidate(doctor.id, date);

      return AppointmentResponse.from(appointment, exam, doctor, this.timezone);
    } catch (error) {
      // Camada 2, no banco: a constraint barra o que escapar da camada 1.
      const layer =
        error instanceof SlotTakenError
          ? error.layer
          : isExclusionViolation(error, APPOINTMENT_NO_OVERLAP_CONSTRAINT)
            ? 'banco'
            : null;

      if (layer) {
        this.logger.warn(
          `Conflito de horário barrado pela regra do ${layer}: médico ${doctor.id}, ${startsAt.toISOString()}`,
        );
        // Se houve conflito, o paciente viu uma agenda desatualizada.
        // Invalida por garantia antes de ele escolher outro horário.
        await this.availabilityService.invalidate(doctor.id, date);
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
