import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita a busca de exames sem diferenciar acentos:
 * unaccent('Ressonância') = 'Ressonancia'.
 *
 * Sem índice de propósito: com 30 exames, um seq scan é instantâneo.
 * Num catálogo grande, o próximo passo seria uma função IMMUTABLE envolvendo
 * unaccent + índice trigram (pg_trgm) para ILIKE '%termo%'.
 */
export class AddUnaccentExtension1793280533031 implements MigrationInterface {
  name = 'AddUnaccentExtension1793280533031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
