import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../saas/entities/tenant.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Entity('telegram_configs')
export class TelegramConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId: number;

  @ManyToOne(() => Merchant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchantId: number;

  @Column({ name: 'channel_title', type: 'varchar', nullable: true })
  channelTitle: string; // e.g. "Main Group", "Finance Group", "Shop 1"

  @Column({ name: 'chat_id', type: 'varchar' })
  chatId: string; // e.g. "761552994" or "-100123456789" or "@username"

  @Column({ name: 'chat_type', type: 'varchar', default: 'group' })
  chatType: string; // 'group' | 'channel' | 'private'

  @Column({ name: 'bot_token', type: 'varchar', nullable: true })
  botToken: string; // Custom Bot Token (if empty, uses system default)

  @Column({ name: 'bot_username', type: 'varchar', nullable: true })
  botUsername: string;

  @Column({ name: 'notify_new_order', type: 'boolean', default: true })
  notifyNewOrder: boolean;

  @Column({ name: 'notify_delivery_success', type: 'boolean', default: true })
  notifyDeliverySuccess: boolean;

  @Column({ name: 'notify_delivery_failed', type: 'boolean', default: true })
  notifyDeliveryFailed: boolean;

  @Column({ name: 'notify_settlement', type: 'boolean', default: true })
  notifySettlement: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
