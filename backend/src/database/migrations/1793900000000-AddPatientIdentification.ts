import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Identificação do paciente (CPF, nascimento, telefone, e-mail).
 *
 * As colunas aceitam NULL porque agendamentos antigos não têm esses dados;
 * a API exige todos (menos o e-mail) em agendamentos novos. As CHECKs
 * garantem o formato no próprio banco: só dígitos, no tamanho certo.
 */
export class AddPatientIdentification1793900000000 implements MigrationInterface {
  name = 'AddPatientIdentification1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments"
         ADD "patient_cpf" character(11),
         ADD "patient_birth_date" date,
         ADD "patient_phone" character varying(11),
         ADD "patient_email" character varying(254)`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments"
         ADD CONSTRAINT "appointments_patient_cpf_digits" CHECK ("patient_cpf" ~ '^[0-9]{11}$'),
         ADD CONSTRAINT "appointments_patient_phone_digits" CHECK ("patient_phone" ~ '^[0-9]{10,11}$')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments"
         DROP CONSTRAINT "appointments_patient_phone_digits",
         DROP CONSTRAINT "appointments_patient_cpf_digits"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments"
         DROP COLUMN "patient_email",
         DROP COLUMN "patient_phone",
         DROP COLUMN "patient_birth_date",
         DROP COLUMN "patient_cpf"`,
    );
  }
}
