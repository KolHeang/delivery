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

  async createInvoices(parcelIds: number[]): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    for (const parcelId of parcelIds) {
      const parcel = await this.parcelRepo.findOne({ where: { id: parcelId } });
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
      });
      const saved = await this.invoiceRepo.save(invoice);
      invoices.push(saved);
    }
    return invoices;
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      relations: { parcel: true },
      order: { printedAt: 'DESC' },
    });
  }
}
