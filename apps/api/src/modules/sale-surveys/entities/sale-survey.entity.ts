import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SurveyQuestion } from '../../surveys/entities/survey-config.entity';

@Entity('sale_surveys')
@Index(['tenantId'])
export class SaleSurvey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Column({ name: 'reference_label', type: 'varchar', length: 120, nullable: true })
  referenceLabel: string | null;

  @Column({ name: 'client_name', type: 'varchar', length: 200, nullable: true })
  clientName: string | null;

  @Column({ name: 'token', type: 'uuid', default: () => 'uuid_generate_v4()' })
  token: string;

  @Column({ name: 'intro', type: 'text', nullable: true })
  intro: string | null;

  @Column({ name: 'thanks', type: 'text', nullable: true })
  thanks: string | null;

  /** Snapshot de las preguntas configuradas al momento de crear la encuesta. */
  @Column({ name: 'questions', type: 'jsonb', default: () => "'[]'" })
  questions: SurveyQuestion[];

  /** Respuestas por id de pregunta. */
  @Column({ name: 'answers', type: 'jsonb', default: () => "'{}'" })
  answers: Record<string, number | string>;

  /** Promedio de las preguntas de puntaje (1-5); null si sin responder. */
  @Column({ name: 'score', type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'answered_at', type: 'timestamp', nullable: true })
  answeredAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
