import {
  CRM,
  createTestApp,
  EXAM,
  SUNDAY,
  TODAY,
  TOMORROW,
  YESTERDAY,
  type TestApp,
} from './test-app.js';

interface Availability {
  slots: Array<{ time: string; startsAt: string; endsAt: string }>;
  unavailableReason: string | null;
}

describe('GET /api/doctors/:id/availability (e2e)', () => {
  let t: TestApp;
  let helena: number;
  let thiago: number;

  const availability = async (
    doctorId: number,
    examId: number,
    date: string,
  ) => {
    const { body } = await t
      .http()
      .get(`/api/doctors/${doctorId}/availability`)
      .query({ examId, date })
      .expect(200);
    return body as Availability;
  };
  const times = (a: Availability) => a.slots.map((slot) => slot.time);

  beforeAll(async () => {
    t = await createTestApp();
    helena = await t.doctorIdByCrm(CRM.HELENA);
    thiago = await t.doctorIdByCrm(CRM.THIAGO);
  });

  beforeEach(() => t.resetAppointments());
  afterAll(() => t.close());

  it('GET /api/doctors lista os 5 médicos; Dr. Thiago tem 2 turnos na quarta', async () => {
    const { body } = await t.http().get('/api/doctors').expect(200);

    expect(body).toHaveLength(5);
    const doctorThiago = body.find(
      (doctor: { crm: string }) => doctor.crm === CRM.THIAGO,
    );
    expect(doctorThiago.workingWeekdays).toEqual([2, 3, 4, 5, 6]);
    expect(
      doctorThiago.shifts.filter(
        (shift: { weekday: number }) => shift.weekday === 3,
      ),
    ).toEqual([
      { weekday: 3, start: '08:00', end: '12:00' },
      { weekday: 3, start: '19:00', end: '22:00' },
    ]);
  });

  it('dia futuro: grade completa dos dois turnos (exame de 40 min)', async () => {
    const result = await availability(
      helena,
      EXAM.ULTRASSOM_ABDOMINAL_40,
      TOMORROW,
    );

    expect(times(result)).toEqual([
      '08:00',
      '08:40',
      '09:20',
      '10:00',
      '10:40',
      '11:20',
      '14:00',
      '14:40',
      '15:20',
      '16:00',
      '16:40',
      '17:20',
    ]);
    expect(result.slots[0]).toEqual({
      time: '08:00',
      startsAt: '2030-01-08T08:00:00.000-03:00',
      endsAt: '2030-01-08T08:40:00.000-03:00',
    });
  });

  it('hoje (agora = 10:00): só oferece horários a partir de agora', async () => {
    const result = await availability(
      helena,
      EXAM.ULTRASSOM_ABDOMINAL_40,
      TODAY,
    );

    expect(times(result)[0]).toBe('10:00');
    expect(times(result)).not.toContain('09:20');
  });

  it('remove horários que colidem com um agendamento existente', async () => {
    await t
      .http()
      .post('/api/appointments')
      .send({
        patientName: 'Paciente Existente',
        examId: EXAM.ULTRASSOM_ABDOMINAL_40,
        doctorId: helena,
        startsAt: `${TOMORROW}T09:20:00-03:00`,
      })
      .expect(201);

    // Exame de 30 min: 09:00 (até 09:30) e 09:30 colidem com 09:20–10:00.
    const result = await availability(helena, EXAM.MAMOGRAFIA_30, TOMORROW);
    expect(times(result)).toEqual(expect.arrayContaining(['08:30', '10:00']));
    expect(times(result)).not.toContain('09:00');
    expect(times(result)).not.toContain('09:30');
  });

  it('médico com dois turnos no dia (Dr. Thiago, quarta) recebe as duas grades', async () => {
    const result = await availability(
      thiago,
      EXAM.ULTRASSOM_ABDOMINAL_40,
      '2030-01-09',
    );

    expect(times(result)).toEqual([
      '08:00',
      '08:40',
      '09:20',
      '10:00',
      '10:40',
      '11:20',
      '19:00',
      '19:40',
      '20:20',
      '21:00', // turno de 3h / 40 min = 4 horários; 21:00 termina 21:40
    ]);
  });

  it.each([
    [SUNDAY, 'NOT_WORKING_DAY'],
    [YESTERDAY, 'PAST_DATE'],
  ])('%s: nenhum horário, com o motivo %s', async (date, reason) => {
    const result = await availability(helena, EXAM.RAIO_X_TORAX_20, date);

    expect(result.slots).toEqual([]);
    expect(result.unavailableReason).toBe(reason);
  });

  it.each([
    [
      'data inexistente',
      { examId: 1, date: '2030-02-30' },
      400,
      'INVALID_DATE',
    ],
    [
      'formato de data errado',
      { examId: 1, date: '08/01/2030' },
      400,
      'VALIDATION_ERROR',
    ],
    [
      'examId não numérico',
      { examId: 'abc', date: TOMORROW },
      400,
      'VALIDATION_ERROR',
    ],
    [
      'exame inexistente',
      { examId: 999, date: TOMORROW },
      404,
      'EXAM_NOT_FOUND',
    ],
  ])('%s -> %i %s', async (_case, query, status, code) => {
    const { body } = await t
      .http()
      .get(`/api/doctors/${helena}/availability`)
      .query(query)
      .expect(status);

    expect(body.code).toBe(code);
  });

  it('médico inexistente -> 404 DOCTOR_NOT_FOUND', async () => {
    const { body } = await t
      .http()
      .get('/api/doctors/9999/availability')
      .query({ examId: 1, date: TOMORROW })
      .expect(404);

    expect(body.code).toBe('DOCTOR_NOT_FOUND');
  });
});
