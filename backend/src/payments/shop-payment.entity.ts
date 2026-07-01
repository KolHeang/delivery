import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from '../merchants/merchant.entity';

@Entity('shop_payments')
export class ShopPayment {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ name: 'order_ids', type: 'json', nullable: true })
  orderIds: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
