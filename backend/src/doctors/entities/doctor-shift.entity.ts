import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Doctor } from './doctor.entity.js';

/**
 * Um turno de atendimento recorrente (ex.: toda quarta, 19:00–22:00).
 *
 * Um médico pode ter vários turnos no mesmo dia (Dr. Thiago tem dois na
 * quarta e na sexta), por isso o relacionamento é 1:N e não um par fixo
 * "manhã/tarde" na tabela de médicos.
 */
@Entity('doctor_shifts')
@Index(['doctorId', 'weekday'])
@Check('doctor_shifts_weekday_iso', '"weekday" BETWEEN 1 AND 7')
@Check(
  'doctor_shifts_valid_range',
  '"start_minute" >= 0 AND "end_minute" <= 1440 AND "start_minute" < "end_minute"',
)
export class DoctorShift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.shifts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Relation<Doctor>;

  /** Dia da semana no padrão ISO 8601: 1 = segunda ... 7 = domingo. */
  @Column({ type: 'smallint' })
  weekday: number;

  /** Minutos desde 00:00 no fuso da clínica (480 = 08:00). */
  @Column({ name: 'start_minute', type: 'smallint' })
  startMinute: number;

  @Column({ name: 'end_minute', type: 'smallint' })
  endMinute: number;
}
