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
        subscription: {
          tenant: true,
          plan: true,
        },
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

  async create(data: Partial<SaasInvoice> & { tenantId?: number }): Promise<SaasInvoice> {
    let resolvedSubscriptionId = data.subscriptionId;
    let resolvedUserId = data.userId;

    // 1. Resolve subscription if only tenantId provided
    if (!resolvedSubscriptionId && data.tenantId) {
      const sub = await this.invoiceRepo.manager.query(
        'SELECT id, user_id FROM saas_subscriptions WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1',
        [data.tenantId],
      );
      if (sub && sub[0]) {
        resolvedSubscriptionId = sub[0].id;
        if (!resolvedUserId && sub[0].user_id) {
          resolvedUserId = sub[0].user_id;
        }
      }
    }

    // 2. Resolve userId from subscription if not provided
    if (!resolvedUserId && resolvedSubscriptionId) {
      const sub = await this.invoiceRepo.manager.query(
        'SELECT user_id FROM saas_subscriptions WHERE id = $1 LIMIT 1',
        [resolvedSubscriptionId],
      );
      if (sub && sub[0]?.user_id) {
        resolvedUserId = sub[0].user_id;
      }
    }

    // 3. Fallback userId from users table
    if (!resolvedUserId) {
      const users = await this.invoiceRepo.manager.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
      if (users && users[0]?.id) {
        resolvedUserId = users[0].id;
      } else {
        resolvedUserId = 1;
      }
    }

    // 4. Generate guaranteed unique invoice number
    let invoiceNumber = data.invoiceNumber;
    if (!invoiceNumber) {
      const year = new Date().getFullYear();
      let candidate = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        attempts++;
        const rand = Math.floor(1000 + Math.random() * 9000);
        const count = await this.invoiceRepo.count();
        candidate = `INV-${year}-${String(count + attempts).padStart(4, '0')}-${rand}`;
        const existing = await this.invoiceRepo.findOne({ where: { invoiceNumber: candidate } });
        if (!existing) {
          isUnique = true;
          invoiceNumber = candidate;
        }
      }
      if (!invoiceNumber) {
        invoiceNumber = `INV-${year}-${Date.now()}`;
      }
    }

    const { paymentMethod, planId, billingCycle, tenantId, ...invoiceFields } = data as any;

    const invoice = this.invoiceRepo.create({
      ...invoiceFields,
      subscriptionId: resolvedSubscriptionId,
      userId: resolvedUserId,
      invoiceNumber,
      subtotal: Number(data.subtotal || data.totalAmount || 0),
      totalAmount: Number(data.totalAmount || data.subtotal || 0),
      discountAmount: Number(data.discountAmount || 0),
      status: (data.status as any) || 'pending',
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
      paidAt: data.status === 'paid' ? (data.paidAt ? new Date(data.paidAt) : new Date()) : (data.paidAt ? new Date(data.paidAt) : undefined),
    } as any) as unknown as SaasInvoice;

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
        const now = new Date();
        invoice.subscription.currentPeriodStart = now;
        const nextEnd = new Date(now);
        if (invoice.subscription.billingCycle === 'yearly') {
          nextEnd.setFullYear(nextEnd.getFullYear() + 1);
        } else {
          nextEnd.setMonth(nextEnd.getMonth() + 1);
        }
        invoice.subscription.currentPeriodEnd = nextEnd;
        await this.invoiceRepo.manager.save(invoice.subscription);
      }
    }
    return this.invoiceRepo.save(invoice);
  }
}
