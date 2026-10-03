import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IncomeType } from './income-type.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('incomes')
export class Income {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @ManyToOne(() => IncomeType, (incomeType) => incomeType.incomes, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'type_id' })
  type: IncomeType;

  @Column({ name: 'type_id', nullable: true })
  typeId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
