import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Appointment } from '../../api/types';
import { ManageAppointmentPage } from './ManageAppointmentPage';

/**
 * Fluxo de consultar e cancelar do jeito que o paciente usa. A API é
 * simulada no fetch: cliente HTTP, hooks e componentes rodam de verdade.
 */

const NOW = new Date('2030-01-06T12:00:00.000Z');

const SCHEDULED: Appointment = {
  id: 'a1b2c3d4-0000-4000-8000-000000000000',
  protocol: 'A1B2C3D4',
  status: 'SCHEDULED',
  cancelledAt: null,
  patientName: 'Maria da Silva',
  patientCpfMasked: '***.982.247-**',
  startsAt: '2030-01-07T08:00:00.000-03:00',
  endsAt: '2030-01-07T08:40:00.000-03:00',
  exam: {
    id: 20,
    name: 'Ressonância Magnética de Crânio',
    durationMinutes: 40,
  },
  doctor: { id: 1, name: 'Dra. Helena Marques', crm: 'CRM-MG 11111' },
  createdAt: '2030-01-05T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type Handler = () => Response;

function installFakeApi(handlers: { lookup?: Handler; cancel?: Handler }) {
  const calls: Array<{ url: string; body: unknown }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, 'http://localhost').pathname;
      calls.push({ url, body: init?.body && JSON.parse(String(init.body)) });
      if (url === '/api/appointments/lookup' && handlers.lookup) {
        return handlers.lookup();
      }
      if (url.endsWith('/cancel') && handlers.cancel) return handlers.cancel();
      return json(500, { statusCode: 500, code: 'X', message: 'inesperado' });
    }),
  );
  return calls;
}

function renderPage(now = NOW) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ManageAppointmentPage now={() => now} />
    </QueryClientProvider>,
  );
}

async function search(
  user: ReturnType<typeof userEvent.setup>,
  protocol = 'a1b2c3d4',
  cpf = '52998224725',
) {
  await user.type(screen.getByLabelText(/protocolo/i), protocol);
  await user.type(screen.getByLabelText(/cpf do paciente/i), cpf);
  await user.click(
    screen.getByRole('button', { name: /consultar agendamento/i }),
  );
}

describe('ManageAppointmentPage (integração)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('consulta pelo protocolo e CPF, envia só dígitos e mostra o agendamento', async () => {
    const calls = installFakeApi({ lookup: () => json(200, SCHEDULED) });
    const user = userEvent.setup();
    renderPage();

    await search(user);

    expect(
      await screen.findByRole('heading', { name: /seu agendamento/i }),
    ).toHaveFocus();
    expect(screen.getByText('Agendado')).toBeInTheDocument();
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
    expect(calls[0]).toEqual({
      url: '/api/appointments/lookup',
      body: { protocol: 'A1B2C3D4', patientCpf: '52998224725' },
    });
  });

  it('não chama a API com dados inválidos e leva o foco ao primeiro erro', async () => {
    const calls = installFakeApi({});
    const user = userEvent.setup();
    renderPage();

    await search(user, 'a1b2', '11111111111');

    expect(screen.getByLabelText(/protocolo/i)).toHaveFocus();
    expect(screen.getByText(/o protocolo tem 8 caracteres/i)).toBeVisible();
    expect(screen.getByText(/informe um cpf válido/i)).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  it('protocolo ou CPF que não conferem: mostra a mensagem da API', async () => {
    installFakeApi({
      lookup: () =>
        json(404, {
          statusCode: 404,
          code: 'NOT_FOUND',
          message:
            'Nenhum agendamento encontrado com esse protocolo e CPF. Confira os dados.',
        }),
    });
    const user = userEvent.setup();
    renderPage();

    await search(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /nenhum agendamento encontrado/i,
    );
  });

  it('cancela com confirmação e mostra o status atualizado', async () => {
    const calls = installFakeApi({
      lookup: () => json(200, SCHEDULED),
      cancel: () =>
        json(200, {
          ...SCHEDULED,
          status: 'CANCELLED',
          cancelledAt: NOW.toISOString(),
        }),
    });
    const user = userEvent.setup();
    renderPage();
    await search(user);

    await user.click(
      await screen.findByRole('button', { name: /^cancelar exame$/i }),
    );
    // Nada foi enviado ainda: cancelar pede confirmação.
    expect(calls).toHaveLength(1);
    const confirm = screen.getByRole('button', { name: /sim, cancelar/i });
    expect(confirm).toHaveFocus();

    await user.click(confirm);

    expect(
      await screen.findByRole('heading', { name: /agendamento cancelado/i }),
    ).toHaveFocus();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText(/horário foi liberado/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cancelar exame/i }),
    ).not.toBeInTheDocument();
    expect(calls[1]).toEqual({
      url: `/api/appointments/${SCHEDULED.id}/cancel`,
      body: { patientCpf: '52998224725' },
    });
  });

  it('"Manter agendamento" desiste sem chamar a API', async () => {
    const calls = installFakeApi({ lookup: () => json(200, SCHEDULED) });
    const user = userEvent.setup();
    renderPage();
    await search(user);

    await user.click(
      await screen.findByRole('button', { name: /^cancelar exame$/i }),
    );
    await user.click(screen.getByRole('button', { name: /manter/i }));

    expect(calls).toHaveLength(1);
    expect(screen.getByText('Agendado')).toBeInTheDocument();
  });

  it('exame que já passou: não oferece cancelar', async () => {
    installFakeApi({ lookup: () => json(200, SCHEDULED) });
    const user = userEvent.setup();
    renderPage(new Date('2030-01-07T12:00:00.000Z'));
    await search(user);

    expect(
      await screen.findByText(/já começou ou já passou/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /cancelar exame/i }),
    ).not.toBeInTheDocument();
  });

  it('se a API recusar o cancelamento, explica o motivo', async () => {
    installFakeApi({
      lookup: () => json(200, SCHEDULED),
      cancel: () =>
        json(422, {
          statusCode: 422,
          code: 'CANCELLATION_NOT_ALLOWED',
          message: 'texto técnico',
        }),
    });
    const user = userEvent.setup();
    renderPage();
    await search(user);

    await user.click(
      await screen.findByRole('button', { name: /^cancelar exame$/i }),
    );
    await user.click(screen.getByRole('button', { name: /sim, cancelar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não pode mais ser cancelado/i,
    );
  });
});
