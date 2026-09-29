import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from '../../users/entities/users.entity';

export type MovementType =
  | 'IN' // Purchase or initial stock
  | 'OUT' // Dispatched order
  | 'RESERVE' // Order created / reserved
  | 'RELEASE' // Order cancelled / reservation released
  | 'RETURN' // Restocked from failed/returned delivery
  | 'DAMAGED' // Damaged item write-off
  | 'ADJUST'; // Manual adjustment / stock-take

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  @Index()
  productId: number;

  @ManyToOne(() => Product, (product) => product.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 20 })
  type: MovementType;

  @Column('int')
  quantity: number;

  @Column('int', { name: 'previous_quantity', default: 0 })
  previousQuantity: number;

  @Column('int', { name: 'new_quantity', default: 0 })
  newQuantity: number;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string; // e.g. 'parcel', 'manual', 'po'

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string; // e.g. tracking code or parcel ID

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'performed_by_id', nullable: true })
  performedById: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
