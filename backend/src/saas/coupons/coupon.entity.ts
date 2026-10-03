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
import { Partner } from '../partners/partner.entity';
import { SaasInvoice } from '../invoices/saas-invoice.entity';

export type DiscountType = 'percentage' | 'fixed_amount';

@Entity('saas_coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column({
    name: 'discount_type',
    type: 'varchar',
    default: 'percentage',
  })
  discountType: DiscountType;

  @Column('decimal', { name: 'discount_value', precision: 10, scale: 2 })
  discountValue: number; // e.g. 20.00 for 20% or 10.00 for $10

  @Column({ name: 'partner_id', nullable: true })
  partnerId: number;

  @ManyToOne(() => Partner, (partner) => partner.coupons, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner;

  @Column({ name: 'usage_limit', default: 100 })
  usageLimit: number;

  @Column({ name: 'used_count', default: 0 })
  usedCount: number;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => SaasInvoice, (inv) => inv.coupon)
  invoices: SaasInvoice[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
