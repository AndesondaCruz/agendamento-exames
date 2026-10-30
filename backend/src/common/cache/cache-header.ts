import type { Response } from 'express';
import type { Cached } from './cache.service.js';

/**
 * Header de diagnóstico: mostra se a resposta veio do cache. Comum em CDNs e
 * proxies (Cloudflare, Varnish, Nginx). Ajuda a depurar e a demonstrar o cache.
 */
export const CACHE_HEADER = 'X-Cache';

/** Documentação do header no Swagger (`@ApiOkResponse({ headers })`). */
export const cacheHeaderDoc = {
  [CACHE_HEADER]: {
    description:
      'HIT: resposta veio do cache. MISS: veio do banco e foi guardada. BYPASS: cache não usado de propósito.',
    schema: { type: 'string', enum: ['HIT', 'MISS', 'BYPASS'] },
  },
};

/** Escreve o header e devolve só o valor, para o controller retornar. */
export function withCacheHeader<T>(res: Response, cached: Cached<T>): T {
  res.setHeader(CACHE_HEADER, cached.cache);
  return cached.value;
}
