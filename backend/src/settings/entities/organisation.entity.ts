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

@Entity('organisation_settings')
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', default: 1 })
  tenantId: number;

  @Column({ default: 'EBS Digital Solutions' })
  name: string;

  @Column({ default: '+855 78 000 000' })
  phone: string;

  @Column({ default: 'info@ebs.com' })
  email: string;

  @Column({ default: 'https://ebs.com' })
  website: string;

  @Column({ default: 'Phnom Penh, Cambodia' })
  address: string;

  @Column({ nullable: true })
  logo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
