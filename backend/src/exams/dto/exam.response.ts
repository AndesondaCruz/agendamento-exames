import { ApiProperty } from '@nestjs/swagger';
import type { Exam } from '../entities/exam.entity.js';

export class ExamResponse {
  @ApiProperty({ example: 20 })
  id: number;

  @ApiProperty({ example: 'Ressonância Magnética de Crânio' })
  name: string;

  @ApiProperty({ example: 40, enum: [20, 30, 40] })
  durationMinutes: number;

  /**
   * Mapeamento explícito entidade -> resposta: a API não expõe a entidade
   * diretamente, então mudanças no banco não vazam para o contrato HTTP.
   */
  static from(exam: Exam): ExamResponse {
    return {
      id: exam.id,
      name: exam.name,
      durationMinutes: exam.durationMinutes,
    };
  }
}
