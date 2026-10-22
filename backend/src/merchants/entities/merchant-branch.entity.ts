import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Merchant } from './merchant.entity';
import { Zone } from '../../zones/entities/zone.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('merchant_branches')
export class MerchantBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number;

  @Column()
  name: string; // e.g. "សាខាទួលគោក", "Branch Tuol Kork"

  @Column({ nullable: true })
  code: string; // e.g. "TK-01"

  @Column({ name: 'contact_name', nullable: true })
  contactName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
