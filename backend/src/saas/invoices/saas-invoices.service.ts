import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasInvoice, SaasInvoiceStatus } from './saas-invoice.entity';

@Injectable()
export class SaasInvoicesService {
  constructor(
    @InjectRepository(SaasInvoice)
    private readonly invoiceRepo: Repository<SaasInvoice>,
  ) {}

  async findAll(): Promise<SaasInvoice[]> {
    return this.invoiceRepo.find({
      relations: {
        user: true,
        subscription: true,
        coupon: true,
        payments: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(userId: number): Promise<SaasInvoice[]> {
    return this.invoiceRepo.find({
      where: { userId },
      relations: {
        subscription: true,
        coupon: true,
        payments: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<SaasInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: {
        user: true,
        subscription: true,
        coupon: true,
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('SaaS Invoice not found');
    return invoice;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<SaasInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceNumber },
      relations: {
        user: true,
        subscription: true,
        coupon: true,
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundException('SaaS Invoice not found');
    return invoice;
  }

  async create(data: Partial<SaasInvoice>): Promise<SaasInvoice> {
    const count = await this.invoiceRepo.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const invoice = this.invoiceRepo.create({
      ...data,
      invoiceNumber: data.invoiceNumber || invoiceNumber,
      status: data.status || 'pending',
    });
    return this.invoiceRepo.save(invoice);
  }

  async markAsPaid(id: number): Promise<SaasInvoice> {
    return this.updateStatus(id, 'paid');
  }

  async updateStatus(id: number, status: SaasInvoiceStatus | string): Promise<SaasInvoice> {
    const invoice = await this.findById(id);
    invoice.status = status as SaasInvoiceStatus;
    if (status === 'paid') {
      invoice.paidAt = new Date();
      if (invoice.subscription) {
        invoice.subscription.status = 'active';
        await this.invoiceRepo.manager.save(invoice.subscription);
      }
    }
    return this.invoiceRepo.save(invoice);
  }
}
