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
import { MerchantBranch } from '../../merchants/entities/merchant-branch.entity';
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

  @Column({ name: 'photo', type: 'text', nullable: true })
  photo?: string;

  @Column({ name: 'photos', type: 'json', nullable: true })
  photos?: string[];

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;

  @Column({ name: 'pickup_proof_photo', type: 'text', nullable: true })
  pickupProofPhoto?: string;

  @Column({ name: 'pickup_proof_photos', type: 'json', nullable: true })
  pickupProofPhotos?: string[];

  @Column({ name: 'picked_up_at', type: 'timestamp', nullable: true })
  pickedUpAt?: Date;

  @Column({ name: 'driver_note', type: 'text', nullable: true })
  driverNote?: string;

  @ManyToOne(() => Merchant, { eager: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @ManyToOne(() => MerchantBranch, { nullable: true, eager: true })
  @JoinColumn({ name: 'branch_id' })
  branch: MerchantBranch;

  @Column({ name: 'branch_id', nullable: true })
  branchId: number;

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
