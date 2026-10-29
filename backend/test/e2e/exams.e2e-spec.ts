import { createTestApp, type TestApp } from './test-app.js';

describe('GET /api/exams (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(() => t.close());

  it('sem busca, devolve o catálogo inteiro (30) em ordem alfabética', async () => {
    const { body } = await t.http().get('/api/exams').expect(200);

    expect(body).toHaveLength(30);
    expect(body[0].name).toBe('Angiotomografia Coronariana');
    expect(body.at(-1).name).toBe('Ultrassonografia Transvaginal');
  });

  it('ignora acentos e maiúsculas: "RESSONANCIA" encontra os 4 exames de Ressonância', async () => {
    const { body } = await t
      .http()
      .get('/api/exams')
      .query({ search: 'RESSONANCIA' })
      .expect(200);

    expect(body).toHaveLength(4);
    expect(
      body.every((exam: { name: string }) =>
        exam.name.startsWith('Ressonância'),
      ),
    ).toBe(true);
  });

  it('cada exame traz id, nome e duração', async () => {
    const { body } = await t
      .http()
      .get('/api/exams')
      .query({ search: 'tórax' })
      .expect(200);

    expect(body).toContainEqual({
      id: 1,
      name: 'Raio-X de Tórax',
      durationMinutes: 20,
    });
  });

  it('trata "%" e "_" como texto literal (não como curinga do LIKE)', async () => {
    await t.http().get('/api/exams').query({ search: '%' }).expect(200, []);
    await t.http().get('/api/exams').query({ search: '_' }).expect(200, []);
  });

  it('termo sem resultados devolve lista vazia (não erro)', async () => {
    await t.http().get('/api/exams').query({ search: 'xyz' }).expect(200, []);
  });

  it('é imune a SQL Injection (o termo vai como parâmetro)', async () => {
    await t
      .http()
      .get('/api/exams')
      .query({ search: "'; DROP TABLE exams; --" })
      .expect(200, []);

    const { body } = await t.http().get('/api/exams').expect(200);
    expect(body).toHaveLength(30); // a tabela continua lá
  });

  it('rejeita busca com mais de 100 caracteres (400)', async () => {
    const { body } = await t
      .http()
      .get('/api/exams')
      .query({ search: 'a'.repeat(101) })
      .expect(400);

    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
