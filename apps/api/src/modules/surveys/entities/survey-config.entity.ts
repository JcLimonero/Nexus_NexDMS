import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SurveyAreaEnum {
  SERVICE = 'SERVICE',
  SALES = 'SALES',
}

export type SurveyQuestionType = 'RATING' | 'TEXT';

export interface SurveyQuestion {
  id: string;
  label: string;
  type: SurveyQuestionType;
}

@Entity('survey_configs')
@Index(['tenantId', 'area'], { unique: true })
export class SurveyConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'area', type: 'varchar', length: 20 })
  area: SurveyAreaEnum;

  @Column({ name: 'intro', type: 'text', nullable: true })
  intro: string | null;

  @Column({ name: 'thanks', type: 'text', nullable: true })
  thanks: string | null;

  @Column({ name: 'questions', type: 'jsonb', default: () => "'[]'" })
  questions: SurveyQuestion[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
