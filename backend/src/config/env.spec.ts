import { validateEnv } from './env.js';

const BASE = {
  DATABASE_URL: 'postgresql://app:app@localhost:5432/agendamento',
};

describe('variáveis de ambiente: rate limiting', () => {
  it('usa os padrões quando nada é informado', () => {
    const env = validateEnv(BASE);

    expect(env.TRUST_PROXY_HOPS).toBe(1);
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(60);
    expect(env.RATE_LIMIT_LOOKUP).toBe(10);
    expect(env.RATE_LIMIT_CANCEL).toBe(10);
    expect(env.RATE_LIMIT_CREATE).toBe(100);
  });

  it('aceita valores em texto, como chegam do ambiente', () => {
    const env = validateEnv({
      ...BASE,
      TRUST_PROXY_HOPS: '2',
      RATE_LIMIT_LOOKUP: '5',
    });

    expect(env.TRUST_PROXY_HOPS).toBe(2);
    expect(env.RATE_LIMIT_LOOKUP).toBe(5);
  });

  it('TRUST_PROXY_HOPS=0 é válido: a API recebe conexões diretas', () => {
    expect(
      validateEnv({ ...BASE, TRUST_PROXY_HOPS: '0' }).TRUST_PROXY_HOPS,
    ).toBe(0);
  });

  it('variável vazia vale como ausente (não vira 0)', () => {
    const env = validateEnv({
      ...BASE,
      TRUST_PROXY_HOPS: '',
      RATE_LIMIT_LOOKUP: '',
    });

    expect(env.TRUST_PROXY_HOPS).toBe(1);
    expect(env.RATE_LIMIT_LOOKUP).toBe(10);
  });

  it.each([
    ['TRUST_PROXY_HOPS', 'abc'],
    ['TRUST_PROXY_HOPS', '-1'],
    ['TRUST_PROXY_HOPS', '1.5'],
    ['TRUST_PROXY_HOPS', '11'],
    ['RATE_LIMIT_LOOKUP', '0'],
    ['RATE_LIMIT_CANCEL', '-3'],
    ['RATE_LIMIT_WINDOW_SECONDS', '0'],
  ])('recusa %s=%s', (name, value) => {
    expect(() => validateEnv({ ...BASE, [name]: value })).toThrow(name);
  });
});
