import { createTestApp, type TestApp } from './test-app.js';

interface OpenApiDoc {
  paths: Record<
    string,
    Record<
      string,
      {
        responses: Record<
          string,
          { content?: Record<string, { examples?: Record<string, unknown> }> }
        >;
      }
    >
  >;
}

/**
 * A documentação também é contrato: cada endpoint deve documentar os
 * códigos de erro que ele REALMENTE devolve.
 */
describe('Swagger / OpenAPI (e2e)', () => {
  let t: TestApp;
  let doc: OpenApiDoc;

  const exampleCodes = (path: string, method: string, status: string) =>
    Object.keys(
      doc.paths[path]?.[method]?.responses[status]?.content?.[
        'application/json'
      ]?.examples ?? {},
    );

  beforeAll(async () => {
    t = await createTestApp();
    doc = (await t.http().get('/api/docs-json').expect(200)).body as OpenApiDoc;
  });

  afterAll(() => t.close());

  it('documenta os 4 endpoints de negócio e o health check', () => {
    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        '/api/exams',
        '/api/doctors',
        '/api/doctors/{doctorId}/availability',
        '/api/appointments',
        '/api/appointments/{id}',
        '/api/health',
      ]),
    );
  });

  it('a busca de exames documenta só VALIDATION_ERROR (nada de 409)', () => {
    expect(exampleCodes('/api/exams', 'get', '400')).toEqual([
      'VALIDATION_ERROR',
    ]);
    expect(doc.paths['/api/exams']?.get?.responses['409']).toBeUndefined();
  });

  it('o agendamento documenta cada código de erro possível', () => {
    expect(exampleCodes('/api/appointments', 'post', '409')).toEqual([
      'SLOT_UNAVAILABLE',
    ]);
    expect(exampleCodes('/api/appointments', 'post', '422')).toEqual([
      'SLOT_IN_PAST',
      'OUTSIDE_WORKING_HOURS',
      'SLOT_NOT_ON_GRID',
    ]);
    expect(exampleCodes('/api/appointments', 'post', '404')).toEqual(
      expect.arrayContaining(['EXAM_NOT_FOUND', 'DOCTOR_NOT_FOUND']),
    );
  });
});
