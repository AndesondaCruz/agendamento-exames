import { ApiProperty } from '@nestjs/swagger';
import { ExamResponse } from '../../exams/dto/exam.response.js';

export const UnavailableReason = {
  PAST_DATE: 'PAST_DATE',
  NOT_WORKING_DAY: 'NOT_WORKING_DAY',
  NO_AVAILABLE_SLOTS: 'NO_AVAILABLE_SLOTS',
} as const;

export type UnavailableReason =
  (typeof UnavailableReason)[keyof typeof UnavailableReason];

export class SlotResponse {
  @ApiProperty({ example: '08:00', description: 'Horário local da clínica' })
  time: string;

  @ApiProperty({ example: '2030-01-07T08:00:00.000-03:00' })
  startsAt: string;

  @ApiProperty({ example: '2030-01-07T08:40:00.000-03:00' })
  endsAt: string;
}

class DoctorSummary {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dra. Helena Marques' })
  name: string;
}

export class AvailabilityResponse {
  @ApiProperty({ example: '2030-01-07' })
  date: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone: string;

  @ApiProperty({ type: DoctorSummary })
  doctor: DoctorSummary;

  @ApiProperty({ type: ExamResponse })
  exam: ExamResponse;

  @ApiProperty({ type: [SlotResponse] })
  slots: SlotResponse[];

  @ApiProperty({
    enum: Object.values(UnavailableReason),
    nullable: true,
    description:
      'Quando não há horários, explica o motivo (o front mostra uma mensagem específica para cada caso).',
  })
  unavailableReason: UnavailableReason | null;
}
