import { defineConfig } from 'vitest/config';

/**
 * Testes e2e: sobem a aplicação Nest completa contra um Postgres REAL
 * (banco separado, *_test), passando por HTTP, pipes, filtros e constraints.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://app:app@localhost:5432/agendamento_test';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/e2e/global-setup.ts'],
    // Os arquivos compartilham o mesmo banco: rodam em sequência, não em paralelo.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      DATABASE_SSL: 'false',
      CLINIC_TIMEZONE: 'America/Sao_Paulo',
    },
  },
});
