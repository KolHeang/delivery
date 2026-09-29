import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';

@Entity('parcel_items')
export class ParcelItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'parcel_id' })
  @Index()
  parcelId: number;

  @ManyToOne(() => Parcel, (parcel) => parcel.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'product_id' })
  @Index()
  productId: number;

  @ManyToOne(() => Product, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column('int', { default: 1 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('decimal', { name: 'total_price', precision: 10, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ name: 'is_picked', default: false })
  isPicked: boolean; // Barcode scanned during Pick & Pack

  @Column({ name: 'picked_at', type: 'timestamp', nullable: true })
  pickedAt: Date;

  @Column({ name: 'is_restocked', default: false })
  isRestocked: boolean; // Restocked upon failed/returned delivery
}
