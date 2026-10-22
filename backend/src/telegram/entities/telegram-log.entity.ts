import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('telegram_logs')
export class TelegramLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId: number;

  @Column({ name: 'merchant_id', type: 'int', nullable: true })
  merchantId: number;

  @Column({ name: 'chat_id', type: 'varchar' })
  chatId: string;

  @Column({ name: 'event_type', type: 'varchar', default: 'NOTIFICATION' })
  eventType: string; // 'PAYMENT_SETTLEMENT' | 'ORDER_CREATED' | 'DELIVERY_STATUS' | 'TEST'

  @Column({ name: 'message_text', type: 'text' })
  messageText: string;

  @Column({ type: 'varchar', default: 'SENT' })
  status: string; // 'SENT' | 'FAILED'

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
