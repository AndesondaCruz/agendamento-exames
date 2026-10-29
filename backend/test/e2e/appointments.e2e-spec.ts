import {
  CRM,
  createTestApp,
  EXAM,
  TODAY,
  TOMORROW,
  type TestApp,
} from './test-app.js';

describe('POST /api/appointments (e2e)', () => {
  let t: TestApp;
  let helena: number;
  let camila: number;

  const book = (overrides: Record<string, unknown> = {}) =>
    t
      .http()
      .post('/api/appointments')
      .send({
        patientName: 'Maria da Silva',
        examId: EXAM.ULTRASSOM_ABDOMINAL_40,
        doctorId: helena,
        startsAt: `${TOMORROW}T08:00:00-03:00`,
        ...overrides,
      });

  beforeAll(async () => {
    t = await createTestApp();
    helena = await t.doctorIdByCrm(CRM.HELENA);
    camila = await t.doctorIdByCrm(CRM.CAMILA);
  });

  beforeEach(() => t.resetAppointments());
  afterAll(() => t.close());

  describe('caminho feliz', () => {
    it('cria o agendamento e deriva o término pela duração do exame', async () => {
      const { body } = await book().expect(201);

      expect(body).toMatchObject({
        patientName: 'Maria da Silva',
        startsAt: '2030-01-08T08:00:00.000-03:00',
        endsAt: '2030-01-08T08:40:00.000-03:00',
        exam: { id: EXAM.ULTRASSOM_ABDOMINAL_40, durationMinutes: 40 },
        doctor: { id: helena, crm: CRM.HELENA },
      });
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('aceita o mesmo horário em outro fuso equivalente (11:00Z = 08:00 BRT)', async () => {
      await book({ startsAt: `${TOMORROW}T11:00:00Z` }).expect(201);
    });

    it('normaliza espaços no nome do paciente', async () => {
      const { body } = await book({
        patientName: '  Maria   da  Silva ',
      }).expect(201);
      expect(body.patientName).toBe('Maria da Silva');
    });

    it('GET /api/appointments/:id devolve o agendamento criado', async () => {
      const { body: created } = await book().expect(201);
      const { body } = await t
        .http()
        .get(`/api/appointments/${created.id}`)
        .expect(200);

      expect(body).toEqual(created);
    });

    it('agendamentos encostados não colidem (08:00–08:40 e 08:40–09:20)', async () => {
      await book().expect(201);
      await book({ startsAt: `${TOMORROW}T08:40:00-03:00` }).expect(201);
    });

    it('o mesmo horário com OUTRO médico é permitido', async () => {
      // 10:00 de terça é horário válido para Helena (08–12) e Camila (10–14).
      const startsAt = `${TOMORROW}T10:00:00-03:00`;
      await book({ startsAt }).expect(201);
      await book({ startsAt, doctorId: camila }).expect(201);
    });
  });

  describe('regras de negócio', () => {
    it('409 SLOT_UNAVAILABLE ao sobrepor outro agendamento (mesmo começando em outro horário)', async () => {
      await book().expect(201); // 08:00–08:40

      const { body } = await book({
        examId: EXAM.RAIO_X_TORAX_20,
        startsAt: `${TOMORROW}T08:20:00-03:00`, // 08:20–08:40: dentro do anterior
      }).expect(409);

      expect(body.code).toBe('SLOT_UNAVAILABLE');
    });

    it('422 SLOT_IN_PAST: horário de hoje que já passou (agora = 10:00)', async () => {
      const { body } = await book({
        startsAt: `${TODAY}T09:20:00-03:00`,
      }).expect(422);
      expect(body.code).toBe('SLOT_IN_PAST');
    });

    it('422 OUTSIDE_WORKING_HOURS: no intervalo de almoço (12:00–14:00)', async () => {
      const { body } = await book({
        startsAt: `${TOMORROW}T12:00:00-03:00`,
      }).expect(422);
      expect(body.code).toBe('OUTSIDE_WORKING_HOURS');
    });

    it('422 OUTSIDE_WORKING_HOURS: exame que estouraria o fim do turno', async () => {
      // 11:40 + 40 min = 12:20 > 12:00
      const { body } = await book({
        startsAt: `${TOMORROW}T11:40:00-03:00`,
      }).expect(422);
      expect(body.code).toBe('OUTSIDE_WORKING_HOURS');
    });

    it('422 OUTSIDE_WORKING_HOURS: dia em que o médico não atende (domingo)', async () => {
      const { body } = await book({
        startsAt: '2030-01-13T08:00:00-03:00',
      }).expect(422);
      expect(body.code).toBe('OUTSIDE_WORKING_HOURS');
    });

    it('422 SLOT_NOT_ON_GRID: horário dentro do turno, mas fora dos passos do exame', async () => {
      const { body } = await book({
        startsAt: `${TOMORROW}T08:10:00-03:00`,
      }).expect(422);

      expect(body.code).toBe('SLOT_NOT_ON_GRID');
      expect(body.message).toContain('08:00, 08:40');
    });

    it('404 para exame ou médico inexistente', async () => {
      expect((await book({ examId: 999 }).expect(404)).body.code).toBe(
        'EXAM_NOT_FOUND',
      );
      expect((await book({ doctorId: 999 }).expect(404)).body.code).toBe(
        'DOCTOR_NOT_FOUND',
      );
    });
  });

  describe('validação do corpo (400 VALIDATION_ERROR)', () => {
    it.each([
      ['nome curto', { patientName: 'Al' }, 'patientName'],
      [
        'nome com HTML',
        { patientName: '<script>alert(1)</script>' },
        'patientName',
      ],
      ['examId como texto', { examId: '7' }, 'examId'],
      ['startsAt sem fuso', { startsAt: `${TOMORROW}T08:00:00` }, 'startsAt'],
      ['startsAt inválido', { startsAt: 'amanhã às 8' }, 'startsAt'],
      [
        'campo extra (endsAt)',
        { endsAt: `${TOMORROW}T09:00:00-03:00` },
        'endsAt',
      ],
    ])('%s', async (_case, overrides, field) => {
      const { body } = await book(overrides).expect(400);

      expect(body.code).toBe('VALIDATION_ERROR');
      expect(
        body.details.map((detail: { field: string }) => detail.field),
      ).toContain(field);
    });

    it('corpo vazio lista todos os campos obrigatórios', async () => {
      const { body } = await t
        .http()
        .post('/api/appointments')
        .send({})
        .expect(400);

      const fields = body.details.map(
        (detail: { field: string }) => detail.field,
      );
      expect(fields).toEqual(
        expect.arrayContaining([
          'patientName',
          'examId',
          'doctorId',
          'startsAt',
        ]),
      );
    });

    it('id malformado no GET -> 400', async () => {
      await t.http().get('/api/appointments/nao-e-uuid').expect(400);
    });
  });
});
