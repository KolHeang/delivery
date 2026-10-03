import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasPayment } from './saas-payment.entity';
import { SaasInvoice } from '../invoices/saas-invoice.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { Coupon } from '../coupons/coupon.entity';
import { CommissionsService } from '../commissions/commissions.service';

@Injectable()
export class SaasPaymentsService {
  constructor(
    @InjectRepository(SaasPayment)
    private readonly paymentRepo: Repository<SaasPayment>,
    @InjectRepository(SaasInvoice)
    private readonly invoiceRepo: Repository<SaasInvoice>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    private readonly commissionsService: CommissionsService,
  ) {}

  async findAll(): Promise<SaasPayment[]> {
    return this.paymentRepo.find({
      relations: { invoice: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<SaasPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async processPayment(dto: {
    invoiceId: number;
    paymentMethod: string;
    transactionId?: string;
  }) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId },
      relations: {
        subscription: true,
        coupon: {
          partner: true,
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    if (invoice.status === 'paid') {
      throw new BadRequestException('This invoice has already been paid');
    }

    const txId =
      dto.transactionId ||
      'TX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // 1. Create Payment Record
    const payment = this.paymentRepo.create({
      invoiceId: invoice.id,
      transactionId: txId,
      paymentMethod: dto.paymentMethod || 'khqr',
      amount: invoice.totalAmount,
      status: 'success',
      rawResponse: {
        method: dto.paymentMethod,
        timestamp: new Date().toISOString(),
        verified: true,
      },
    });
    const savedPayment = await this.paymentRepo.save(payment);

    // 2. Mark Invoice as Paid
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await this.invoiceRepo.save(invoice);

    // 3. Update Subscription if linked
    if (invoice.subscriptionId) {
      const sub = await this.subRepo.findOne({
        where: { id: invoice.subscriptionId },
      });
      if (sub) {
        sub.status = 'active';
        const now = new Date();
        sub.currentPeriodStart = now;

        const nextEnd = new Date(now);
        if (sub.billingCycle === 'yearly') {
          nextEnd.setFullYear(nextEnd.getFullYear() + 1);
        } else {
          nextEnd.setMonth(nextEnd.getMonth() + 1);
        }
        sub.currentPeriodEnd = nextEnd;
        await this.subRepo.save(sub);
      }
    }

    // 4. Update Coupon used count if applied
    if (invoice.couponId) {
      const coupon = await this.couponRepo.findOne({
        where: { id: invoice.couponId },
        relations: { partner: true },
      });
      if (coupon) {
        coupon.usedCount += 1;
        await this.couponRepo.save(coupon);

        // 5. Trigger Partner Commission if coupon has partner
        if (coupon.partnerId) {
          await this.commissionsService.createForPayment(
            coupon.partnerId,
            invoice,
            savedPayment,
          );
        }
      }
    }

    return {
      success: true,
      message: 'Payment completed successfully. Subscription is now active!',
      payment: savedPayment,
      invoice,
    };
  }
}
