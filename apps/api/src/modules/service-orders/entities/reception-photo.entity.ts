import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReceptionChecklist } from './reception-checklist.entity';

export enum ReceptionPhotoAngleEnum {
  FRONT = 'FRONT',
  REAR = 'REAR',
  LEFT_SIDE = 'LEFT_SIDE',
  RIGHT_SIDE = 'RIGHT_SIDE',
  INTERIOR = 'INTERIOR',
  DASHBOARD = 'DASHBOARD',
  TRUNK = 'TRUNK',
  ENGINE = 'ENGINE',
  WHEELS = 'WHEELS',
  OTHER = 'OTHER',
}

@Entity('reception_photos')
export class ReceptionPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reception_checklist_id', type: 'uuid' })
  receptionChecklistId: string;

  @Column({ name: 'angle', type: 'varchar', length: 20 })
  angle: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;

  /** PHOTO o VIDEO: la recepción admite un video opcional. */
  @Column({ name: 'media_type', type: 'varchar', length: 10, default: 'PHOTO' })
  mediaType: string;

  /** Código del catálogo al que responde esta foto (ReceptionPhotoSpec). */
  @Column({ name: 'spec_code', type: 'varchar', length: 40, nullable: true })
  specCode: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ReceptionChecklist, (rc) => rc.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reception_checklist_id' })
  receptionChecklist?: ReceptionChecklist;
}
