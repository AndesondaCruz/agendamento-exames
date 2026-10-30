import { MemoryCacheStore } from './cache-store.js';

describe('MemoryCacheStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-07T13:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('devolve o valor dentro da validade e null depois dela', async () => {
    const store = new MemoryCacheStore();
    await store.set('chave', 'valor', 60);

    vi.advanceTimersByTime(59_000);
    expect(await store.get('chave')).toBe('valor');

    vi.advanceTimersByTime(1_000);
    expect(await store.get('chave')).toBeNull();
  });

  it('incr cria o contador com 1 e incrementa a partir dele', async () => {
    const store = new MemoryCacheStore();

    expect(await store.incr('versao', 60)).toBe(1);
    expect(await store.incr('versao', 60)).toBe(2);
    expect(await store.get('versao')).toBe('2');
  });

  it('respeita o limite de entradas descartando primeiro o que expira mais cedo', async () => {
    const store = new MemoryCacheStore(3);
    await store.set('versao', '5', 7 * 24 * 3600); // contador: validade longa
    await store.set('a', '1', 60);
    await store.set('b', '2', 300);
    await store.set('c', '3', 120); // estoura o limite

    expect(store.size).toBe(3);
    expect(await store.get('a')).toBeNull(); // expirava mais cedo: saiu
    expect(await store.get('versao')).toBe('5'); // o contador sobrevive
    expect(await store.get('b')).toBe('2');
    expect(await store.get('c')).toBe('3');
  });

  it('ao estourar o limite, descarta antes as entradas já expiradas', async () => {
    const store = new MemoryCacheStore(2);
    await store.set('velha', 'x', 10);
    await store.set('longa', 'y', 3600);
    vi.advanceTimersByTime(11_000);

    await store.set('nova', 'z', 60);

    expect(await store.get('longa')).toBe('y');
    expect(await store.get('nova')).toBe('z');
  });

  it('clear apaga tudo', async () => {
    const store = new MemoryCacheStore();
    await store.set('chave', 'valor', 60);
    await store.clear();
    expect(await store.get('chave')).toBeNull();
  });
});
