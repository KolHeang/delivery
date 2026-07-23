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

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  @Index()
  token: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false, name: 'is_revoked' })
  isRevoked: boolean;

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
}
