import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/entities/users.entity';
import { Tenant } from '../../../saas/entities/tenant.entity';

@Entity('driver_notifications')
export class DriverNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: 'general' })
  type: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;
}
