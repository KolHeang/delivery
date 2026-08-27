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
import { Plan } from './plan.entity';
import { Subscription } from './subscription.entity';
import { TenantDomain } from './tenant-domain.entity';
import { TenantInvoice } from './tenant-invoice.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 50, unique: true, nullable: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  logo: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 50, default: 'active' })
  status: 'active' | 'suspended' | 'trial' | 'expired';

  @ManyToOne(() => Plan, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({ name: 'plan_id', nullable: true })
  planId: number;

  @Column({ name: 'subscription_expires_at', type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @OneToMany(() => Subscription, (sub) => sub.tenant)
  subscriptions: Subscription[];

  @OneToMany(() => TenantDomain, (domain) => domain.tenant)
  domains: TenantDomain[];

  @OneToMany(() => TenantInvoice, (inv) => inv.tenant)
  invoices: TenantInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
