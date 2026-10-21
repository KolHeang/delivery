import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PaymentOptionType = 'offline' | 'aba' | 'khqr';
export type PaymentOptionStatus = 'active' | 'pending' | 'inactive';

@Entity('saas_payment_options')
export class SaasPaymentOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g. "Offline Bank Transfer", "ABA PayWay Direct"

  @Column({ type: 'varchar', default: 'offline' })
  type: PaymentOptionType; // 'offline' | 'aba' | 'khqr'

  @Column({ type: 'varchar', default: 'active' })
  status: PaymentOptionStatus; // 'active' | 'pending' | 'inactive'

  @Column({ name: 'bank_name', nullable: true })
  bankName: string; // e.g. "ABA Bank", "ACLEDA Bank"

  @Column({ name: 'account_name', nullable: true })
  accountName: string; // e.g. "EBS LOGISTICS SAAS CO., LTD."

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string; // e.g. "000 123 456"

  @Column({ name: 'qr_code_url', nullable: true, type: 'text' })
  qrCodeUrl: string;

  @Column({ nullable: true, type: 'text' })
  instructions: string;

  @Column({ name: 'requires_approval', default: true })
  requiresApproval: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
