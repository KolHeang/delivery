import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SaasPayment } from './saas-payment.entity';
import { SaasPaymentOption } from './saas-payment-option.entity';
import { SaasInvoice } from '../invoices/saas-invoice.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { Coupon } from '../coupons/coupon.entity';
import { CommissionsService } from '../commissions/commissions.service';
import {
  CheckoutPayDto,
  CreatePaymentOptionDto,
  UpdatePaymentOptionDto,
} from './dto/saas-payment.dto';

@Injectable()
export class SaasPaymentsService {
  constructor(
    @InjectRepository(SaasPayment)
    private readonly paymentRepo: Repository<SaasPayment>,
    @InjectRepository(SaasPaymentOption)
    private readonly optionRepo: Repository<SaasPaymentOption>,
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
      relations: {
        invoice: {
          subscription: true,
          user: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<SaasPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: {
        invoice: {
          subscription: true,
          user: true,
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // ── Payment Options Management ──
  async getPaymentOptions(onlyActive = false): Promise<SaasPaymentOption[]> {
    const where = onlyActive ? { status: In(['active', 'pending']) } : {};
    return this.optionRepo.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createPaymentOption(dto: CreatePaymentOptionDto): Promise<SaasPaymentOption> {
    const option = this.optionRepo.create({
      ...dto,
      status: dto.status || (dto.type === 'aba' ? 'pending' : 'active'),
      requiresApproval: dto.requiresApproval !== undefined ? dto.requiresApproval : dto.type === 'offline',
    });
    return this.optionRepo.save(option);
  }

  async updatePaymentOption(
    id: number,
    dto: UpdatePaymentOptionDto,
  ): Promise<SaasPaymentOption> {
    const option = await this.optionRepo.findOne({ where: { id } });
    if (!option) throw new NotFoundException('Payment option not found');
    Object.assign(option, dto);
    return this.optionRepo.save(option);
  }

  async deletePaymentOption(id: number): Promise<{ success: boolean }> {
    const option = await this.optionRepo.findOne({ where: { id } });
    if (!option) throw new NotFoundException('Payment option not found');
    await this.optionRepo.remove(option);
    return { success: true };
  }

  // ── Tenant Checkout Flow ──
  async processPayment(dto: CheckoutPayDto) {
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

    // Check if ABA online payment selected
    if (dto.paymentMethod === 'aba') {
      throw new BadRequestException(
        'ABA Bank Direct API is currently pending bank integration. Please use the Offline payment option.',
      );
    }

    const txId =
      dto.transactionId?.trim() ||
      'OFFLINE-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    // 1. Create Payment Record with 'pending' status for offline approval
    const payment = this.paymentRepo.create({
      invoiceId: invoice.id,
      transactionId: txId,
      paymentMethod: dto.paymentMethod || 'offline',
      amount: invoice.totalAmount,
      status: 'pending', // Requires admin approval
      paymentOptionId: dto.paymentOptionId,
      note: dto.note || 'Submitted via offline transfer. Waiting for admin approval.',
      rawResponse: {
        method: dto.paymentMethod || 'offline',
        timestamp: new Date().toISOString(),
        verified: false,
        requiresApproval: true,
        submittedTxId: dto.transactionId || null,
      },
    });
    const savedPayment = await this.paymentRepo.save(payment);

    // Invoice remains pending until Admin SaaS approves
    invoice.status = 'pending';
    await this.invoiceRepo.save(invoice);

    return {
      success: true,
      status: 'pending',
      requiresApproval: true,
      message: 'ការទូទាត់ត្រូវបានផ្ញើជោគជ័យ! សូមរង់ចាំ Admin ពិនិត្យនិងអនុម័ត (Payment submitted! Waiting for Admin SaaS approval).',
      payment: savedPayment,
      invoice,
    };
  }

  // ── Admin SAAS Approval Flow ──
  async approvePayment(paymentId: number, adminUser?: any) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: {
        invoice: {
          subscription: true,
          coupon: {
            partner: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === 'success') {
      throw new BadRequestException('This payment has already been approved');
    }

    // 1. Update Payment
    payment.status = 'success';
    payment.approvedAt = new Date();
    payment.approvedBy = adminUser?.name || adminUser?.email || 'SaaS Admin';
    payment.rawResponse = {
      ...(payment.rawResponse || {}),
      approvedAt: payment.approvedAt.toISOString(),
      approvedBy: payment.approvedBy,
    };
    const savedPayment = await this.paymentRepo.save(payment);

    // 2. Mark Invoice as Paid
    const invoice = payment.invoice;
    if (invoice) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      await this.invoiceRepo.save(invoice);

      // 3. Extend/Activate Subscription
      if (invoice.subscriptionId) {
        const sub = await this.subRepo.findOne({
          where: { id: invoice.subscriptionId },
        });
        if (sub) {
          sub.status = 'active';
          const now = new Date();
          sub.currentPeriodStart = now;

          const base =
            sub.currentPeriodEnd &&
            new Date(sub.currentPeriodEnd).getTime() > now.getTime()
              ? new Date(sub.currentPeriodEnd)
              : new Date(now);

          if (sub.billingCycle === 'yearly') {
            base.setFullYear(base.getFullYear() + 1);
          } else {
            base.setMonth(base.getMonth() + 1);
          }
          sub.currentPeriodEnd = base;
          await this.subRepo.save(sub);
        }
      }

      // 4. Update Coupon used count and create commission if applicable
      if (invoice.couponId) {
        const coupon = await this.couponRepo.findOne({
          where: { id: invoice.couponId },
          relations: { partner: true },
        });
        if (coupon) {
          coupon.usedCount += 1;
          await this.couponRepo.save(coupon);

          if (coupon.partnerId) {
            await this.commissionsService.createForPayment(
              coupon.partnerId,
              invoice,
              savedPayment,
            );
          }
        }
      }
    }

    return {
      success: true,
      message: 'ការទូទាត់ត្រូវបានអនុម័តជោគជ័យ! គម្រោងក្រុមហ៊ុនត្រូវបានបើកដំណើរការ (Payment approved! Subscription is now active).',
      payment: savedPayment,
      invoice,
    };
  }

  async rejectPayment(paymentId: number, reason?: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
      relations: { invoice: true },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = 'failed';
    payment.note = reason || 'Payment rejected by SaaS Admin';
    payment.rawResponse = {
      ...(payment.rawResponse || {}),
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || 'Invalid transaction proof or reference',
    };
    const savedPayment = await this.paymentRepo.save(payment);

    return {
      success: true,
      message: 'Payment rejected.',
      payment: savedPayment,
    };
  }
}
