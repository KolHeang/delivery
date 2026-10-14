import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { Tenant } from '../../../saas/entities/tenant.entity';

@Entity('merchant_notifications')
export class MerchantNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: 'general' })
  type: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;
}
