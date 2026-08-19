import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuotationItem } from './quotation-item.entity';

/**
 * Una foto de lo que se recomienda cambiar, ligada a una línea del
 * presupuesto. El archivo vive en el almacenamiento privado (Backblaze); aquí
 * solo se guarda su llave y se firma una URL temporal al mostrarla.
 */
@Entity('quotation_item_photos')
export class QuotationItemPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quotation_item_id', type: 'uuid' })
  quotationItemId: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => QuotationItem, (i) => i.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_item_id' })
  item?: QuotationItem;
}
