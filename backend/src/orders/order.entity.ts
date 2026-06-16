import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Merchant } from '../merchants/merchant.entity';
import { Customer } from '../customers/customer.entity';
import { Staff } from '../users/staff.entity';
import { Zone } from '../zones/zone.entity';

export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'picked-up'
  | 'in-transit'
  | 'delivered'
  | 'failed'
  | 'returned';
export type OrderSize = 'small' | 'medium' | 'large';
export type PaymentStatus = 'pending' | 'paid';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  trackingCode: string;

  @Column({ default: 'pending' })
  status: OrderStatus;

  // Sender info
  @Column()
  senderName: string;

  @Column()
  senderPhone: string;

  // Receiver info
  @Column()
  receiverName: string;

  @Column()
  receiverPhone: string;

  @Column({ type: 'text' })
  receiverAddress: string;

  // Package details
  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  weight: number;

  @Column({ default: 'small' })
  size: OrderSize;

  @Column({ nullable: true, type: 'text' })
  note: string;

  // Financial
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cod: number;

  @Column({ default: 'USD' })
  codCurrency: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ default: 'pending' })
  paymentStatus: PaymentStatus;

  @Column({ default: 'unpaid' })
  driverPaymentStatus: 'unpaid' | 'paid';

  @Column({ default: 'unpaid' })
  merchantPaymentStatus: 'unpaid' | 'paid';

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // Relations
  @ManyToOne(() => Merchant, { nullable: true, eager: true })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column({ nullable: true })
  merchantId: number;

  @ManyToOne(() => Customer, { nullable: true, eager: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true })
  customerId: number;

  @ManyToOne(() => Staff, { nullable: true, eager: true })
  @JoinColumn({ name: 'driverId' })
  driver: Staff;

  @Column({ nullable: true })
  driverId: number;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;

  @Column({ nullable: true })
  zoneId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateTrackingCode() {
    if (!this.trackingCode) {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.trackingCode = `TRK${timestamp}${random}`;
    }
  }
}
