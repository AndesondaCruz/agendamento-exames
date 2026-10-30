import {
  Global,
  Injectable,
  Logger,
  Module,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { CacheKeys } from './cache-keys.js';
import { CacheService } from './cache.service.js';
import { CacheStore, MemoryCacheStore } from './cache-store.js';
import { RedisCacheStore } from './redis-cache-store.js';

/**
 * O catálogo só muda quando o seed roda, e o seed roda no entrypoint do
 * container, ANTES de a API subir. Então cada inicialização da API sobe a
 * versão do catálogo: depois de um deploy, ninguém recebe catálogo antigo.
 */
@Injectable()
class CatalogCacheReset implements OnApplicationBootstrap {
  constructor(private readonly cache: CacheService) {}

  onApplicationBootstrap(): Promise<void> {
    return this.cache.bumpVersion(CacheKeys.catalogVersion);
  }
}

@Global()
@Module({
  providers: [
    {
      // Com REDIS_URL: Redis (compartilhado, sobrevive a deploys).
      // Sem REDIS_URL: memória do processo. A aplicação funciona nos dois casos.
      provide: CacheStore,
      inject: [ConfigService],
      useFactory: async (
        config: ConfigService<Env, true>,
      ): Promise<CacheStore> => {
        const logger = new Logger('CacheModule');
        const redisUrl = config.get('REDIS_URL', { infer: true });

        if (!redisUrl) {
          logger.log('Cache em memória (REDIS_URL não definida).');
          return new MemoryCacheStore();
        }

        const store = new RedisCacheStore(redisUrl);
        await store.waitUntilReady();
        return store;
      },
    },
    CacheService,
    CatalogCacheReset,
  ],
  exports: [CacheService],
})
export class CacheModule {}
