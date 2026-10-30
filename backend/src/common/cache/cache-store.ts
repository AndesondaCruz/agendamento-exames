/**
 * Contrato mínimo de um armazenamento de cache (chave -> texto, com validade).
 *
 * É uma classe abstrata (e não uma interface) porque o Nest usa a própria
 * classe como token de injeção: os services dependem de `CacheStore`, e o
 * CacheModule decide qual implementação entregar (Redis ou memória). É o
 * princípio da inversão de dependência (o "D" do SOLID).
 */
export abstract class CacheStore {
  abstract readonly kind: 'redis' | 'memory';

  abstract get(key: string): Promise<string | null>;

  abstract set(key: string, value: string, ttlSeconds: number): Promise<void>;

  /** Incrementa um contador (criando-o com 1) e renova a validade dele. */
  abstract incr(key: string, ttlSeconds: number): Promise<number>;

  /** O armazenamento está respondendo? Usado no health check. */
  abstract ping(): Promise<boolean>;

  /** Apaga todas as chaves desta aplicação. Usado em testes e manutenção. */
  abstract clear(): Promise<void>;
}

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Cache em memória do próprio processo. É o fallback quando REDIS_URL não
 * está definida (desenvolvimento, testes, deploy sem Redis).
 *
 * Limitações conhecidas, e o motivo de o Redis existir: o conteúdo some a
 * cada reinício e NÃO é compartilhado entre instâncias da API.
 */
export class MemoryCacheStore extends CacheStore {
  readonly kind = 'memory';
  private readonly entries = new Map<string, MemoryEntry>();

  constructor(private readonly maxEntries = 1_000) {
    super();
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.read(key));
  }

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.write(key, value, ttlSeconds);
    return Promise.resolve();
  }

  incr(key: string, ttlSeconds: number): Promise<number> {
    const next = Number(this.read(key) ?? 0) + 1;
    this.write(key, String(next), ttlSeconds);
    return Promise.resolve(next);
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  clear(): Promise<void> {
    this.entries.clear();
    return Promise.resolve();
  }

  get size(): number {
    return this.entries.size;
  }

  private read(key: string): string | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  private write(key: string, value: string, ttlSeconds: number): void {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.evictOverflow();
  }

  /**
   * Limite de memória: sem ele, cada termo de busca diferente criaria uma
   * entrada nova para sempre. Ao estourar, descarta primeiro o que já expirou
   * e depois o que expira MAIS CEDO (mesma política do Redis, "volatile-ttl").
   * Assim os contadores de versão, que têm validade longa, são os últimos a
   * sair; perder um deles poderia "ressuscitar" uma resposta antiga.
   */
  private evictOverflow(): void {
    if (this.entries.size <= this.maxEntries) return;

    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }

    while (this.entries.size > this.maxEntries) {
      let soonestKey: string | undefined;
      let soonest = Number.POSITIVE_INFINITY;
      for (const [key, entry] of this.entries) {
        if (entry.expiresAt < soonest) {
          soonest = entry.expiresAt;
          soonestKey = key;
        }
      }
      if (soonestKey === undefined) break;
      this.entries.delete(soonestKey);
    }
  }
}
