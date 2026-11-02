import { randomUUID } from 'node:crypto';
import { createTestApp, PATIENT, type TestApp } from './test-app.js';

/**
 * Rate limiting contra o limitador REAL (o mesmo guard, o mesmo módulo e o
 * mesmo filtro de erros de produção). Só os NÚMEROS mudam: aqui os limites
 * são baixos para dar para estourá-los em poucas chamadas.
 *
 * Nenhum destes pedidos cria agendamento: consulta e cancelamento de algo
 * que não existe respondem 404, e corpo vazio responde 400. Interessa aqui
 * quantos pedidos o IP pode fazer, não o que cada um devolve.
 */
describe('Rate limiting (e2e)', () => {
  let t: TestApp | undefined;

  afterEach(async () => {
    await t?.close();
    t = undefined;
  });

  const app = async (options: Parameters<typeof createTestApp>[0]) =>
    (t = await createTestApp(options));

  const lookup = (client?: string) => {
    const req = t!.http().post('/api/appointments/lookup');
    if (client) req.set('X-Forwarded-For', client);
    return req.send({ protocol: 'A1B2C3D4', patientCpf: PATIENT.patientCpf });
  };

  const cancel = () =>
    t!
      .http()
      .post(`/api/appointments/${randomUUID()}/cancel`)
      .send({ patientCpf: PATIENT.patientCpf });

  const create = () => t!.http().post('/api/appointments').send({});

  it('depois do limite, responde 429 no formato de erro da API, com Retry-After', async () => {
    await app({ rateLimit: { limits: { lookup: 3 } } });

    for (let i = 0; i < 3; i++) await lookup().expect(404);
    const response = await lookup().expect(429);

    expect(response.body).toMatchObject({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
      path: '/api/appointments/lookup',
    });
    expect(response.body.message).toMatch(
      /^Muitas tentativas\. Aguarde \d+ segundos e tente novamente\.$/,
    );
    // Cabeçalho padrão (segundos), sem o sufixo do balde do pacote.
    const retryAfter = Number(response.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(response.headers).not.toHaveProperty('retry-after-lookup');
  });

  it('cada rota tem o seu contador, e rotas sem limite nunca são barradas', async () => {
    await app({ rateLimit: { limits: { lookup: 2, cancel: 2 } } });

    await lookup().expect(404);
    await lookup().expect(404);
    await lookup().expect(429);

    // Consultar esgotou o limite da consulta, não o do cancelamento.
    await cancel().expect(404);
    await cancel().expect(404);
    await cancel().expect(429);

    // Listar exames não é limitado.
    for (let i = 0; i < 5; i++) await t!.http().get('/api/exams').expect(200);
  });

  it('pedido com corpo inválido também gasta o limite (o guard roda antes da validação)', async () => {
    await app({ rateLimit: { limits: { create: 2 } } });

    await create().expect(400);
    await create().expect(400);
    await create().expect(429);
  });

  it('o limite é por IP: outro cliente não é afetado', async () => {
    await app({ rateLimit: { limits: { lookup: 1 } } });

    await lookup('10.0.0.1').expect(404);
    await lookup('10.0.0.1').expect(429);
    await lookup('10.0.0.2').expect(404);
  });

  it('com TRUST_PROXY_HOPS=1, o que o cliente escreve no X-Forwarded-For não vale: só o último salto', async () => {
    await app({ rateLimit: { limits: { lookup: 1 } } });

    // O proxy acrescenta o IP REAL (10.0.0.9) ao final. O cliente forjou o
    // começo da lista, mas o contador usa o último valor e é o mesmo.
    await lookup('1.1.1.1, 10.0.0.9').expect(404);
    await lookup('2.2.2.2, 10.0.0.9').expect(429);
  });

  it('o limite libera de novo quando a janela passa', async () => {
    await app({ rateLimit: { windowSeconds: 1, limits: { lookup: 1 } } });

    await lookup().expect(404);
    await lookup().expect(429);

    await new Promise((resolve) => setTimeout(resolve, 1300));

    await lookup().expect(404);
  });
});
