import dataSource from '../data-source.js';
import { seedCatalog } from './seed-catalog.js';

/** Script `npm run seed`: abre a conexão, popula o catálogo e fecha. */
async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const result = await seedCatalog(dataSource);
    console.log(
      `Seed concluído: ${result.exams} exames, ${result.doctors} médicos.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Falha no seed:', error);
  process.exitCode = 1;
});
