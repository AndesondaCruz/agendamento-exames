import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cancelamento sem apagar dados: status + data do cancelamento.
 *
 * A exclusion constraint é recriada com WHERE (status = 'SCHEDULED'): um
 * agendamento cancelado deixa de ocupar o horário, que volta a ficar livre.
 * Os agendamentos existentes recebem 'SCHEDULED' pelo DEFAULT.
 */
export class AddAppointmentStatus1793900100000 implements MigrationInterface {
  name = 'AddAppointmentStatus1793900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments"
         ADD "status" character varying(10) NOT NULL DEFAULT 'SCHEDULED',
         ADD "cancelled_at" TIMESTAMP WITH TIME ZONE,
         ADD CONSTRAINT "appointments_status_valid" CHECK ("status" IN ('SCHEDULED', 'CANCELLED'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_overlap"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
         EXCLUDE USING gist ("doctor_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
         WHERE ("status" = 'SCHEDULED')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Voltar a regra antiga exige que nenhum horário ativo e cancelado se
    // sobreponha; os cancelados são removidos, porque o schema antigo não
    // tem como representá-los.
    await queryRunner.query(
      `DELETE FROM "appointments" WHERE "status" = 'CANCELLED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_overlap"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
         EXCLUDE USING gist ("doctor_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments"
         DROP CONSTRAINT "appointments_status_valid",
         DROP COLUMN "cancelled_at",
         DROP COLUMN "status"`,
    );
  }
}
