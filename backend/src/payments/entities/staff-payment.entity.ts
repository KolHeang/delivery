import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';

@Entity('staff_payments')
export class StaffPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ name: 'driver_id', nullable: true })
  driverId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true, type: 'text' })
  note: string;

  @Column({ name: 'order_ids', type: 'json', nullable: true })
  orderIds: number[];

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by_id' })
  creator: User;

  @Column({ name: 'created_by_id', nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'updated_by_id' })
  updater: User;

  @Column({ name: 'updated_by_id', nullable: true })
  updatedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
