import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExpenseType } from './expense-type.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @ManyToOne(() => ExpenseType, (expenseType) => expenseType.expenses, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'type_id' })
  type: ExpenseType;

  @Column({ name: 'type_id', nullable: true })
  typeId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
