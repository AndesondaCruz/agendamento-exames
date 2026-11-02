import {
  CRM,
  createTestApp,
  EXAM,
  NOW,
  PATIENT,
  TOMORROW,
  type TestApp,
} from './test-app.js';

/** Outro CPF válido, para provar que só o dono do agendamento acessa. */
const OTHER_CPF = '111.444.777-35';

describe('Consultar e cancelar agendamento (e2e)', () => {
  let t: TestApp;
  let helena: number;

  const book = (time = '08:00') =>
    t
      .http()
      .post('/api/appointments')
      .send({
        ...PATIENT,
        patientName: 'Maria da Silva',
        examId: EXAM.ULTRASSOM_ABDOMINAL_40,
        doctorId: helena,
        startsAt: `${TOMORROW}T${time}:00-03:00`,
      })
      .expect(201);

  const lookup = (protocol: string, patientCpf: string = PATIENT.patientCpf) =>
    t.http().post('/api/appointments/lookup').send({ protocol, patientCpf });

  const cancel = (id: string, patientCpf: string = PATIENT.patientCpf) =>
    t.http().post(`/api/appointments/${id}/cancel`).send({ patientCpf });

  const freeTimes = async () => {
    const { body } = await t
      .http()
      .get(`/api/doctors/${helena}/availability`)
      .query({ examId: EXAM.ULTRASSOM_ABDOMINAL_40, date: TOMORROW })
      .expect(200);
    return body.slots.map((slot: { time: string }) => slot.time) as string[];
  };

  beforeAll(async () => {
    t = await createTestApp();
    helena = await t.doctorIdByCrm(CRM.HELENA);
  });

  beforeEach(() => t.resetAppointments());
  afterAll(() => t.close());

  describe('consulta pelo protocolo + CPF', () => {
    it('encontra o agendamento, com o protocolo em qualquer caixa e o CPF com ou sem pontuação', async () => {
      const { body: created } = await book();
      expect(created).toMatchObject({
        status: 'SCHEDULED',
        cancelledAt: null,
        protocol: created.id.slice(0, 8).toUpperCase(),
      });

      const { body } = await lookup(
        created.protocol.toLowerCase(),
        '52998224725',
      ).expect(200);
      expect(body).toMatchObject({
        id: created.id,
        status: 'SCHEDULED',
        patientCpfMasked: '***.982.247-**',
      });
    });

    it('CPF de outra pessoa: 404 com mensagem genérica (não confirma que o protocolo existe)', async () => {
      const { body: created } = await book();

      const wrongCpf = await lookup(created.protocol, OTHER_CPF).expect(404);
      const wrongProtocol = await lookup('ffffffff').expect(404);

      expect(wrongCpf.body.code).toBe('NOT_FOUND');
      expect(wrongCpf.body.message).toBe(wrongProtocol.body.message);
    });

    it.each([
      [
        'protocolo curto',
        { protocol: 'A1B2', patientCpf: PATIENT.patientCpf },
        'protocol',
      ],
      [
        'protocolo com caractere inválido',
        { protocol: 'ZZZZZZZZ', patientCpf: PATIENT.patientCpf },
        'protocol',
      ],
      [
        'CPF inválido',
        { protocol: 'a1b2c3d4', patientCpf: '529.982.247-24' },
        'patientCpf',
      ],
    ])('%s: 400', async (_case, body, field) => {
      const response = await t
        .http()
        .post('/api/appointments/lookup')
        .send(body)
        .expect(400);
      expect(
        response.body.details.map((detail: { field: string }) => detail.field),
      ).toContain(field);
    });
  });

  describe('cancelamento', () => {
    it('cancela sem apagar, e o horário volta a ficar livre', async () => {
      const { body: created } = await book('08:00');
      expect(await freeTimes()).not.toContain('08:00');

      const { body } = await cancel(created.id).expect(200);
      expect(body).toMatchObject({
        id: created.id,
        status: 'CANCELLED',
        cancelledAt: NOW.toISOString(),
      });

      // O cache da disponibilidade foi invalidado: o 08:00 reaparece.
      expect(await freeTimes()).toContain('08:00');

      // O registro continua no banco, só com outro status.
      const [row] = await t.dataSource.query<Array<{ status: string }>>(
        'SELECT status FROM appointments WHERE id = $1',
        [created.id],
      );
      expect(row?.status).toBe('CANCELLED');
    });

    it('outra pessoa pode agendar o horário liberado (a constraint ignora cancelados)', async () => {
      const { body: created } = await book('08:00');
      await cancel(created.id).expect(200);

      await book('08:00');

      const [{ count }] = await t.dataSource.query<Array<{ count: string }>>(
        'SELECT count(*) FROM appointments',
      );
      expect(Number(count)).toBe(2);
    });

    it('cancelar de novo devolve o mesmo resultado (idempotente)', async () => {
      const { body: created } = await book();
      const first = await cancel(created.id).expect(200);
      const second = await cancel(created.id).expect(200);

      expect(second.body).toEqual(first.body);
    });

    it('CPF que não confere: 404, e o agendamento continua ativo', async () => {
      const { body: created } = await book();

      await cancel(created.id, OTHER_CPF).expect(404);

      const { body } = await lookup(created.protocol).expect(200);
      expect(body.status).toBe('SCHEDULED');
    });

    it('exame que já começou não pode ser cancelado (422)', async () => {
      // Grava direto no banco um agendamento de 1 hora atrás.
      const [{ id }] = await t.dataSource.query<Array<{ id: string }>>(
        `INSERT INTO appointments (patient_name, patient_cpf, doctor_id, exam_id, starts_at, ends_at)
         VALUES ('Maria da Silva', '52998224725', $1, $2, $3, $4) RETURNING id`,
        [
          helena,
          EXAM.ULTRASSOM_ABDOMINAL_40,
          new Date(NOW.getTime() - 60 * 60_000),
          new Date(NOW.getTime() - 20 * 60_000),
        ],
      );

      const { body } = await cancel(id).expect(422);
      expect(body.code).toBe('CANCELLATION_NOT_ALLOWED');
    });

    it('id malformado: 400', async () => {
      await cancel('nao-e-uuid').expect(400);
    });
  });
});
