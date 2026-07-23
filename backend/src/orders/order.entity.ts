import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { Merchant } from '../merchants/merchant.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/users.entity';
import { Zone } from '../zones/zone.entity';
import { OrderHistory } from './order-history.entity';
import { PickupRequest } from './pickup-request.entity';

export type OrderStatus =
  | 'pending'
  | 'in-warehouse'
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

  @Column({ name: 'tracking_code', unique: true })
  trackingCode: string;

  @Column({ default: 'pending' })
  status: OrderStatus;

  // Sender info
  @Column({ name: 'sender_name' })
  senderName: string;

  @Column({ name: 'sender_phone' })
  senderPhone: string;

  // Receiver info
  @Column({ name: 'receiver_name' })
  receiverName: string;

  @Column({ name: 'receiver_phone' })
  receiverPhone: string;

  @Column({ name: 'receiver_address', type: 'text' })
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

  @Column({ name: 'cod_currency', default: 'USD' })
  codCurrency: string;

  @Column('decimal', { name: 'delivery_fee', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: PaymentStatus;

  @Column({ name: 'driver_payment_status', default: 'unpaid' })
  driverPaymentStatus: 'unpaid' | 'paid';

  @Column({ name: 'merchant_payment_status', default: 'unpaid' })
  merchantPaymentStatus: 'unpaid' | 'paid';

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column('decimal', { name: 'received_amount_usd', precision: 10, scale: 2, default: 0 })
  receivedAmountUSD: number;

  @Column('decimal', { name: 'received_amount_khr', precision: 10, scale: 2, default: 0 })
  receivedAmountKHR: number;

  // Timestamps
  @Column({ name: 'picked_up_at', type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ name: 'warehouse_at', type: 'timestamp', nullable: true })
  warehouseAt: Date;       // When parcel arrived at warehouse (via-warehouse flow)

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;        // When delivery driver was assigned

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  // Relations
  @ManyToOne(() => Merchant, { nullable: true, eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'merchant_id', nullable: true })
  merchantId: number;

  @ManyToOne(() => Customer, { nullable: true, eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  // Delivery driver (delivers to customer)
  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'driver_id', nullable: true })
  driverId: number;

  // Pickup driver (collects parcel from merchant store → warehouse)
  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pickup_driver_id' })
  pickupDriver: User;

  @Column({ name: 'pickup_driver_id', nullable: true })
  pickupDriverId: number;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: number;

  @ManyToOne(() => PickupRequest, (pr) => pr.orders, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pickup_request_id' })
  pickupRequest: PickupRequest;

  @Column({ name: 'pickup_request_id', nullable: true })
  pickupRequestId: number;

  @OneToMany(() => OrderHistory, (history) => history.order)
  histories: OrderHistory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateTrackingCode() {
    if (!this.trackingCode) {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.random().toString(36).substring(2, 4).toUpperCase();
      this.trackingCode = `T${timestamp}${random}`;
    }
  }
}
