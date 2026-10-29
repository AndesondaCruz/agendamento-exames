import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.js';
import { buildTypeOrmOptions } from './typeorm.options.js';

/**
 * DataSource usado APENAS pelo CLI do TypeORM (migration:generate/run/revert)
 * e pelo seed. A aplicação Nest monta a conexão pelo TypeOrmModule.
 *
 * process.loadEnvFile é nativo do Node 21.7+, dispensando o pacote dotenv.
 * Variáveis já definidas no ambiente têm prioridade sobre o arquivo.
 * Em produção não existe .env: as variáveis vêm da plataforma de deploy.
 */
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const env = validateEnv(process.env);

/** .ts com tsx (dev) ou .js compilado (produção, dentro do container). */
const migrationsGlob = fileURLToPath(
  new URL('./migrations/*.{ts,js}', import.meta.url),
);

export default new DataSource({
  ...buildTypeOrmOptions(env),
  migrations: [migrationsGlob],
  migrationsTableName: 'typeorm_migrations',
});
