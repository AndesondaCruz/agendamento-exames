import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { Clock, FixedClock } from '../../src/common/time/clock.js';

/**
 * "Agora" congelado em todos os e2e: segunda-feira, 07/01/2030, 10:00 em
 * São Paulo (13:00 UTC). Com o relógio fixo, os testes dão o mesmo resultado
 * hoje, daqui a um ano e no CI.
 */
export const NOW = new Date('2030-01-07T13:00:00.000Z');
export const TODAY = '2030-01-07'; // segunda (Helena: 08–12 e 14–18)
export const TOMORROW = '2030-01-08';
export const SUNDAY = '2030-01-13';
export const YESTERDAY = '2030-01-06';

export interface TestApp {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  dataSource: DataSource;
  doctorIdByCrm: (crm: string) => Promise<number>;
  resetAppointments: () => Promise<void>;
  close: () => Promise<void>;
}

export async function createTestApp(now: Date = NOW): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(new FixedClock(now))
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app); // mesmos pipes, filtros e prefixo de produção
  await app.init();

  const dataSource = app.get(DataSource);

  return {
    app,
    http: () => request(app.getHttpServer()),
    dataSource,
    doctorIdByCrm: async (crm) => {
      const [row] = await dataSource.query<{ id: number }[]>(
        'SELECT id FROM doctors WHERE crm = $1',
        [crm],
      );
      return row.id;
    },
    resetAppointments: async () => {
      await dataSource.query('TRUNCATE TABLE appointments');
    },
    close: () => app.close(),
  };
}

export const CRM = {
  HELENA: 'CRM-MG 11111',
  RAFAEL: 'CRM-MG 22222',
  BEATRIZ: 'CRM-MG 33333',
  THIAGO: 'CRM-MG 44444',
  CAMILA: 'CRM-MG 55555',
} as const;

/** Ids do catálogo oficial (exames.csv). */
export const EXAM = {
  RAIO_X_TORAX_20: 1,
  MAMOGRAFIA_30: 6,
  ULTRASSOM_ABDOMINAL_40: 7,
} as const;
