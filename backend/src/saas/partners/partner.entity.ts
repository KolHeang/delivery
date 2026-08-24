import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/users.entity';
import { Coupon } from '../coupons/coupon.entity';
import { Commission } from '../commissions/commission.entity';

@Entity('saas_partners')
export class Partner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'referral_code', unique: true })
  referralCode: string;

  @Column('decimal', { name: 'commission_rate', precision: 5, scale: 2, default: 15.0 })
  commissionRate: number; // e.g. 15.00 for 15%

  @Column('jsonb', {
    name: 'bank_account_info',
    nullable: true,
    default: {
      bankName: 'ABA Bank',
      accountNumber: '',
      accountName: '',
    },
  })
  bankAccountInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Coupon, (coupon) => coupon.partner)
  coupons: Coupon[];

  @OneToMany(() => Commission, (commission) => commission.partner)
  commissions: Commission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
