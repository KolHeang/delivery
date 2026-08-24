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
import { SaasInvoice } from '../invoices/saas-invoice.entity';
import { Commission } from '../commissions/commission.entity';

export type SaasPaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

@Entity('saas_payments')
export class SaasPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_id' })
  invoiceId: number;

  @ManyToOne(() => SaasInvoice, (invoice) => invoice.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SaasInvoice;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({ name: 'payment_method', default: 'khqr' })
  paymentMethod: string; // khqr, aba_payway, credit_card, bank_transfer, mock

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: SaasPaymentStatus;

  @Column('jsonb', { nullable: true })
  rawResponse: Record<string, any>;

  @OneToMany(() => Commission, (commission) => commission.payment)
  commissions: Commission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
