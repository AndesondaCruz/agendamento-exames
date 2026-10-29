import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793273963056 implements MigrationInterface {
  name = 'InitialSchema1793273963056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionado manualmente: o TypeORM não gera extensões.
    // btree_gist permite usar "doctor_id WITH =" (tipo escalar) dentro do
    // índice GiST da exclusion constraint "appointments_no_overlap".
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(
      `CREATE TABLE "doctor_shifts" ("id" SERIAL NOT NULL, "doctor_id" integer NOT NULL, "weekday" smallint NOT NULL, "start_minute" smallint NOT NULL, "end_minute" smallint NOT NULL, CONSTRAINT "doctor_shifts_valid_range" CHECK ("start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute"), CONSTRAINT "doctor_shifts_weekday_iso" CHECK ("weekday" BETWEEN 1 AND 7), CONSTRAINT "PK_8c0f510d42bb2948addbdd4021b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db7d9b80e8918219088399393e" ON "doctor_shifts"  ("doctor_id", "weekday") `,
    );
    await queryRunner.query(
      `CREATE TABLE "doctors" ("id" SERIAL NOT NULL, "name" character varying(120) NOT NULL, "crm" character varying(30) NOT NULL, CONSTRAINT "UQ_d7e8212b37dd4e61e996d7289cd" UNIQUE ("crm"), CONSTRAINT "PK_8207e7889b50ee3695c2b8154ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "exams" ("id" integer NOT NULL, "name" character varying(120) NOT NULL, "duration_minutes" smallint NOT NULL, CONSTRAINT "exams_duration_positive" CHECK ("duration_minutes" > 0), CONSTRAINT "PK_b43159ee3efa440952794b4f53e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "patient_name" character varying(120) NOT NULL, "doctor_id" integer NOT NULL, "exam_id" integer NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "appointments_valid_interval" CHECK ("starts_at" < "ends_at"), CONSTRAINT "appointments_no_overlap" EXCLUDE USING gist ("doctor_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&), CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61b21de264d840939821359faf" ON "appointments"  ("doctor_id", "starts_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_shifts" ADD CONSTRAINT "FK_a4a795dca2ff99a71ef436bbb5d" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_4cf26c3f972d014df5c68d503d2" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_f386121e2d22adb229dc12869d2" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_f386121e2d22adb229dc12869d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_4cf26c3f972d014df5c68d503d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_shifts" DROP CONSTRAINT "FK_a4a795dca2ff99a71ef436bbb5d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61b21de264d840939821359faf"`,
    );
    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TABLE "exams"`);
    await queryRunner.query(`DROP TABLE "doctors"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db7d9b80e8918219088399393e"`,
    );
    await queryRunner.query(`DROP TABLE "doctor_shifts"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS btree_gist`);
  }
}
