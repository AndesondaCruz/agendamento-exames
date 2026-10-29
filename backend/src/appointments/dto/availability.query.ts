import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';

export class DoctorIdParam {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'doctorId deve ser um número inteiro.' })
  @Min(1, { message: 'doctorId deve ser maior que zero.' })
  doctorId: number;
}

export class AvailabilityQuery {
  @ApiProperty({
    example: 7,
    description: 'Id do exame (define a duração dos horários)',
  })
  @Type(() => Number)
  @IsInt({ message: 'examId deve ser um número inteiro.' })
  @Min(1, { message: 'examId deve ser maior que zero.' })
  examId: number;

  @ApiProperty({
    example: '2030-01-07',
    description: 'Data no fuso da clínica (YYYY-MM-DD)',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date deve estar no formato YYYY-MM-DD.',
  })
  date: string;
}
