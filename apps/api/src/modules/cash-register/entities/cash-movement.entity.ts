import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CashSession } from './cash-session.entity';

/**
 * Movimiento manual de efectivo dentro de una sesión de caja.
 *
 * DEPOSIT: entra efectivo que no es una venta (fondo, cambio recibido).
 * WITHDRAWAL: sale efectivo a la caja fuerte o al banco.
 * EXPENSE: gasto pagado de la caja chica (propina de mensajería, papelería).
 *
 * Los tres corren el efectivo esperado al cierre: un depósito suma, un retiro
 * o un gasto restan.
 */
export enum CashMovementKindEnum {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  EXPENSE = 'EXPENSE',
}

@Entity('cash_movements')
@Index(['cashSessionId'])
export class CashMovement {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'cash_session_id', type: 'uuid' })
  cashSessionId: string;

  @Column({ name: 'kind', type: 'varchar', length: 12 })
  kind: CashMovementKindEnum;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'concept', type: 'varchar', length: 200 })
  concept: string;

  @Column({ name: 'reference', type: 'varchar', length: 120, nullable: true })
  reference: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CashSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cash_session_id' })
  cashSession?: CashSession;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User | null;
}
