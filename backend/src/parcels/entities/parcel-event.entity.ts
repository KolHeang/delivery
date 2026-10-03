import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Parcel } from './parcel.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('parcel_events')
export class ParcelEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'parcel_id' })
  parcelId: number;

  @Column()
  status: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Parcel, (parcel) => parcel.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;
}
