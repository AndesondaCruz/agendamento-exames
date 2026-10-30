import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../common/cache/cache.service.js';

interface HealthStatus {
  status: 'ok';
  database: 'up';
  cache: { store: 'redis' | 'memory'; status: 'up' | 'down' };
}

/**
 * Usado pelo Docker (healthcheck) e pela plataforma de deploy para saber se
 * a instância está pronta. Checa o banco de verdade (SELECT 1): uma API que
 * responde mas não alcança o banco NÃO está saudável.
 *
 * O cache aparece só como informação: com o Redis fora a API continua
 * correta (só mais lenta), então ela NÃO deve ser tirada do ar por isso.
 */
@ApiTags('Infra')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Status da API, do banco e do cache' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        database: 'up',
        cache: { store: 'redis', status: 'up' },
      },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Banco inacessível' })
  async check(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }

    return {
      status: 'ok',
      database: 'up',
      cache: {
        store: this.cache.storeKind,
        status: (await this.cache.isHealthy()) ? 'up' : 'down',
      },
    };
  }
}
