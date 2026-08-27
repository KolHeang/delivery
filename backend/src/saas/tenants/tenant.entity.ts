import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Company } from './company.entity';
import { Domain } from './domain.entity';
import { Subscription } from '../subscriptions/subscription.entity';

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'archived';

@Entity('saas_tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    default: 'active',
  })
  status: TenantStatus;

  @OneToOne(() => Company, (company) => company.tenant, {
    cascade: true,
  })
  company: Company;

  @OneToMany(() => Domain, (domain) => domain.tenant, {
    cascade: true,
  })
  domains: Domain[];

  @OneToMany(() => Subscription, (sub) => sub.tenant)
  subscriptions: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
