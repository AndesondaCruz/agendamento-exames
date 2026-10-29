import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Exclusion,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Doctor } from '../../doctors/entities/doctor.entity.js';
import { Exam } from '../../exams/entities/exam.entity.js';

/**
 * Nome da constraint exportado para o tratamento de erro identificar
 * exatamente esta violação (Postgres code 23P01) e devolver HTTP 409.
 */
export const APPOINTMENT_NO_OVERLAP_CONSTRAINT = 'appointments_no_overlap';

@Entity('appointments')
/**
 * Garantia de "sem sobreposição" no nível do banco:
 * para o MESMO médico (doctor_id WITH =), nenhum par de intervalos
 * [starts_at, ends_at) pode se cruzar (&&).
 *
 * '[)' = intervalo semiaberto: 09:20–10:00 e 10:00–10:40 NÃO colidem.
 * Isso protege inclusive contra requisições simultâneas, porque a checagem
 * acontece dentro do Postgres, de forma atômica, no momento do INSERT.
 */
@Exclusion(
  APPOINTMENT_NO_OVERLAP_CONSTRAINT,
  `USING gist ("doctor_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)`,
)
@Check('appointments_valid_interval', '"starts_at" < "ends_at"')
@Index(['doctorId', 'startsAt'])
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_name', type: 'varchar', length: 120 })
  patientName: string;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId: number;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Relation<Doctor>;

  @Column({ name: 'exam_id', type: 'int' })
  examId: number;

  @ManyToOne(() => Exam, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_id' })
  exam: Relation<Exam>;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  /**
   * Derivado (início + duração do exame), mas persistido: a exclusion
   * constraint precisa dele, e o agendamento preserva a duração com que
   * foi marcado mesmo que o catálogo mude depois.
   */
  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
