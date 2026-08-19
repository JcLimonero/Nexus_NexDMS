import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrder } from './service-order.entity';

/** Encuesta de satisfacción post-entrega (una por orden). */
@Entity('service_surveys')
@Index(['tenantId'])
export class ServiceSurvey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId: string;

  @Column({ name: 'token', type: 'uuid', default: () => 'uuid_generate_v4()' })
  token: string;

  /** 1-5 (promedio de puntajes); null = sin responder */
  @Column({ name: 'score', type: 'int', nullable: true })
  score: number | null;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment: string | null;

  /** Snapshot de las preguntas configuradas (SERVICE) al crear la encuesta. */
  @Column({ name: 'questions', type: 'jsonb', default: () => "'[]'" })
  questions: { id: string; label: string; type: 'RATING' | 'TEXT' }[];

  @Column({ name: 'answers', type: 'jsonb', default: () => "'{}'" })
  answers: Record<string, number | string>;

  @Column({ name: 'intro', type: 'text', nullable: true })
  intro: string | null;

  @Column({ name: 'thanks', type: 'text', nullable: true })
  thanks: string | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'answered_at', type: 'timestamp', nullable: true })
  answeredAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrder;
}
