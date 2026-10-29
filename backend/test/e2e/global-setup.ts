import { execFileSync } from 'node:child_process';

/**
 * Roda UMA vez antes de todos os testes e2e: aplica as migrations e o seed
 * no banco de teste usando os MESMOS comandos de produção (CLI do TypeORM e
 * script de seed). Se uma migration quebrar, o e2e quebra junto.
 */
export default function setup(): void {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://app:app@localhost:5432/agendamento_test';

  // Trava de segurança: os testes apagam agendamentos. Nunca rodar fora de um banco *_test.
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Banco de teste deve terminar em "_test" (recebido: "${databaseName}"). Abortando para proteger os dados.`,
    );
  }

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: 'false',
  };
  const run = (args: string[]) =>
    execFileSync('npx', args, { env, stdio: 'pipe' });

  try {
    run([
      'tsx',
      './node_modules/typeorm/cli.js',
      '-d',
      'src/database/data-source.ts',
      'migration:run',
    ]);
    run(['tsx', 'src/database/seeds/seed.ts']);
  } catch (error) {
    const output =
      (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(
      `Falha ao preparar o banco de teste (${databaseName}). Ele existe?\n` +
        `Crie com: docker exec agendamento-db createdb -U app ${databaseName}\n\n${output}`,
    );
  }
}
