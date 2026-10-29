import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('exams')
@Check('exams_duration_positive', '"duration_minutes" > 0')
export class Exam {
  /**
   * PrimaryColumn (e não PrimaryGeneratedColumn): o id vem do catálogo
   * oficial (exames.csv) e precisa ser estável entre ambientes, porque é
   * referenciado por agendamentos e pela API.
   */
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'duration_minutes', type: 'smallint' })
  durationMinutes: number;
}
