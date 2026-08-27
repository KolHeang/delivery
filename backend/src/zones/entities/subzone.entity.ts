import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Zone } from './zone.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('sub_zones')
export class SubZone {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', default: 1 })
  tenantId: number;

  @Column()
  name: string;

  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'zone_id' })
  zoneId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
