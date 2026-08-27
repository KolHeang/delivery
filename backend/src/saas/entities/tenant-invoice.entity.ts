import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Subscription } from './subscription.entity';

@Entity('tenant_invoices')
export class TenantInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, (t) => t.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Subscription, (s) => s.invoices, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId: number;

  @Column({ length: 100, unique: true, name: 'invoice_number' })
  invoiceNumber: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ length: 50, default: 'paid' })
  status: 'paid' | 'pending' | 'void' | 'overdue';

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
