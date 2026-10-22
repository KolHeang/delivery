import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { Parcel } from '../parcels/entities/parcel.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
  ) {}

  async createInvoices(parcelIds: number[], tenantId?: number): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    for (const parcelId of parcelIds) {
      const qb = this.parcelRepo.createQueryBuilder('parcel').where('parcel.id = :parcelId', { parcelId });
      if (tenantId) {
        qb.andWhere('(parcel.tenantId = :tenantId OR parcel.tenantId IS NULL)', { tenantId });
      }
      const parcel = await qb.getOne();
      if (!parcel) {
        throw new NotFoundException(`Parcel with ID ${parcelId} not found`);
      }

      // Generate a unique invoice number
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(100 + Math.random() * 900);
      const invoiceNumber = `INV-${parcel.trackingCode}-${timestamp}${random}`;

      const invoice = this.invoiceRepo.create({
        invoiceNumber,
        parcelId,
        tenantId: (tenantId || parcel.tenantId) ?? undefined,
      } as any);
      const saved = await this.invoiceRepo.save(invoice);
      invoices.push(saved as any);
    }
    return invoices;
  }

  async findAll(tenantId?: number): Promise<Invoice[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.parcel', 'parcel')
      .orderBy('invoice.printedAt', 'DESC');

    if (tenantId) {
      qb.andWhere('(invoice.tenantId = :tenantId OR invoice.tenantId IS NULL)', { tenantId });
    }

    return qb.getMany();
  }
}
