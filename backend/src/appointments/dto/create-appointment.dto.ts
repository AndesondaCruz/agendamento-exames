import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Exige fuso explícito ("Z" ou "-03:00"): "2030-01-07T08:00" sozinho é ambíguo. */
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

/** Letras (inclusive acentuadas), espaço, apóstrofo, ponto e hífen. */
const PERSON_NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u;

export class CreateAppointmentDto {
  @ApiProperty({ example: 'Maria da Silva', minLength: 3, maxLength: 120 })
  @IsString({ message: 'patientName deve ser um texto.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @MinLength(3, { message: 'patientName deve ter pelo menos 3 caracteres.' })
  @MaxLength(120, { message: 'patientName deve ter no máximo 120 caracteres.' })
  @Matches(PERSON_NAME, {
    message:
      'patientName deve conter apenas letras, espaços, apóstrofo, ponto ou hífen.',
  })
  patientName: string;

  @ApiProperty({ example: 7 })
  @IsInt({ message: 'examId deve ser um número inteiro.' })
  @Min(1, { message: 'examId deve ser maior que zero.' })
  examId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'doctorId deve ser um número inteiro.' })
  @Min(1, { message: 'doctorId deve ser maior que zero.' })
  doctorId: number;

  @ApiProperty({
    example: '2030-01-07T08:00:00-03:00',
    description:
      'Início em ISO 8601 COM fuso. Deve ser um dos horários da disponibilidade.',
  })
  @IsISO8601(
    { strict: true },
    { message: 'startsAt deve ser uma data ISO 8601 válida.' },
  )
  @Matches(ISO_WITH_OFFSET, {
    message: 'startsAt deve informar o fuso (ex.: 2030-01-07T08:00:00-03:00).',
  })
  startsAt: string;
}
