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
import { User } from '../../users/users.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { Coupon } from '../coupons/coupon.entity';
import { SaasPayment } from '../payments/saas-payment.entity';
import { Commission } from '../commissions/commission.entity';

export type SaasInvoiceStatus = 'draft' | 'pending' | 'paid' | 'void' | 'failed';

@Entity('saas_invoices')
export class SaasInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string; // e.g. SAAS-INV-2026-0001

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId: number;

  @ManyToOne(() => Subscription, (sub) => sub.invoices, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @Column({ name: 'coupon_id', nullable: true })
  couponId: number;

  @ManyToOne(() => Coupon, (coupon) => coupon.invoices, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column('decimal', { name: 'discount_amount', precision: 10, scale: 2, default: 0.0 })
  discountAmount: number;

  @Column('decimal', { name: 'total_amount', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: SaasInvoiceStatus;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @OneToMany(() => SaasPayment, (payment) => payment.invoice)
  payments: SaasPayment[];

  @OneToMany(() => Commission, (commission) => commission.invoice)
  commissions: Commission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
