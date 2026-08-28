import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SaasInvoice, SaasInvoiceStatus } from './saas-invoice.entity';

@Injectable()
export class SaasInvoicesService {
  constructor(
    @InjectRepository(SaasInvoice)
    private readonly invoiceRepo: Repository<SaasInvoice>,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string; status?: string }): Promise<any> {
    const page = query?.page !== undefined ? Math.max(1, Number(query.page)) : undefined;
    const limit = query?.limit !== undefined ? Math.max(1, Number(query.limit)) : 10;

    let where: any = {};
    if (query?.status && query.status !== 'all') {
      where.status = query.status;
    }
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { ...where, invoiceNumber: ILike(term) },
        { ...where, user: { email: ILike(term) } },
      ];
    }

    const findOptions: any = {
      where,
      relations: {
        user: true,
        subscription: true,
        coupon: true,
        payments: true,
      },
      order: { createdAt: 'DESC' },
    };

    if (page === undefined) {
      return this.invoiceRepo.find(findOptions);
    }

    const [result, total] = await this.invoiceRepo.findAndCount({
      ...findOptions,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      result,
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
