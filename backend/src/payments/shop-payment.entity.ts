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
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column({ nullable: true })
  merchantId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true, type: 'text' })
  note: string;

  @Column({ type: 'json', nullable: true })
  orderIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
