import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/http/error-response.dto.js';
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
  @ApiOkResponse({ type: [ExamResponse] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  async search(@Query() query: SearchExamsQuery): Promise<ExamResponse[]> {
    const exams = await this.examsService.search(query.search);
    return exams.map((exam) => ExamResponse.from(exam));
  }
}
