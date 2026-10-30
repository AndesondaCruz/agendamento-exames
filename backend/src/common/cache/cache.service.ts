import { Injectable, Logger } from '@nestjs/common';
import { CacheStore } from './cache-store.js';

/**
 * HIT: veio do cache. MISS: veio do banco (e foi guardado).
 * BYPASS: o cache foi pulado de propósito (ex.: disponibilidade de hoje).
 */
export type CacheStatus = 'HIT' | 'MISS' | 'BYPASS';

export interface Cached<T> {
  value: T;
  cache: CacheStatus;
}

/** Validade dos contadores de versão: bem maior que a de qualquer entrada. */
const VERSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const ERROR_LOG_INTERVAL_MS = 30_000;

/**
 * Cache de leitura no padrão CACHE-ASIDE: olha o cache; se não achar, busca
 * na fonte da verdade (Postgres) e guarda o resultado.
 *
 * Regra de ouro desta classe: o cache é uma OTIMIZAÇÃO, nunca uma
 * dependência. Qualquer falha do armazenamento (Redis fora, timeout, valor
 * corrompido) vira um MISS silencioso e a requisição segue pelo banco.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private lastErrorLogAt = 0;

  constructor(private readonly store: CacheStore) {}

  get storeKind(): CacheStore['kind'] {
    return this.store.kind;
  }

  async getOrLoad<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<Cached<T>> {
    const cached = await this.read<T>(key);
    if (cached !== undefined) {
      return { value: cached, cache: 'HIT' };
    }

    // Erros do loader (ex.: 404) sobem normalmente e NÃO são guardados.
    const value = await loader();
    await this.write(key, value, ttlSeconds);
    return { value, cache: 'MISS' };
  }

  /**
   * Versão atual de um grupo de chaves (0 se nunca foi incrementada).
   * As chaves do grupo embutem a versão: "availability:v3:...".
   */
  async version(versionKey: string): Promise<number> {
    try {
      const raw = await this.store.get(versionKey);
      const version = Number(raw ?? 0);
      return Number.isSafeInteger(version) ? version : 0;
    } catch (error) {
      this.logFailure('ler versão', error);
      return 0;
    }
  }

  /**
   * INVALIDAÇÃO POR VERSÃO (generational keys): em vez de procurar e apagar
   * cada chave do grupo, sobe o contador. As chaves antigas ficam
   * inalcançáveis na hora e expiram sozinhas pelo TTL. É uma operação
   * atômica, de custo constante, e sem a corrida do "apagar": uma leitura
   * lenta que termine depois da invalidação grava na versão ANTIGA, que
   * ninguém mais lê.
   */
  async bumpVersion(versionKey: string): Promise<void> {
    try {
      await this.store.incr(versionKey, VERSION_TTL_SECONDS);
    } catch (error) {
      // Sem Redis, ninguém está lendo do cache; quando ele voltar, o TTL
      // curto das entradas limita por quanto tempo um dado velho aparece.
      this.logFailure('invalidar', error);
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.store.ping();
  }

  private async read<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.store.get(key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch (error) {
      this.logFailure('ler', error);
      return undefined;
    }
  }

  private async write(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.store.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logFailure('gravar', error);
    }
  }

  private logFailure(operation: string, error: unknown): void {
    const now = Date.now();
    if (now - this.lastErrorLogAt < ERROR_LOG_INTERVAL_MS) return;
    this.lastErrorLogAt = now;
    const reason = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Cache indisponível ao ${operation}; seguindo pelo banco. (${reason})`,
    );
  }
}
