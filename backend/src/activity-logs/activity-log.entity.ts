import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/users.entity';
import { Merchant } from '../merchants/merchant.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  action: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'entity_name' })
  entityName: string;

  @Column({ nullable: true, name: 'entity_id' })
  entityId: string;

  @Column({ nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @Column({ nullable: true, name: 'user_id' })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'merchant_id' })
  merchantId: number | null;

  @ManyToOne(() => Merchant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
