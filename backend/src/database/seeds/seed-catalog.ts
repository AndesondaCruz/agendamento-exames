import { readFile } from 'node:fs/promises';
import type { DataSource } from 'typeorm';
import { DoctorShift } from '../../doctors/entities/doctor-shift.entity.js';
import { Doctor } from '../../doctors/entities/doctor.entity.js';
import { Exam } from '../../exams/entities/exam.entity.js';
import { doctorsSeedData, timeToMinutes } from './doctors.seed-data.js';
import { parseExamsCsv } from './exams-csv.parser.js';

const EXAMS_CSV_PATH = new URL('../../../data/exames.csv', import.meta.url);

/**
 * Popula o catálogo (exames + médicos e turnos). Reutilizado pelo script
 * `npm run seed` e pelos testes e2e, para os dois usarem o mesmo código.
 *
 * Idempotente: exames por id, médicos pelo CRM (chave natural); turnos são
 * recriados. Tudo numa única transação: ou o catálogo inteiro entra, ou nada.
 */
export async function seedCatalog(
  dataSource: DataSource,
): Promise<{ exams: number; doctors: number }> {
  const exams = parseExamsCsv(await readFile(EXAMS_CSV_PATH, 'utf-8'));

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

  return { exams: exams.length, doctors: doctorsSeedData.length };
}
