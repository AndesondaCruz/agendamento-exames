import { readFile } from 'node:fs/promises';
import { DoctorShift } from '../../doctors/entities/doctor-shift.entity.js';
import { Doctor } from '../../doctors/entities/doctor.entity.js';
import { Exam } from '../../exams/entities/exam.entity.js';
import dataSource from '../data-source.js';
import { doctorsSeedData, timeToMinutes } from './doctors.seed-data.js';
import { parseExamsCsv } from './exams-csv.parser.js';

const EXAMS_CSV_PATH = new URL('../../../data/exames.csv', import.meta.url);

/**
 * Seed idempotente: pode rodar N vezes sem duplicar dados.
 * - Exames: upsert pelo id do catálogo.
 * - Médicos: upsert pelo CRM (chave natural); turnos são recriados.
 *
 * Tudo numa única transação: ou o catálogo inteiro entra, ou nada entra.
 */
async function seed(): Promise<void> {
  const exams = parseExamsCsv(await readFile(EXAMS_CSV_PATH, 'utf-8'));

  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      await manager.upsert(Exam, exams, ['id']);

      for (const doctorSeed of doctorsSeedData) {
        await manager.upsert(
          Doctor,
          { name: doctorSeed.name, crm: doctorSeed.crm },
          ['crm'],
        );
        const doctor = await manager.findOneByOrFail(Doctor, {
          crm: doctorSeed.crm,
        });

        await manager.delete(DoctorShift, { doctorId: doctor.id });
        await manager.insert(
          DoctorShift,
          doctorSeed.shifts.flatMap((shift) =>
            shift.weekdays.map((weekday) => ({
              doctorId: doctor.id,
              weekday,
              startMinute: timeToMinutes(shift.start),
              endMinute: timeToMinutes(shift.end),
            })),
          ),
        );
      }
    });

    console.log(
      `Seed concluído: ${exams.length} exames, ${doctorsSeedData.length} médicos.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: unknown) => {
  console.error('Falha no seed:', error);
  process.exitCode = 1;
});
