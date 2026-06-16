import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Staff } from '../users/staff.entity';

@Entity('staff_payments')
export class StaffPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Staff, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driverId' })
  driver: Staff;

  @Column({ nullable: true })
  driverId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true, type: 'text' })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
