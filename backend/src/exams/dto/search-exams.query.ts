import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchExamsQuery {
  @ApiPropertyOptional({
    description:
      'Trecho do nome. Ignora maiúsculas e acentos ("ressonancia" encontra "Ressonância").',
    example: 'ressonancia',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'search deve ter no máximo 100 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;
}
