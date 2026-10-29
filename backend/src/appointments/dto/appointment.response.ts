import { ApiProperty } from '@nestjs/swagger';
import { toClinicIso } from '../../common/time/clinic-calendar.js';
import type { Doctor } from '../../doctors/entities/doctor.entity.js';
import { ExamResponse } from '../../exams/dto/exam.response.js';
import type { Exam } from '../../exams/entities/exam.entity.js';
import type { Appointment } from '../entities/appointment.entity.js';

class AppointmentDoctor {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dra. Helena Marques' })
  name: string;

  @ApiProperty({ example: 'CRM-MG 11111' })
  crm: string;
}

export class AppointmentResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maria da Silva' })
  patientName: string;

  @ApiProperty({ example: '2030-01-07T08:00:00.000-03:00' })
  startsAt: string;

  @ApiProperty({
    example: '2030-01-07T08:40:00.000-03:00',
    description: 'Derivado: início + duração',
  })
  endsAt: string;

  @ApiProperty({ type: ExamResponse })
  exam: ExamResponse;

  @ApiProperty({ type: AppointmentDoctor })
  doctor: AppointmentDoctor;

  @ApiProperty()
  createdAt: string;

  static from(
    appointment: Appointment,
    exam: Exam,
    doctor: Doctor,
    timezone: string,
  ): AppointmentResponse {
    return {
      id: appointment.id,
      patientName: appointment.patientName,
      startsAt: toClinicIso(appointment.startsAt, timezone),
      endsAt: toClinicIso(appointment.endsAt, timezone),
      exam: ExamResponse.from(exam),
      doctor: { id: doctor.id, name: doctor.name, crm: doctor.crm },
      createdAt: appointment.createdAt.toISOString(),
    };
  }
}
