import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { User } from '../../users/entities/users.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('merchant_payments')
export class MerchantPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', default: 1 })
  tenantId: number;

  @ManyToOne(() => Merchant, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'merchant_id', nullable: true })
  merchantId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, name: 'amount_khr' })
  amountKHR: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true, type: 'text' })
  note: string;

  @Column({ name: 'parcel_ids', type: 'json', nullable: true })
  parcelIds: number[];

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by_id' })
  creator: User;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'updated_by_id' })
  updater: User;

  @Column({ name: 'updated_by_id', nullable: true })
  updatedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
