import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Parcel } from '../../parcels/entities/parcel.entity';

import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('merchant_invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', default: 1 })
  tenantId: number;

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string;

  @ManyToOne(() => Parcel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'parcel_id' })
  parcelId: number;

  @CreateDateColumn({ name: 'created_at' })
  printedAt: Date;
}

export { Invoice as MerchantInvoice };
