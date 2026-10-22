import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('currencies')
@Index(['code', 'tenantId'])
export class Currency {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId: number | null;

  @Column({ type: 'varchar', length: 10 })
  code: string; // e.g. 'USD', 'KHR', 'THB', 'EUR'

  @Column({ type: 'varchar', length: 100 })
  name: string; // e.g. 'United States Dollar'

  @Column({ name: 'name_kh', type: 'varchar', length: 100, nullable: true })
  nameKh: string | null; // e.g. 'ដុល្លារអាមេរិក'

  @Column({ type: 'varchar', length: 10, default: '$' })
  symbol: string; // e.g. '$', '៛', '฿', '€'

  @Column('decimal', { precision: 16, scale: 4, default: 1.0 })
  exchangeRate: number; // Rate relative to 1 USD

  @Column({ name: 'is_base', type: 'boolean', default: false })
  isBase: boolean; // Base system currency

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean; // Available for selection by users

  @Column({ name: 'decimal_digits', type: 'int', default: 2 })
  decimalDigits: number; // 2 for USD, 0 for KHR

  @Column({ name: 'country_code', type: 'varchar', length: 10, nullable: true })
  countryCode: string | null; // 'US', 'KH', 'TH', etc.

  @Column({ name: 'flag_emoji', type: 'varchar', length: 20, nullable: true })
  flagEmoji: string | null; // 🇺🇸, 🇰🇭, 🇹🇭, etc.

  @Column({ type: 'varchar', length: 50, default: 'internet' })
  source: string; // 'internet', 'manual', 'system'

  @Column({ name: 'last_synced_at', type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
