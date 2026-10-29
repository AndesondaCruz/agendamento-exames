import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { DoctorShift } from './doctor-shift.entity.js';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  /** Chave natural do médico; usada pelo seed para ser idempotente. */
  @Column({ type: 'varchar', length: 30, unique: true })
  crm: string;

  @OneToMany(() => DoctorShift, (shift) => shift.doctor, { cascade: true })
  shifts: Relation<DoctorShift[]>;
}
