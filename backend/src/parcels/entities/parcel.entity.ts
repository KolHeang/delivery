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
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/users.entity';
import { Zone } from '../../zones/entities/zone.entity';
import { ParcelEvent } from './parcel-event.entity';
import { PickupRequest } from './pickup-request.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

export type ParcelStatus =
  | 'pending'
  | 'in-warehouse'
  | 'assigned'
  | 'picked-up'
  | 'in-transit'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'cancelled';
export type ParcelSize = 'small' | 'medium' | 'large';
export type PaymentStatus = 'pending' | 'paid';

@Entity('parcels')
export class Parcel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'tracking_code', unique: true })
  trackingCode: string;

  @Column({ default: 'pending' })
  status: ParcelStatus;

  @Column({ name: 'receiver_name' })
  receiverName: string;

  @Column({ name: 'receiver_phone' })
  receiverPhone: string;

  @Column({ name: 'receiver_address', type: 'text' })
  receiverAddress: string;

  @Column('decimal', { precision: 8, scale: 2, default: 0 })
  weight: number;

  @Column({ default: 'small' })
  size: ParcelSize;

  @Column({ nullable: true, type: 'text' })
  note: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cod: number;

  @Column({ name: 'cod_currency', default: 'USD' })
  codCurrency: string;

  @Column('decimal', {
    name: 'delivery_fee',
    precision: 10,
    scale: 2,
    default: 0,
  })
  deliveryFee: number;

  @Column({ name: 'payment_status', default: 'pending' })
  paymentStatus: PaymentStatus;

  @Column({ name: 'driver_payment_status', default: 'unpaid' })
  driverPaymentStatus: 'unpaid' | 'paid';

  @Column({ name: 'merchant_payment_status', default: 'unpaid' })
  merchantPaymentStatus: 'unpaid' | 'paid';

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'picked_up_at', type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ name: 'warehouse_at', type: 'timestamp', nullable: true })
  warehouseAt: Date;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

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

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'driver_id', nullable: true })
  driverId: number;

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

  @ManyToOne(() => PickupRequest, (pr) => pr.parcels, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pickup_request_id' })
  pickupRequest: PickupRequest;

  @Column({ name: 'pickup_request_id', nullable: true })
  pickupRequestId: number;

  @OneToMany(() => ParcelEvent, (event) => event.parcel)
  events: ParcelEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generateTrackingCode() {
    if (!this.trackingCode) {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const rand = String(Math.floor(1000 + Math.random() * 9000));

      this.trackingCode = `CO${day}${month}${year}${rand}`;
    }
  }
}
