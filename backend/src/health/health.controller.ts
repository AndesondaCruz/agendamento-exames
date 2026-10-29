import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Usado pelo Docker (healthcheck) e pela plataforma de deploy para saber se
 * a instância está pronta. Checa o banco de verdade (SELECT 1): uma API que
 * responde mas não alcança o banco NÃO está saudável.
 */
@ApiTags('Infra')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Status da API e da conexão com o banco' })
  @ApiOkResponse({ schema: { example: { status: 'ok', database: 'up' } } })
  @ApiServiceUnavailableResponse({ description: 'Banco inacessível' })
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }
  }
}
