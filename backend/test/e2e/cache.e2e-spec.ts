import {
  CRM,
  createTestApp,
  EXAM,
  TODAY,
  TOMORROW,
  type TestApp,
} from './test-app.js';

/**
 * Comportamento do cache visto de fora, pela API: header X-Cache, conteúdo
 * idêntico entre MISS e HIT e, principalmente, INVALIDAÇÃO após agendar.
 */
describe('Cache de leitura (e2e)', () => {
  let t: TestApp;
  let helena: number;
  let thiago: number;

  const getAvailability = (doctorId: number, date: string) =>
    t
      .http()
      .get(`/api/doctors/${doctorId}/availability`)
      .query({ examId: EXAM.ULTRASSOM_ABDOMINAL_40, date })
      .expect(200);

  const times = (body: { slots: Array<{ time: string }> }) =>
    body.slots.map((slot) => slot.time);

  const book = (doctorId: number, startsAt: string) =>
    t.http().post('/api/appointments').send({
      patientName: 'Maria da Silva',
      examId: EXAM.ULTRASSOM_ABDOMINAL_40,
      doctorId,
      startsAt,
    });

  beforeAll(async () => {
    t = await createTestApp();
    helena = await t.doctorIdByCrm(CRM.HELENA);
    thiago = await t.doctorIdByCrm(CRM.THIAGO);
  });

  beforeEach(() => t.resetAppointments());
  afterAll(() => t.close());

  it('busca de exames: MISS na primeira vez, HIT depois, com o mesmo conteúdo', async () => {
    const first = await t
      .http()
      .get('/api/exams')
      .query({ search: 'resson' })
      .expect(200);
    const second = await t
      .http()
      .get('/api/exams')
      .query({ search: 'resson' })
      .expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
    expect(second.body).toHaveLength(4);
  });

  it('termos que só diferem em maiúsculas/espaços compartilham a mesma entrada', async () => {
    await t
      .http()
      .get('/api/exams')
      .query({ search: 'mamografia' })
      .expect(200);

    const variant = await t
      .http()
      .get('/api/exams')
      .query({ search: '  MAMOGRAFIA ' })
      .expect(200);

    expect(variant.headers['x-cache']).toBe('HIT');
  });

  it('lista de médicos também é cacheada', async () => {
    const first = await t.http().get('/api/doctors').expect(200);
    const second = await t.http().get('/api/doctors').expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
  });

  it('agendar invalida a disponibilidade daquele médico naquele dia', async () => {
    expect((await getAvailability(helena, TOMORROW)).headers['x-cache']).toBe(
      'MISS',
    );
    const cached = await getAvailability(helena, TOMORROW);
    expect(cached.headers['x-cache']).toBe('HIT');
    expect(times(cached.body)).toContain('08:00');

    await book(helena, `${TOMORROW}T08:00:00-03:00`).expect(201);

    const afterBooking = await getAvailability(helena, TOMORROW);
    expect(afterBooking.headers['x-cache']).toBe('MISS'); // foi ao banco
    expect(times(afterBooking.body)).not.toContain('08:00');

    expect((await getAvailability(helena, TOMORROW)).headers['x-cache']).toBe(
      'HIT',
    );
  });

  it('a invalidação é localizada: a agenda de outro médico continua no cache', async () => {
    await getAvailability(thiago, TOMORROW);
    expect((await getAvailability(thiago, TOMORROW)).headers['x-cache']).toBe(
      'HIT',
    );

    await book(helena, `${TOMORROW}T08:40:00-03:00`).expect(201);

    expect((await getAvailability(thiago, TOMORROW)).headers['x-cache']).toBe(
      'HIT',
    );
  });

  it('um conflito (409) também invalida: o paciente viu uma agenda velha', async () => {
    await book(helena, `${TOMORROW}T09:20:00-03:00`).expect(201);
    await getAvailability(helena, TOMORROW);
    expect((await getAvailability(helena, TOMORROW)).headers['x-cache']).toBe(
      'HIT',
    );

    await book(helena, `${TOMORROW}T09:20:00-03:00`).expect(409);

    expect((await getAvailability(helena, TOMORROW)).headers['x-cache']).toBe(
      'MISS',
    );
  });

  it('o dia de hoje nunca usa cache (BYPASS): depende do relógio', async () => {
    const first = await getAvailability(helena, TODAY);
    const second = await getAvailability(helena, TODAY);

    expect(first.headers['x-cache']).toBe('BYPASS');
    expect(second.headers['x-cache']).toBe('BYPASS');
  });

  it('erros não são cacheados: médico inexistente continua 404', async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { body } = await t
        .http()
        .get('/api/doctors/99999/availability')
        .query({ examId: EXAM.ULTRASSOM_ABDOMINAL_40, date: TOMORROW })
        .expect(404);
      expect(body.code).toBe('DOCTOR_NOT_FOUND');
    }
  });

  it('health check informa o tipo de cache em uso', async () => {
    const { body } = await t.http().get('/api/health').expect(200);

    expect(body).toEqual({
      status: 'ok',
      database: 'up',
      cache: { store: 'memory', status: 'up' },
    });
  });
});
