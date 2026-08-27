import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Plan } from './plan.entity';
import { TenantInvoice } from './tenant-invoice.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, (t) => t.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Plan, (p) => p.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'plan_id' })
  planId: number;

  @Column({ length: 50, default: 'active' })
  status: 'active' | 'past_due' | 'canceled' | 'trialing';

  @Column({ name: 'start_date', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'price_paid' })
  pricePaid: number;

  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_reference', length: 100, nullable: true })
  paymentReference: string;

  @OneToMany(() => TenantInvoice, (inv) => inv.subscription)
  invoices: TenantInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
