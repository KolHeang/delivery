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

export type MessageSenderType = 'driver' | 'merchant' | 'admin' | 'customer';

@Entity('parcel_messages')
export class ParcelMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'parcel_id' })
  parcelId: number;

  @Column({ name: 'sender_type', default: 'driver' })
  senderType: MessageSenderType;

  @Column({ name: 'sender_id', nullable: true })
  senderId: number;

  @Column({ name: 'sender_name', nullable: true })
  senderName: string;

  @Column({ name: 'sender_avatar', nullable: true })
  senderAvatar: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Parcel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;
}
