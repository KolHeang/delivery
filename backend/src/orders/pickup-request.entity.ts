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

  @Column()
  declaredQuantity: number;

  @Column({ nullable: true })
  actualQuantity: number;

  @Column({ type: 'text', nullable: true })
  pickupAddress: string;

  @Column({ type: 'timestamp' })
  pickupTime: Date;

  @Column({ default: 'pending' })
  status: PickupRequestStatus;

  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column()
  merchantId: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pickupDriverId' })
  pickupDriver: User;

  @Column({ nullable: true })
  pickupDriverId: number;

  @OneToMany(() => Order, (order) => order.pickupRequest)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
