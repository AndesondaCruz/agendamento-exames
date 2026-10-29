import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { validateEnv } from '../config/env.js';
import { buildTypeOrmOptions } from './typeorm.options.js';

/**
 * DataSource usado APENAS pelo CLI do TypeORM (migration:generate/run/revert)
 * e pelo seed. A aplicação Nest monta a conexão pelo TypeOrmModule.
 *
 * process.loadEnvFile é nativo do Node 21.7+, dispensando o pacote dotenv.
 * Em produção não existe .env: as variáveis vêm da plataforma de deploy.
 */
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const env = validateEnv(process.env);

export default new DataSource(buildTypeOrmOptions(env));
