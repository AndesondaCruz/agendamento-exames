import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheKeys, CacheTtl } from '../common/cache/cache-keys.js';
import { CacheService, type Cached } from '../common/cache/cache.service.js';
import { AppException } from '../common/errors/app.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { ExamResponse } from './dto/exam.response.js';
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
    private readonly cache: CacheService,
  ) {}

  /**
   * Busca do catálogo com cache. "Ressonância", " ressonância " e
   * "RESSONÂNCIA" viram a mesma chave: a busca já ignora maiúsculas (ILIKE),
   * então o resultado é idêntico e não faz sentido guardar três cópias.
   */
  async searchCatalog(term?: string): Promise<Cached<ExamResponse[]>> {
    const normalized = (term ?? '').trim().toLowerCase();
    const version = await this.cache.version(CacheKeys.catalogVersion);

    return this.cache.getOrLoad(
      CacheKeys.examSearch(version, normalized),
      CacheTtl.CATALOG,
      async () => {
        const exams = await this.search(normalized || undefined);
        return exams.map((exam) => ExamResponse.from(exam));
      },
    );
  }

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
