import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { RedisCacheStore } from '../../src/common/cache/redis-cache-store.js';
import {
  CRM,
  createTestApp,
  EXAM,
  TOMORROW,
  type TestApp,
} from './test-app.js';

const REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6379';

/**
 * Mesmo fluxo, agora com um Redis DE VERDADE. Cada execução usa um prefixo
 * aleatório de chaves, então não interfere em nada que já esteja no Redis.
 */
describe('Cache no Redis (e2e)', () => {
  const keyPrefix = `agendamento-test:${randomUUID()}:`;
  const store = new RedisCacheStore(REDIS_URL, { keyPrefix });
  const inspector = new Redis(REDIS_URL);
  let t: TestApp;
  let helena: number;

  beforeAll(async () => {
    expect(await store.waitUntilReady()).toBe(true);
    t = await createTestApp({ cacheStore: store });
    helena = await t.doctorIdByCrm(CRM.HELENA);
    await t.resetAppointments();
  });

  afterAll(async () => {
    await store.clear();
    await t.close();
    store.onModuleDestroy();
    inspector.disconnect();
  });

  it('guarda as respostas no Redis, com validade', async () => {
    const first = await t.http().get('/api/exams').query({ search: 'tomo' });
    const second = await t.http().get('/api/exams').query({ search: 'tomo' });

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');

    const [key] = await inspector.keys(
      `${keyPrefix}catalog:v*:exams:search:tomo`,
    );
    expect(key).toBeDefined();
    const ttl = await inspector.ttl(key!);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(3600);
  });

  it('agendar sobe a versão no Redis e a disponibilidade volta a vir do banco', async () => {
    const availability = () =>
      t
        .http()
        .get(`/api/doctors/${helena}/availability`)
        .query({ examId: EXAM.ULTRASSOM_ABDOMINAL_40, date: TOMORROW })
        .expect(200);

    await availability();
    expect((await availability()).headers['x-cache']).toBe('HIT');

    await t
      .http()
      .post('/api/appointments')
      .send({
        patientName: 'João Pereira',
        examId: EXAM.ULTRASSOM_ABDOMINAL_40,
        doctorId: helena,
        startsAt: `${TOMORROW}T10:00:00-03:00`,
      })
      .expect(201);

    const versionKey = `${keyPrefix}availability:version:doctor:${helena}:date:${TOMORROW}`;
    expect(Number(await inspector.get(versionKey))).toBeGreaterThanOrEqual(1);

    const afterBooking = await availability();
    expect(afterBooking.headers['x-cache']).toBe('MISS');
    expect(
      afterBooking.body.slots.map((slot: { time: string }) => slot.time),
    ).not.toContain('10:00');
  });

  it('health check mostra o Redis conectado', async () => {
    const { body } = await t.http().get('/api/health').expect(200);
    expect(body.cache).toEqual({ store: 'redis', status: 'up' });
  });
});

/**
 * Degradação graciosa: com o Redis inacessível, a API continua funcionando
 * (e rápido), só que sem cache. Uma porta onde não há nada simula a queda.
 */
describe('Redis fora do ar (e2e)', () => {
  const store = new RedisCacheStore('redis://localhost:6390');
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ cacheStore: store });
    // Direto no banco: resetAppointments também limparia o cache, que está fora.
    await t.dataSource.query('TRUNCATE TABLE appointments');
  });

  afterAll(async () => {
    await t.close();
    store.onModuleDestroy();
  });

  it('busca responde 200 pelo banco, sem travar esperando o Redis', async () => {
    const startedAt = Date.now();

    const first = await t.http().get('/api/exams').query({ search: 'resson' });
    const second = await t.http().get('/api/exams').query({ search: 'resson' });

    expect(first.status).toBe(200);
    expect(second.headers['x-cache']).toBe('MISS'); // nada foi guardado
    expect(second.body).toHaveLength(4);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it('o agendamento continua funcionando', async () => {
    const helena = await t.doctorIdByCrm(CRM.HELENA);

    await t
      .http()
      .post('/api/appointments')
      .send({
        patientName: 'Ana Souza',
        examId: EXAM.ULTRASSOM_ABDOMINAL_40,
        doctorId: helena,
        startsAt: `${TOMORROW}T14:00:00-03:00`,
      })
      .expect(201);
  });

  it('health check continua 200 e informa o cache fora', async () => {
    const { body } = await t.http().get('/api/health').expect(200);
    expect(body).toMatchObject({
      database: 'up',
      cache: { store: 'redis', status: 'down' },
    });
  });
});
