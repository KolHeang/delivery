import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { SaasInvoice } from '../invoices/saas-invoice.entity';
import { SaasPayment } from '../payments/saas-payment.entity';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

@Entity('saas_commissions')
export class Commission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'partner_id' })
  partnerId: number;

  @ManyToOne(() => Partner, (partner) => partner.commissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'invoice_id' })
  invoiceId: number;

  @ManyToOne(() => SaasInvoice, (inv) => inv.commissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoice_id' })
  invoice: SaasInvoice;

  @Column({ name: 'payment_id', nullable: true })
  paymentId: number;

  @ManyToOne(() => SaasPayment, (payment) => payment.commissions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: SaasPayment;

  @Column('decimal', { name: 'calculated_amount', precision: 10, scale: 2 })
  calculatedAmount: number;

  @Column('decimal', { name: 'commission_rate', precision: 5, scale: 2 })
  commissionRate: number; // e.g. 15.00 for 15%

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: CommissionStatus;

  @Column({ name: 'payout_date', type: 'timestamp', nullable: true })
  payoutDate: Date;

  @Column({ name: 'payout_reference', nullable: true })
  payoutReference: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
