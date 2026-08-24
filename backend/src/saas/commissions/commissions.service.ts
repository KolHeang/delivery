import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAll(): Promise<Commission[]> {
    return this.commissionRepo.find({
      relations: { partner: true, invoice: true, payment: true },
      order: { createdAt: 'DESC' },
    });
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
