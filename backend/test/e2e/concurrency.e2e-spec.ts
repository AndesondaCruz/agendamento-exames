import {
  CRM,
  createTestApp,
  EXAM,
  TOMORROW,
  type TestApp,
} from './test-app.js';

/**
 * Requisito do enunciado: "Dois pedidos simultâneos para o mesmo horário não
 * podem gerar agendamento duplicado."
 *
 * Dispara N requisições AO MESMO TEMPO (Promise.all) e verifica que
 * exatamente UMA foi aceita. Quem garante é a exclusion constraint do
 * Postgres, não um "SELECT antes do INSERT" (que teria race condition).
 */
describe('Concorrência (e2e)', () => {
  let t: TestApp;
  let helena: number;

  beforeAll(async () => {
    t = await createTestApp();
    helena = await t.doctorIdByCrm(CRM.HELENA);
  });

  beforeEach(() => t.resetAppointments());
  afterAll(() => t.close());

  const post = (examId: number, time: string, patient: string) =>
    t
      .http()
      .post('/api/appointments')
      .send({
        patientName: patient,
        examId,
        doctorId: helena,
        startsAt: `${TOMORROW}T${time}:00-03:00`,
      });

  it('20 pedidos simultâneos para o MESMO horário: 1 aceito, 19 recusados com 409', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        post(
          EXAM.ULTRASSOM_ABDOMINAL_40,
          '08:00',
          `Paciente ${String.fromCharCode(65 + i)}`,
        ),
      ),
    );

    const statuses = responses.map((response) => response.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(19);
    expect(
      responses
        .filter((r) => r.status === 409)
        .every((r) => r.body.code === 'SLOT_UNAVAILABLE'),
    ).toBe(true);

    const [{ count }] = await t.dataSource.query<{ count: string }[]>(
      'SELECT count(*) FROM appointments',
    );
    expect(Number(count)).toBe(1);
  });

  it('pedidos simultâneos com INÍCIOS DIFERENTES que se sobrepõem: só 1 aceito', async () => {
    // 08:00–08:40 (40 min), 08:00–08:30 (30 min) e 08:20–08:40 (20 min):
    // começos diferentes, então um UNIQUE(doctor_id, starts_at) não pegaria.
    const responses = await Promise.all(
      Array.from({ length: 21 }, (_, i) => {
        const variants = [
          [EXAM.ULTRASSOM_ABDOMINAL_40, '08:00'],
          [EXAM.MAMOGRAFIA_30, '08:00'],
          [EXAM.RAIO_X_TORAX_20, '08:20'],
        ] as const;
        const [examId, time] = variants[i % variants.length];
        return post(examId, time, `Paciente ${String.fromCharCode(65 + i)}`);
      }),
    );

    expect(
      responses.filter((response) => response.status === 201),
    ).toHaveLength(1);
    expect(
      responses.filter((response) => response.status === 409),
    ).toHaveLength(20);
  });
});
