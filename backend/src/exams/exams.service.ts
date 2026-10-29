import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { Exam } from './entities/exam.entity.js';

/** Escapa curingas do LIKE: "%" e "_" digitados pelo usuário viram texto literal. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examsRepository: Repository<Exam>,
  ) {}

  /**
   * Busca por trecho do nome, ignorando maiúsculas (ILIKE) e acentos
   * (extensão unaccent). O termo vai como PARÂMETRO (:pattern), nunca
   * concatenado na string SQL: isso impede SQL Injection.
   */
  search(term?: string): Promise<Exam[]> {
    // Ordena ignorando maiúsculas e acentos: resultado igual em qualquer
    // ambiente, sem depender da collation configurada no banco.
    const query = this.examsRepository
      .createQueryBuilder('exam')
      .orderBy('unaccent(lower(exam.name))', 'ASC');

    if (term) {
      query.where('unaccent(exam.name) ILIKE unaccent(:pattern)', {
        pattern: `%${escapeLike(term)}%`,
      });
    }

    return query.getMany();
  }

  async findByIdOrFail(id: number): Promise<Exam> {
    const exam = await this.examsRepository.findOneBy({ id });
    if (!exam) {
      throw AppException.notFound(
        ErrorCode.EXAM_NOT_FOUND,
        `Exame ${id} não encontrado.`,
      );
    }
    return exam;
  }
}
