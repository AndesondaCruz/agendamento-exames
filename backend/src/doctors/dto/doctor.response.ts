import { ApiProperty } from '@nestjs/swagger';
import { formatMinutes } from '../../common/time/clinic-calendar.js';
import type { Doctor } from '../entities/doctor.entity.js';

export class ShiftResponse {
  @ApiProperty({
    example: 3,
    description: 'Dia da semana ISO: 1 = segunda ... 7 = domingo',
  })
  weekday: number;

  @ApiProperty({ example: '19:00' })
  start: string;

  @ApiProperty({ example: '22:00' })
  end: string;
}

export class DoctorResponse {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Dr. Thiago Fontes' })
  name: string;

  @ApiProperty({ example: 'CRM-MG 44444' })
  crm: string;

  @ApiProperty({
    example: [2, 3, 4, 5, 6],
    description:
      'Dias em que atende (o front usa para desabilitar os demais no calendário)',
  })
  workingWeekdays: number[];

  @ApiProperty({ type: [ShiftResponse] })
  shifts: ShiftResponse[];

  static from(doctor: Doctor): DoctorResponse {
    const shifts = [...(doctor.shifts ?? [])].sort(
      (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
    );

    return {
      id: doctor.id,
      name: doctor.name,
      crm: doctor.crm,
      workingWeekdays: [...new Set(shifts.map((shift) => shift.weekday))],
      shifts: shifts.map((shift) => ({
        weekday: shift.weekday,
        start: formatMinutes(shift.startMinute),
        end: formatMinutes(shift.endMinute),
      })),
    };
  }
}
