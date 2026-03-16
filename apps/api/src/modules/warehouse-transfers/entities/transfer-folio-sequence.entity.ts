import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transfer_folio_seq')
export class TransferFolioSequence {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @PrimaryColumn({ name: 'year', type: 'int' })
  year: number;

  @Column({ name: 'last_value', type: 'int', default: 0 })
  lastValue: number;
}
