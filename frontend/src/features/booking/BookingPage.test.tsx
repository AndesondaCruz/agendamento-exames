import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Availability, Doctor, Exam } from '../../api/types';
import { BookingPage } from './BookingPage';

/**
 * Teste de integração do fluxo inteiro, do jeito que o paciente usa:
 * digita, clica e lê o que aparece na tela. A API é simulada no nível do
 * fetch, então cliente HTTP, hooks, reducer e componentes rodam de verdade.
 */

const EXAMS: Exam[] = [
  { id: 20, name: 'Ressonância Magnética de Crânio', durationMinutes: 40 },
  { id: 1, name: 'Raio-X de Tórax', durationMinutes: 20 },
];

const HELENA: Doctor = {
  id: 1,
  name: 'Dra. Helena Marques',
  crm: 'CRM-MG 11111',
  workingWeekdays: [1, 2, 3, 4, 5, 6, 7], // todos os dias: o teste não depende de quando roda
  shifts: [],
};

function availability(date: string, times: string[]): Availability {
  return {
    date,
    timezone: 'America/Sao_Paulo',
    doctor: { id: HELENA.id, name: HELENA.name },
    exam: EXAMS[0]!,
    unavailableReason: times.length ? null : 'NO_AVAILABLE_SLOTS',
    slots: times.map((time) => ({
      time,
      startsAt: `${date}T${time}:00.000-03:00`,
      endsAt: `${date}T${time}:00.000-03:00`,
    })),
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface FakeApi {
  availableTimes: string[];
  postResponses: Array<() => Response>;
  calls: Array<{ method: string; url: string; body?: unknown }>;
}

function installFakeApi(): FakeApi {
  const api: FakeApi = {
    availableTimes: ['08:00', '08:40', '14:00'],
    postResponses: [],
    calls: [],
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, 'http://localhost');
      const method = init?.method ?? 'GET';
      api.calls.push({
        method,
        url: url.pathname + url.search,
        body: init?.body && JSON.parse(String(init.body)),
      });

      if (url.pathname === '/api/exams') {
        const search = (url.searchParams.get('search') ?? '').toLowerCase();
        const normalize = (text: string) =>
          text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
        return json(
          200,
          EXAMS.filter((exam) =>
            normalize(exam.name).includes(normalize(search)),
          ),
        );
      }
      if (url.pathname === '/api/doctors') return json(200, [HELENA]);
      if (url.pathname === `/api/doctors/${HELENA.id}/availability`) {
        return json(
          200,
          availability(url.searchParams.get('date')!, api.availableTimes),
        );
      }
      if (url.pathname === '/api/appointments' && method === 'POST') {
        const next = api.postResponses.shift();
        if (next) return next();
      }
      return json(404, {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'not found',
      });
    }),
  );

  return api;
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BookingPage />
    </QueryClientProvider>,
  );
}

/** Exame -> médico -> (data pré-selecionada) -> horário 08:00 -> nome. */
async function fillUntilName(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/buscar exame/i), 'ressonancia');
  await user.click(
    await screen.findByRole('radio', {
      name: /Ressonância Magnética de Crânio/,
    }),
  );
  await user.click(
    await screen.findByRole('radio', { name: /Dra. Helena Marques/ }),
  );
  await user.click(await screen.findByRole('radio', { name: /^08:00/ }));
  await user.type(screen.getByLabelText(/nome completo/i), 'Maria da Silva');
}

describe('BookingPage (integração)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('agenda do início ao fim e mostra a confirmação', async () => {
    const api = installFakeApi();
    api.postResponses.push(() =>
      json(201, {
        id: 'a1b2c3d4-0000-4000-8000-000000000000',
        patientName: 'Maria da Silva',
        startsAt: '2030-01-07T08:00:00.000-03:00',
        endsAt: '2030-01-07T08:40:00.000-03:00',
        exam: EXAMS[0],
        doctor: { id: 1, name: HELENA.name, crm: HELENA.crm },
        createdAt: '2030-01-07T10:00:00.000Z',
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await fillUntilName(user);
    await user.click(
      screen.getByRole('button', { name: /confirmar agendamento/i }),
    );

    expect(
      await screen.findByRole('heading', { name: /agendamento confirmado/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('A1B2C3D4')).toBeInTheDocument();

    const post = api.calls.find((call) => call.method === 'POST');
    expect(post?.body).toEqual({
      patientName: 'Maria da Silva',
      examId: 20,
      doctorId: 1,
      startsAt: expect.stringMatching(/T08:00:00\.000-03:00$/),
    });
  });

  it('409: avisa no passo do horário, atualiza a agenda e preserva o nome digitado', async () => {
    const api = installFakeApi();
    api.postResponses.push(() =>
      json(409, {
        statusCode: 409,
        code: 'SLOT_UNAVAILABLE',
        message: 'conflito',
        path: '/',
        timestamp: '',
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await fillUntilName(user);
    const availabilityCallsBefore = api.calls.filter((call) =>
      call.url.includes('availability'),
    ).length;
    api.availableTimes = ['08:40', '14:00']; // 08:00 foi reservado por outra pessoa

    await user.click(
      screen.getByRole('button', { name: /confirmar agendamento/i }),
    );

    expect(
      await screen.findByText(/acabou de ser reservado por outra pessoa/i),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        api.calls.filter((call) => call.url.includes('availability')).length,
      ).toBeGreaterThan(availabilityCallsBefore),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('radio', { name: /^08:00/ }),
      ).not.toBeInTheDocument(),
    );

    // Escolhe outro horário: o nome digitado continua lá.
    await user.click(screen.getByRole('radio', { name: /^08:40/ }));
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue(
      'Maria da Silva',
    );
  });

  it('busca sem resultados mostra estado vazio com dica', async () => {
    installFakeApi();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/buscar exame/i), 'xyz');

    expect(
      await screen.findByText(/nenhum exame encontrado para “xyz”/i),
    ).toBeInTheDocument();
  });

  it('valida o nome antes de enviar (sem chamar a API)', async () => {
    const api = installFakeApi();
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/buscar exame/i), 'raio');
    await user.click(
      await screen.findByRole('radio', { name: /Raio-X de Tórax/ }),
    );
    await user.click(
      await screen.findByRole('radio', { name: /Dra. Helena Marques/ }),
    );
    await user.click(await screen.findByRole('radio', { name: /^08:00/ }));
    await user.type(screen.getByLabelText(/nome completo/i), 'Al');
    await user.click(
      screen.getByRole('button', { name: /confirmar agendamento/i }),
    );

    expect(await screen.findByText(/pelo menos 3 letras/i)).toBeInTheDocument();
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('erro de rede ao carregar médicos mostra mensagem e permite tentar de novo', async () => {
    installFakeApi();
    const realFetch = globalThis.fetch;
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/buscar exame/i), 'raio');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await user.click(
      await screen.findByRole('radio', { name: /Raio-X de Tórax/ }),
    );

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(/não foi possível conectar ao servidor/i),
    ).toBeInTheDocument();

    vi.stubGlobal('fetch', realFetch);
    await user.click(
      within(alert).getByRole('button', { name: /tentar novamente/i }),
    );
    expect(
      await screen.findByRole('radio', { name: /Dra. Helena Marques/ }),
    ).toBeInTheDocument();
  });
});
