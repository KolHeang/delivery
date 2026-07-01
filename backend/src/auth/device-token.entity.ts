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
import { User } from '../users/users.entity';
import { Merchant } from '../merchants/merchant.entity';

@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  token: string;

  @Column({ nullable: true, name: 'device_type' })
  deviceType: string;

  @Column({ nullable: true, name: 'user_id' })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, name: 'merchant_id' })
  merchantId: number | null;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
