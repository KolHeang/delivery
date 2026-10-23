import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('notifications')
@Index(['tenantId', 'isRead', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId?: number | null;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId?: number | null;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ name: 'title_kh', type: 'varchar', nullable: true })
  titleKh?: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'body_kh', type: 'text', nullable: true })
  bodyKh?: string | null;

  @Column({ type: 'varchar', default: 'order' })
  type: string; // 'order', 'pickup', 'delivery', 'settlement', 'problem', 'system'

  @Column({ name: 'target_type', type: 'varchar', nullable: true })
  targetType?: string | null; // 'parcel', 'pickup_request', 'settlement', 'driver', 'system'

  @Column({ name: 'target_id', type: 'varchar', nullable: true })
  targetId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  link?: string | null; // Internal route e.g. '/summary/pickup', '/parcels'

  @Column({ type: 'json', nullable: true })
  data?: Record<string, any> | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
