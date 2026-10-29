import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class FieldErrorDto {
  @ApiProperty({ example: 'startsAt' })
  field: string;

  @ApiProperty({
    example: [
      'startsAt deve informar o fuso (ex.: 2030-01-07T08:00:00-03:00).',
    ],
  })
  messages: string[];
}

/**
 * Formato único de erro da API (o schema). Os EXEMPLOS de cada endpoint
 * ficam no decorator ApiErrorResponse, com os códigos que ele realmente
 * devolve.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Status HTTP', example: 400 })
  statusCode: number;

  @ApiProperty({
    description:
      'Código estável do erro (use este campo, não a mensagem, para decidir o que fazer)',
    example: 'VALIDATION_ERROR',
  })
  code: string;

  @ApiProperty({
    description: 'Mensagem legível',
    example: 'Dados inválidos na requisição.',
  })
  message: string;

  @ApiPropertyOptional({
    type: [FieldErrorDto],
    description: 'Presente em VALIDATION_ERROR: campos inválidos e os motivos',
  })
  details?: FieldErrorDto[];

  @ApiProperty({ example: '/api/appointments' })
  path: string;

  @ApiProperty({ example: '2030-01-07T13:00:00.000Z' })
  timestamp: string;
}
