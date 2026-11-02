import { SetMetadata } from '@nestjs/common';

/**
 * Cada rota limitada pertence a um "balde" com contador e limite próprios:
 * consultar não gasta o limite de cancelar, e o contador é por IP.
 */
export const RATE_LIMIT_BUCKETS = ['create', 'lookup', 'cancel'] as const;
export type RateLimitBucket = (typeof RATE_LIMIT_BUCKETS)[number];

export const RATE_LIMIT_BUCKET_KEY = 'rateLimitBucket';

/** Marca a rota como limitada. Rota sem este decorator não tem limite. */
export const RateLimit = (bucket: RateLimitBucket) =>
  SetMetadata(RATE_LIMIT_BUCKET_KEY, bucket);

export interface RateLimitConfig {
  windowSeconds: number;
  limits: Record<RateLimitBucket, number>;
}

/**
 * Os limites passam por este token (e não direto pelo ConfigService) para os
 * testes e2e poderem trocá-los por valores baixos e exercitar o limitador
 * REAL, sem desligá-lo.
 */
export const RATE_LIMIT_CONFIG = Symbol('RATE_LIMIT_CONFIG');
