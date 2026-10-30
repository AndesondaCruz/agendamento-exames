import { CacheService } from './cache.service.js';
import { CacheStore, MemoryCacheStore } from './cache-store.js';

/** Simula um Redis fora do ar: toda operação falha. */
class BrokenStore extends CacheStore {
  readonly kind = 'redis';
  private fail(): Promise<never> {
    return Promise.reject(new Error('ECONNREFUSED'));
  }
  get = () => this.fail();
  set = () => this.fail();
  incr = () => this.fail();
  clear = () => this.fail();
  ping = () => Promise.resolve(false);
}

describe('CacheService', () => {
  it('MISS na primeira leitura, HIT na segunda, sem chamar o banco de novo', async () => {
    const cache = new CacheService(new MemoryCacheStore());
    const loader = vi.fn().mockResolvedValue([{ id: 1 }]);

    const first = await cache.getOrLoad('exames', 60, loader);
    const second = await cache.getOrLoad('exames', 60, loader);

    expect(first).toEqual({ value: [{ id: 1 }], cache: 'MISS' });
    expect(second).toEqual({ value: [{ id: 1 }], cache: 'HIT' });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('erros do banco (ex.: 404) sobem e NÃO são guardados', async () => {
    const cache = new CacheService(new MemoryCacheStore());
    const failing = vi.fn().mockRejectedValue(new Error('não encontrado'));

    await expect(cache.getOrLoad('medico:99', 60, failing)).rejects.toThrow(
      'não encontrado',
    );

    const ok = vi.fn().mockResolvedValue('agora existe');
    expect(await cache.getOrLoad('medico:99', 60, ok)).toEqual({
      value: 'agora existe',
      cache: 'MISS',
    });
  });

  it('valor corrompido no cache vira MISS (busca no banco)', async () => {
    const store = new MemoryCacheStore();
    await store.set('chave', '{json inválido', 60);
    const cache = new CacheService(store);

    const result = await cache.getOrLoad('chave', 60, () =>
      Promise.resolve('do banco'),
    );

    expect(result).toEqual({ value: 'do banco', cache: 'MISS' });
  });

  it('versão começa em 0 e sobe a cada invalidação', async () => {
    const cache = new CacheService(new MemoryCacheStore());

    expect(await cache.version('v')).toBe(0);
    await cache.bumpVersion('v');
    await cache.bumpVersion('v');
    expect(await cache.version('v')).toBe(2);
  });

  describe('com o armazenamento fora do ar (degradação graciosa)', () => {
    const cache = new CacheService(new BrokenStore());

    it('getOrLoad responde pelo banco, sem lançar erro', async () => {
      const loader = vi.fn().mockResolvedValue('do banco');

      expect(await cache.getOrLoad('chave', 60, loader)).toEqual({
        value: 'do banco',
        cache: 'MISS',
      });
      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('version devolve 0 e bumpVersion não lança erro', async () => {
      expect(await cache.version('v')).toBe(0);
      await expect(cache.bumpVersion('v')).resolves.toBeUndefined();
    });

    it('health check informa que o cache está fora', async () => {
      expect(await cache.isHealthy()).toBe(false);
    });
  });
});
