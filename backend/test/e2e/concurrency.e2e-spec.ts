import {
  createTestApp,
  CRM,
  EXAM,
  PATIENT,
  TOMORROW,
  type TestApp,
} from './test-app.js';

/**
 * Requisito do enunciado: "Dois pedidos simultâneos para o mesmo horário não
 * podem gerar agendamento duplicado."
 *
 * Dispara N requisições AO MESMO TEMPO (Promise.all) e verifica que
 * exatamente UMA foi aceita. A garantia tem duas camadas: a regra no código
 * (transação com lock no médico) e a exclusion constraint do banco. Os
 * testes abaixo provam cada camada sozinha.
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
        ...PATIENT,
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

  it('camada do código: SEM a constraint no banco, 20 pedidos simultâneos ainda geram só 1 agendamento', async () => {
    // Simula um banco sem exclusion constraint (ex.: MySQL). A constraint é
    // recolocada no finally, para não afetar os outros testes.
    await t.dataSource.query(
      'ALTER TABLE appointments DROP CONSTRAINT appointments_no_overlap',
    );
    try {
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          post(
            EXAM.ULTRASSOM_ABDOMINAL_40,
            '09:20',
            `Paciente ${String.fromCharCode(65 + i)}`,
          ),
        ),
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(19);

      const [{ count }] = await t.dataSource.query<{ count: string }[]>(
        'SELECT count(*) FROM appointments',
      );
      expect(Number(count)).toBe(1);
    } finally {
      // Se este teste falhar, a tabela pode ter agendamentos sobrepostos, e o
      // Postgres recusaria recriar a constraint. Limpa antes de recolocar.
      await t.dataSource.query('TRUNCATE TABLE appointments');
      await t.dataSource.query(
        `ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (doctor_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status = 'SCHEDULED')`,
      );
    }
  });

  it('camada do banco: um INSERT direto, sem passar pela API, também é recusado', async () => {
    await post(EXAM.ULTRASSOM_ABDOMINAL_40, '10:00', 'Paciente A').expect(201);

    // Um script ou outra aplicação gravando direto no banco, sem a regra do código.
    await expect(
      t.dataSource.query(
        `INSERT INTO appointments (patient_name, doctor_id, exam_id, starts_at, ends_at)
         VALUES ('Paciente B', $1, $2, $3, $4)`,
        [
          helena,
          EXAM.RAIO_X_TORAX_20,
          `${TOMORROW}T10:20:00-03:00`,
          `${TOMORROW}T10:40:00-03:00`,
        ],
      ),
    ).rejects.toMatchObject({ driverError: { code: '23P01' } });
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
