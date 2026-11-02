import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import type { Appointment, Availability, Doctor, Exam } from '../api/types';
import { auditAccessibility } from './axe';

/**
 * Acessibilidade estrutural de cada tela e estado do fluxo, com axe-core
 * (WCAG 2.0/2.1 A e AA). Renderiza o <App /> inteiro, então cabeçalho,
 * navegação, <main> e rodapé entram na auditoria junto com a tela.
 *
 * O que estes testes NÃO cobrem: contraste de cor (o jsdom não tem layout
 * nem CSS) e uso real com leitor de tela. Veja src/test/axe.ts.
 */

const EXAM: Exam = {
  id: 20,
  name: 'Ressonância Magnética de Crânio',
  durationMinutes: 40,
};

const HELENA: Doctor = {
  id: 1,
  name: 'Dra. Helena Marques',
  crm: 'CRM-MG 11111',
  workingWeekdays: [1, 2, 3, 4, 5, 6, 7],
  shifts: [],
};

const SCHEDULED: Appointment = {
  id: 'a1b2c3d4-0000-4000-8000-000000000000',
  protocol: 'A1B2C3D4',
  status: 'SCHEDULED',
  cancelledAt: null,
  patientName: 'Maria da Silva',
  patientCpfMasked: '***.982.247-**',
  startsAt: '2030-01-07T08:00:00.000-03:00',
  endsAt: '2030-01-07T08:40:00.000-03:00',
  exam: EXAM,
  doctor: { id: HELENA.id, name: HELENA.name, crm: HELENA.crm },
  createdAt: '2030-01-05T10:00:00.000Z',
};

const CANCELLED: Appointment = {
  ...SCHEDULED,
  status: 'CANCELLED',
  cancelledAt: '2030-01-06T12:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function availability(date: string): Availability {
  const times = ['08:00', '08:40', '14:00'];
  return {
    date,
    timezone: 'America/Sao_Paulo',
    doctor: { id: HELENA.id, name: HELENA.name },
    exam: EXAM,
    unavailableReason: null,
    slots: times.map((time) => ({
      time,
      startsAt: `${date}T${time}:00.000-03:00`,
      endsAt: `${date}T${time}:00.000-03:00`,
    })),
  };
}

/** API simulada no fetch: cliente HTTP, hooks e componentes rodam de verdade. */
function installFakeApi(
  overrides: { lookup?: () => Response; create?: () => Response } = {},
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, 'http://localhost');
      const method = init?.method ?? 'GET';

      if (url.pathname === '/api/exams') return json(200, [EXAM]);
      if (url.pathname === '/api/doctors') return json(200, [HELENA]);
      if (url.pathname === `/api/doctors/${HELENA.id}/availability`) {
        return json(200, availability(url.searchParams.get('date')!));
      }
      if (url.pathname === '/api/appointments' && method === 'POST') {
        return (overrides.create ?? (() => json(201, SCHEDULED)))();
      }
      if (url.pathname === '/api/appointments/lookup') {
        return (overrides.lookup ?? (() => json(200, SCHEDULED)))();
      }
      if (url.pathname.endsWith('/cancel')) return json(200, CANCELLED);
      return json(404, { statusCode: 404, code: 'NOT_FOUND', message: '-' });
    }),
  );
}

/** O App escolhe a tela pelo hash da URL ao montar. */
function renderApp(hash: '#agendar' | '#meu-agendamento') {
  window.location.hash = hash;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function expectAccessible(container: HTMLElement) {
  expect(await auditAccessibility(container)).toEqual([]);
}

async function pickSlot(user: User) {
  await user.type(screen.getByLabelText(/buscar exame/i), 'ressonancia');
  await user.click(
    await screen.findByRole('radio', { name: /Ressonância Magnética/ }),
  );
  await user.click(
    await screen.findByRole('radio', { name: /Dra. Helena Marques/ }),
  );
  await user.click(await screen.findByRole('radio', { name: /^08:00/ }));
}

async function fillPatient(user: User, cpf = '52998224725') {
  await user.type(screen.getByLabelText(/nome completo/i), 'Maria da Silva');
  await user.type(screen.getByLabelText(/^cpf/i), cpf);
  await user.type(screen.getByLabelText(/nascimento/i), '1990-05-20');
  await user.type(screen.getByLabelText(/telefone/i), '85987654321');
}

async function lookup(user: User, protocol = 'A1B2C3D4', cpf = '52998224725') {
  await user.type(screen.getByLabelText(/protocolo/i), protocol);
  await user.type(screen.getByLabelText(/cpf do paciente/i), cpf);
  await user.click(
    screen.getByRole('button', { name: /consultar agendamento/i }),
  );
}

// O axe leva algumas centenas de ms por tela no jsdom.
describe('Acessibilidade (axe-core, WCAG 2.1 AA)', { timeout: 20_000 }, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = '';
  });

  it('o próprio axe detecta problemas (o teste não passa por vazio)', async () => {
    const { container } = render(
      <div>
        <img src="x.png" />
        <button />
      </div>,
    );

    const violations = await auditAccessibility(container);

    expect(violations.join('\n')).toMatch(/image-alt/);
    expect(violations.join('\n')).toMatch(/button-name/);
  });

  describe('Agendar exame', () => {
    it('tela inicial (busca de exame)', async () => {
      installFakeApi();
      const { container } = renderApp('#agendar');

      await screen.findByLabelText(/buscar exame/i);

      await expectAccessible(container);
    });

    it('exame, médico e horário escolhidos, com o formulário do paciente', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#agendar');

      await pickSlot(user);
      await screen.findByLabelText(/nome completo/i);

      await expectAccessible(container);
    });

    it('formulário com erros de validação', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#agendar');

      await pickSlot(user);
      await fillPatient(user, '52998224724'); // último dígito errado
      await user.click(
        screen.getByRole('button', { name: /confirmar agendamento/i }),
      );
      await screen.findByText(/cpf inválido/i);

      await expectAccessible(container);
    });

    it('erro de servidor ao agendar', async () => {
      installFakeApi({
        create: () =>
          json(500, { statusCode: 500, code: 'INTERNAL_ERROR', message: '-' }),
      });
      const user = userEvent.setup();
      const { container } = renderApp('#agendar');

      await pickSlot(user);
      await fillPatient(user);
      await user.click(
        screen.getByRole('button', { name: /confirmar agendamento/i }),
      );
      await screen.findByRole('alert');

      await expectAccessible(container);
    });

    it('confirmação do agendamento', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#agendar');

      await pickSlot(user);
      await fillPatient(user);
      await user.click(
        screen.getByRole('button', { name: /confirmar agendamento/i }),
      );
      await screen.findByRole('heading', { name: /agendamento confirmado/i });

      await expectAccessible(container);
    });
  });

  describe('Meu agendamento', () => {
    it('formulário de consulta', async () => {
      installFakeApi();
      const { container } = renderApp('#meu-agendamento');

      await screen.findByLabelText(/protocolo/i);

      await expectAccessible(container);
    });

    it('formulário de consulta com erros de validação', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#meu-agendamento');

      await lookup(user, 'a1b2', '11111111111');
      await screen.findByText(/o protocolo tem 8 caracteres/i);

      await expectAccessible(container);
    });

    it('agendamento não encontrado', async () => {
      installFakeApi({
        lookup: () =>
          json(404, {
            statusCode: 404,
            code: 'NOT_FOUND',
            message: 'Nenhum agendamento encontrado.',
          }),
      });
      const user = userEvent.setup();
      const { container } = renderApp('#meu-agendamento');

      await lookup(user);
      await screen.findByRole('alert');

      await expectAccessible(container);
    });

    it('agendamento encontrado', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#meu-agendamento');

      await lookup(user);
      await screen.findByRole('heading', { name: /seu agendamento/i });

      await expectAccessible(container);
    });

    it('pedido de confirmação do cancelamento', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#meu-agendamento');

      await lookup(user);
      await user.click(
        await screen.findByRole('button', { name: /^cancelar exame$/i }),
      );
      await screen.findByRole('button', { name: /sim, cancelar/i });

      await expectAccessible(container);
    });

    it('agendamento cancelado', async () => {
      installFakeApi();
      const user = userEvent.setup();
      const { container } = renderApp('#meu-agendamento');

      await lookup(user);
      await user.click(
        await screen.findByRole('button', { name: /^cancelar exame$/i }),
      );
      await user.click(screen.getByRole('button', { name: /sim, cancelar/i }));
      await screen.findByRole('heading', { name: /agendamento cancelado/i });

      await expectAccessible(container);
    });
  });
});
