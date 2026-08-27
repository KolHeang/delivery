import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../saas/entities/tenant.entity';

export type VehicleType = 'motorbike' | 'car' | 'van' | 'truck' | 'tuk-tuk';
export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', default: 1 })
  tenantId: number;

  @Column({ unique: true })
  plate: string;

  @Column()
  type: VehicleType;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ default: 'active' })
  status: VehicleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
