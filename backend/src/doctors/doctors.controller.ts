import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  cacheHeaderDoc,
  withCacheHeader,
} from '../common/cache/cache-header.js';
import { DoctorsService } from './doctors.service.js';
import { DoctorResponse } from './dto/doctor.response.js';

@ApiTags('Médicos')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os médicos com seus turnos semanais' })
  @ApiOkResponse({ type: [DoctorResponse], headers: cacheHeaderDoc })
  async findAll(
    @Res({ passthrough: true }) res: Response,
  ): Promise<DoctorResponse[]> {
    return withCacheHeader(res, await this.doctorsService.listCatalog());
  }
}
