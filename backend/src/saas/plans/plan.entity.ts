import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';

@Entity('saas_plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Basic, Pro, Enterprise

  @Column({ unique: true })
  slug: string; // basic, pro, enterprise

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0.0 })
  priceMonthly: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0.0 })
  priceYearly: number;

  @Column({ name: 'max_users', default: 5 })
  maxUsers: number;

  @Column({ name: 'max_orders_per_month', default: 500 })
  maxOrdersPerMonth: number;

  @Column({ name: 'max_drivers', default: 5 })
  maxDrivers: number;

  @Column({ name: 'max_vehicles', default: 5 })
  maxVehicles: number;

  @Column('jsonb', {
    default: {
      customReports: false,
      apiAccess: false,
      prioritySupport: false,
      telegramNotifications: true,
      customBranding: false,
    },
  })
  features: Record<string, boolean>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_popular', default: false })
  isPopular: boolean;

  @OneToMany(() => Subscription, (sub) => sub.plan)
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
