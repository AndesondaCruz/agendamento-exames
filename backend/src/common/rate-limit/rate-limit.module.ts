import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../config/env.js';
import { AppThrottlerGuard } from './app-throttler.guard.js';
import {
  RATE_LIMIT_BUCKET_KEY,
  RATE_LIMIT_BUCKETS,
  RATE_LIMIT_CONFIG,
  type RateLimitBucket,
  type RateLimitConfig,
} from './rate-limit.js';

@Module({
  providers: [
    {
      provide: RATE_LIMIT_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): RateLimitConfig => ({
        windowSeconds: config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true }),
        limits: {
          create: config.get('RATE_LIMIT_CREATE', { infer: true }),
          lookup: config.get('RATE_LIMIT_LOOKUP', { infer: true }),
          cancel: config.get('RATE_LIMIT_CANCEL', { infer: true }),
        },
      }),
    },
  ],
  exports: [RATE_LIMIT_CONFIG],
})
class RateLimitConfigModule {}

/**
 * Rate limiting por IP, com o contador em MEMÓRIA do processo.
 *
 * Limitação conhecida: com várias instâncias da API, cada uma conta
 * sozinha, e o limite efetivo vira (limite x instâncias). Hoje há uma só;
 * para várias, o contador teria de ficar no Redis.
 *
 * O guard é global, mas só limita as rotas marcadas com @RateLimit(balde):
 * cada balde é um "throttler" que se ignora quando a rota é de outro balde.
 * O guard roda ANTES da validação do corpo, então requisições inválidas
 * também gastam o limite (é o que se quer contra tentativas em massa).
 */
@Module({
  imports: [
    RateLimitConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [RateLimitConfigModule],
      inject: [RATE_LIMIT_CONFIG, Reflector],
      useFactory: (config: RateLimitConfig, reflector: Reflector) => ({
        // Os cabeçalhos X-RateLimit-* do pacote levam o nome do balde no
        // sufixo; o Retry-After padrão é emitido pelo AppThrottlerGuard.
        setHeaders: false,
        errorMessage: (_context, detail) =>
          `Muitas tentativas. Aguarde ${detail.timeToBlockExpire} segundos e tente novamente.`,
        throttlers: RATE_LIMIT_BUCKETS.map((bucket) => ({
          name: bucket,
          ttl: config.windowSeconds * 1000, // o pacote conta em milissegundos
          limit: config.limits[bucket],
          skipIf: (context) =>
            reflector.getAllAndOverride<RateLimitBucket | undefined>(
              RATE_LIMIT_BUCKET_KEY,
              [context.getHandler(), context.getClass()],
            ) !== bucket,
        })),
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class RateLimitModule {}
