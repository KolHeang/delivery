import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @Column()
  @Index()
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'entity_name' })
  entityName: string;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;

  @Column({ nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @Column({ nullable: true, name: 'user_id' })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'merchant_id' })
  merchantId: number | null;

  @ManyToOne(() => Merchant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
