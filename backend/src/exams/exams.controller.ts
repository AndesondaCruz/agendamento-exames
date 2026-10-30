import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  cacheHeaderDoc,
  withCacheHeader,
} from '../common/cache/cache-header.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { ApiErrorResponse } from '../common/http/api-error.decorator.js';
import { ExamResponse } from './dto/exam.response.js';
import { SearchExamsQuery } from './dto/search-exams.query.js';
import { ExamsService } from './exams.service.js';

@ApiTags('Exames')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @ApiOperation({
    summary: 'Busca exames pelo nome (sem a busca, lista o catálogo inteiro)',
  })
  @ApiOkResponse({ type: [ExamResponse], headers: cacheHeaderDoc })
  @ApiErrorResponse(400, '/api/exams', 'Termo de busca inválido', [
    {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Dados inválidos na requisição.',
      details: [
        {
          field: 'search',
          messages: ['search deve ter no máximo 100 caracteres.'],
        },
      ],
    },
  ])
  // passthrough: o Nest continua serializando o retorno; só usamos `res`
  // para escrever o header X-Cache.
  async search(
    @Query() query: SearchExamsQuery,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExamResponse[]> {
    return withCacheHeader(
      res,
      await this.examsService.searchCatalog(query.search),
    );
  }
}
