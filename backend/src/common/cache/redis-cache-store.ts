import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CacheStore } from './cache-store.js';

const ERROR_LOG_INTERVAL_MS = 30_000;

export interface RedisCacheStoreOptions {
  /** Prefixo de todas as chaves: permite dividir um Redis entre aplicações. */
  keyPrefix?: string;
  /** Tempo máximo de cada comando antes de desistir e ir ao banco. */
  commandTimeoutMs?: number;
}

/**
 * Cache no Redis, compartilhado por todas as instâncias da API.
 *
 * Configurado para FALHAR RÁPIDO: se o Redis cair, os comandos dão erro na
 * hora (sem fila de espera) e o CacheService segue direto para o Postgres.
 * Enquanto isso, o cliente tenta reconectar em segundo plano.
 */
export class RedisCacheStore extends CacheStore implements OnModuleDestroy {
  readonly kind = 'redis';
  private readonly logger = new Logger('RedisCache');
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private lastErrorLogAt = 0;

  constructor(url: string, options: RedisCacheStoreOptions = {}) {
    super();
    this.keyPrefix = options.keyPrefix ?? 'agendamento:';
    this.client = new Redis(url, {
      keyPrefix: this.keyPrefix,
      // Sem conexão = erro imediato, em vez de enfileirar e deixar a
      // requisição do usuário esperando o Redis voltar.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      commandTimeout: options.commandTimeoutMs ?? 250,
      connectTimeout: 2_000,
      // Reconexão em segundo plano: 0,5 s, 1 s, 1,5 s... até 5 s entre tentativas.
      retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
    });

    this.client.on('ready', () => this.logger.log('Conectado ao Redis.'));
    this.client.on('error', (error: Error) => this.logError(error));
  }

  /**
   * Espera a primeira conexão por um tempo limitado. Se o Redis não responder,
   * a API sobe mesmo assim (sem cache) e conecta quando ele voltar.
   */
  async waitUntilReady(timeoutMs = 2_000): Promise<boolean> {
    if (this.client.status === 'ready') return true;

    let timer: NodeJS.Timeout | undefined;
    const ready = await Promise.race([
      new Promise<boolean>((resolve) =>
        this.client.once('ready', () => resolve(true)),
      ),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
    clearTimeout(timer);

    if (!ready) {
      this.logger.warn(
        'Redis indisponível na inicialização: a API segue sem cache até ele voltar.',
      );
    }
    return ready;
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    // MULTI/EXEC: incremento e renovação da validade acontecem juntos.
    const results = await this.client
      .multi()
      .incr(key)
      .expire(key, ttlSeconds)
      .exec();

    const [error, value] = results?.[0] ?? [new Error('Transação abortada')];
    if (error) throw error;
    return Number(value);
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  /** Apaga só as chaves com o prefixo desta aplicação (SCAN, nunca FLUSHALL). */
  async clear(): Promise<void> {
    const stream = this.client.scanStream({
      match: `${this.keyPrefix}*`,
      count: 100,
    });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length === 0) continue;
      // O SCAN devolve a chave completa; o DEL adiciona o prefixo de novo.
      await this.client.del(
        ...keys.map((key) => key.slice(this.keyPrefix.length)),
      );
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }

  /** Com o Redis fora, o erro se repetiria a cada tentativa: loga no máximo a cada 30 s. */
  private logError(error: Error): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < ERROR_LOG_INTERVAL_MS) return;
    this.lastErrorLogAt = now;
    this.logger.warn(`Falha de conexão com o Redis: ${error.message}`);
  }
}
