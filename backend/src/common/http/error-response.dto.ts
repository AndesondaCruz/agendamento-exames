import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FieldErrorDto {
  @ApiProperty({ example: 'startsAt' })
  field: string;

  @ApiProperty({ example: ['startsAt deve ser uma data ISO 8601 com fuso.'] })
  messages: string[];
}

/** Documenta no Swagger o formato único de erro da API. */
export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'SLOT_UNAVAILABLE' })
  code: string;

  @ApiProperty({
    example: 'Este horário acabou de ser reservado. Escolha outro.',
  })
  message: string;

  @ApiPropertyOptional({ type: [FieldErrorDto] })
  details?: FieldErrorDto[];

  @ApiProperty({ example: '/api/appointments' })
  path: string;

  @ApiProperty({ example: '2030-01-07T11:00:00.000Z' })
  timestamp: string;
}
