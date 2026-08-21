import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

const dinero = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? 0 : Number(v)),
};

/** Zona de la carrocería, para agrupar el catálogo al cotizar. */
export enum BodyworkZoneEnum {
  FRENTE = 'FRENTE',
  TRASERA = 'TRASERA',
  LATERAL_IZQ = 'LATERAL_IZQ',
  LATERAL_DER = 'LATERAL_DER',
  TECHO = 'TECHO',
  INTERIOR = 'INTERIOR',
  OTRO = 'OTRO',
}

/**
 * Catálogo de piezas de carrocería (cofre, puertas, salpicaderas, facias…).
 *
 * Es propio del módulo, aparte del inventario de refacciones: la mayoría de
 * piezas de carrocería no se inventarían, así que aquí solo viven el nombre y
 * un precio sugerido para cotizar. Las piezas con `tenant_id = NULL` son el
 * set de fábrica que se siembra a todos; cada tenant puede agregar las suyas.
 */
@Entity('bodywork_parts')
@Index(['tenantId'])
export class BodyworkPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** NULL = pieza de fábrica, compartida por todos los tenants. */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({
    name: 'zone',
    type: 'varchar',
    length: 20,
    default: BodyworkZoneEnum.OTRO,
  })
  zone: BodyworkZoneEnum;

  /** Precio sugerido de la pieza para cambio; editable al cotizar. */
  @Column({
    name: 'default_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: dinero,
  })
  defaultPrice: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
