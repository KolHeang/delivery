import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('saas_domains')
export class TenantDomain {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, (t) => t.domains, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @Column({ length: 255, unique: true })
  domain: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'is_verified', default: true })
  isVerified: boolean;

  @Column({ name: 'domain_type', length: 50, default: 'subdomain' })
  domainType: string; // 'subdomain' | 'custom'

  @Column({ name: 'ssl_status', length: 50, default: 'active' })
  sslStatus: string; // 'active' | 'pending' | 'failed'

  @Column({ name: 'dns_target', length: 255, nullable: true })
  dnsTarget: string; // e.g. 'cname.ebsexpress.com'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
