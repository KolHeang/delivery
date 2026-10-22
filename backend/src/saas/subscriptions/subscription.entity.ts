import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Plan } from '../plans/plan.entity';
import { SaasInvoice } from '../invoices/saas-invoice.entity';
import { Tenant } from '../entities/tenant.entity';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type BillingCycle = 'monthly' | 'yearly';

@Entity('saas_subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'integer', nullable: true })
  tenantId: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'company_name', nullable: true })
  companyName: string;



  @Column({ name: 'plan_id' })
  planId: number;

  @ManyToOne(() => Plan, (plan) => plan.subscriptions, { eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column({
    name: 'billing_cycle',
    type: 'varchar',
    default: 'monthly',
  })
  billingCycle: BillingCycle;

  @Column({
    type: 'varchar',
    default: 'active',
  })
  status: SubscriptionStatus;

  @Column({ name: 'trial_ends_at', type: 'timestamp', nullable: true })
  trialEndsAt: Date;

  @Column({ name: 'current_period_start', type: 'timestamp' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamp' })
  currentPeriodEnd: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @OneToMany(() => SaasInvoice, (inv) => inv.subscription)
  invoices: SaasInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
