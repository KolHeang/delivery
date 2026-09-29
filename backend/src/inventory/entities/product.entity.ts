import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'merchant_id', nullable: true })
  @Index()
  merchantId: number;

  @ManyToOne(() => Merchant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column()
  name: string;

  @Column({ name: 'name_kh', nullable: true })
  nameKh: string;

  @Column({ unique: true })
  @Index()
  sku: string;

  @Column({ nullable: true })
  @Index()
  barcode: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { name: 'cost_price', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column('int', { default: 0 })
  quantity: number; // Physical On-Hand Stock

  @Column('int', { name: 'reserved_quantity', default: 0 })
  reservedQuantity: number; // Stock reserved for orders

  @Column('int', { name: 'min_stock_alert', default: 5 })
  minStockAlert: number;

  @Column({ default: 'pcs' })
  unit: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => StockMovement, (movement) => movement.product)
  movements: StockMovement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed available stock helper
  get availableQuantity(): number {
    return Math.max(0, (this.quantity || 0) - (this.reservedQuantity || 0));
  }
}
