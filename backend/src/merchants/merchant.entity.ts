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

  @Column({ nullable: true })
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

  @Column({ default: 'standard' })
  pricingTier: PricingTier;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;

  @Column({ nullable: true })
  zoneId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
  deliveryFee: number;

  @Column('decimal', { precision: 10, scale: 2, default: 4100, nullable: true })
  exchangeRate: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  telegram: string;

  @Column({ nullable: true })
  qrLinkKhr: string;

  @Column({ nullable: true })
  qrLinkUsd: string;

  @Column({ type: 'text', nullable: true })
  qrImageKhr: string;

  @Column({ type: 'text', nullable: true })
  qrImageUsd: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
