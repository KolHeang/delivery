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
import { Merchant } from '../../merchants/entities/merchant.entity';
import { User } from '../../users/entities/users.entity';
import { Parcel } from './parcel.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

export type PickupRequestStatus = 'pending' | 'picked-up' | 'in-warehouse' | 'completed' | 'cancelled';

@Entity('pickup_requests')
export class PickupRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

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

  @OneToMany(() => Parcel, (parcel) => parcel.pickupRequest)
  parcels: Parcel[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
