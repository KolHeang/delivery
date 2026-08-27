import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'price_usd' })
  priceUSD: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, name: 'price_khr' })
  priceKHR: number;

  @Column({ length: 20, default: 'monthly', name: 'billing_cycle' })
  billingCycle: 'monthly' | 'yearly';

  @Column({ name: 'max_drivers', default: 50 })
  maxDrivers: number;

  @Column({ name: 'max_merchants', default: 200 })
  maxMerchants: number;

  @Column({ name: 'max_parcels_per_month', default: 10000 })
  maxParcelsPerMonth: number;

  @Column({ type: 'jsonb', default: {} })
  features: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Tenant, (t) => t.plan)
  tenants: Tenant[];

  @OneToMany(() => Subscription, (sub) => sub.plan)
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
