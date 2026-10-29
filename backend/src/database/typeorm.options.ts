import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { DoctorShift } from '../doctors/entities/doctor-shift.entity.js';
import { Doctor } from '../doctors/entities/doctor.entity.js';
import { Exam } from '../exams/entities/exam.entity.js';
import type { Env } from '../config/env.js';

/**
 * Lista explícita de entidades em vez de glob ("**\/*.entity.ts"):
 * globs dependem de extensão (.ts em dev, .js no build) e do diretório de
 * execução, o que costuma quebrar em ESM e dentro do Docker.
 */
export const entities = [Exam, Doctor, DoctorShift, Appointment];

const migrationsGlob = fileURLToPath(
  new URL('./migrations/*.{ts,js}', import.meta.url),
);

/**
 * Fonte única de configuração do TypeORM, usada pelo AppModule (runtime)
 * e pelo data-source.ts (CLI de migrations). Evita que as duas divirjam.
 */
export function buildTypeOrmOptions(
  env: Pick<Env, 'DATABASE_URL' | 'DATABASE_SSL'>,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    entities,
    migrations: [migrationsGlob],
    migrationsTableName: 'typeorm_migrations',
    // gen_random_uuid() é nativo desde o Postgres 13: dispensa a extensão uuid-ossp.
    uuidExtension: 'pgcrypto',
    // Extensões são criadas explicitamente na migration, não "magicamente" no
    // connect. Em produção o usuário da aplicação nem deve ter esse privilégio.
    installExtensions: false,
    // NUNCA true: o schema só muda via migration versionada e revisada.
    synchronize: false,
    logging: ['error', 'warn', 'migration'],
  };
}
