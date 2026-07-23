import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Zone } from '../zones/zone.entity';

export type PricingTier = 'basic' | 'standard' | 'premium';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'name_kh', nullable: true })
  nameKh: string;

  @Column({ nullable: true })
  contact: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true, select: false })
  password?: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'pricing_tier', default: 'standard' })
  pricingTier: PricingTier;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: number;

  @Column('decimal', { name: 'delivery_fee', precision: 10, scale: 2, default: 0, nullable: true })
  deliveryFee: number;

  @Column('decimal', { name: 'exchange_rate', precision: 10, scale: 2, default: 4100, nullable: true })
  exchangeRate: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  telegram: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ name: 'qr_link_khr', nullable: true })
  qrLinkKhr: string;

  @Column({ name: 'qr_link_usd', nullable: true })
  qrLinkUsd: string;

  @Column({ name: 'qr_image_khr', type: 'text', nullable: true })
  qrImageKhr: string;

  @Column({ name: 'qr_image_usd', type: 'text', nullable: true })
  qrImageUsd: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
