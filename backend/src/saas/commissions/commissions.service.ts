import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Commission, CommissionStatus } from './commission.entity';
import { SaasInvoice } from '../invoices/saas-invoice.entity';
import { SaasPayment } from '../payments/saas-payment.entity';
import { Partner } from '../partners/partner.entity';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepo: Repository<Commission>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
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
      where = { ...where, partner: { name: ILike(term) } };
    }

    const findOptions: any = {
      where,
      relations: { partner: true, invoice: true, payment: true },
      order: { createdAt: 'DESC' },
    };

    if (page === undefined) {
      return this.commissionRepo.find(findOptions);
    }

    const [result, total] = await this.commissionRepo.findAndCount({
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

  async findByPartner(partnerId: number): Promise<Commission[]> {
    return this.commissionRepo.find({
      where: { partnerId },
      relations: { invoice: true, payment: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createForPayment(
    partnerId: number,
    invoice: SaasInvoice,
    payment: SaasPayment,
  ): Promise<Commission | null> {
    const partner = await this.partnerRepo.findOne({
      where: { id: partnerId, isActive: true },
    });
    if (!partner) return null;

    const rate = Number(partner.commissionRate) || 0;
    const paidAmount = Number(payment.amount) || Number(invoice.totalAmount) || 0;
    const calculatedAmount = Number(((paidAmount * rate) / 100).toFixed(2));

    const commission = this.commissionRepo.create({
      partnerId: partner.id,
      invoiceId: invoice.id,
      paymentId: payment.id,
      calculatedAmount,
      commissionRate: rate,
      status: 'pending',
    });

    return this.commissionRepo.save(commission);
  }

  async updateStatus(
    id: number,
    status: CommissionStatus,
    payoutReference?: string,
  ): Promise<Commission> {
    const commission = await this.commissionRepo.findOne({ where: { id } });
    if (!commission) throw new NotFoundException('Commission not found');

    commission.status = status;
    if (status === 'paid') {
      commission.payoutDate = new Date();
      if (payoutReference) {
        commission.payoutReference = payoutReference;
      }
    }

    return this.commissionRepo.save(commission);
  }
}
