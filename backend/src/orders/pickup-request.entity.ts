import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Merchant } from '../merchants/merchant.entity';
import { User } from '../users/users.entity';
import { Order } from './order.entity';

export type PickupRequestStatus = 'pending' | 'picked-up' | 'in-warehouse' | 'completed';

@Entity('pickup_requests')
export class PickupRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'declared_quantity' })
  declaredQuantity: number;

  @Column({ name: 'actual_quantity', nullable: true })
  actualQuantity: number;

  @Column({ name: 'pickup_address', type: 'text', nullable: true })
  pickupAddress: string;

  @Column({ name: 'pickup_time', type: 'timestamp' })
  pickupTime: Date;

  @Column({ default: 'pending' })
  status: PickupRequestStatus;

  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pickup_driver_id' })
  pickupDriver: User;

  @Column({ name: 'pickup_driver_id', nullable: true })
  pickupDriverId: number;

  @OneToMany(() => Order, (order) => order.pickupRequest)
  orders: Order[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
