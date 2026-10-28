import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverPayment } from './entities/driver-payment.entity';
import { MerchantPayment } from './entities/merchant-payment.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Organisation } from '../settings/entities/organisation.entity';
import { Tenant } from '../saas/entities/tenant.entity';
import { TelegramService } from '../telegram/telegram.service';
import { FirebaseService } from '../firebase/firebase.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(DriverPayment) private driverPaymentRepo: Repository<DriverPayment>,
    @InjectRepository(MerchantPayment) private merchantPaymentRepo: Repository<MerchantPayment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel) private parcelRepo: Repository<Parcel>,
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private readonly telegramService: TelegramService,
    private readonly firebaseService: FirebaseService,
  ) { }

  // Driver Payments
  async createDriverPayment(
    driverId: number,
    amount: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    userId?: number,
    tenantId?: number,
    currency: string = 'KHR',
    status: string = 'Paid',
  ) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const payment = this.driverPaymentRepo.create({
      driverId,
      amount,
      currency: currency || 'KHR',
      status: status || 'Paid',
      date,
      reference,
      note,
      parcelIds,
      createdById: userId,
      tenantId,
    });
    const saved = await this.driverPaymentRepo.save(payment);

    if (parcelIds && parcelIds.length > 0) {
      await this.parcelRepo
        .createQueryBuilder()
        .update(Parcel)
        .set({ driverPaymentStatus: 'paid' })
        .whereInIds(parcelIds)
        .andWhere('driverId = :driverId', { driverId })
        .execute();
    }

    return saved;
  }

  async createStaffPayment(
    driverId: number,
    amount: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    userId?: number,
  ) {
    return this.createDriverPayment(driverId, amount, date, reference, note, parcelIds, userId);
  }

  async findAllDriverPayments(tenantId?: number) {
    const qb = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.driver', 'driver')
      .leftJoinAndSelect('payment.creator', 'creator')
      .leftJoinAndSelect('payment.updater', 'updater')
      .orderBy('payment.date', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('(payment.tenantId = :tenantId OR payment.tenantId IS NULL)', { tenantId });
    }
    return qb.getMany();
  }

  async findAllStaffPayments() {
    return this.findAllDriverPayments();
  }

  // Merchant Payments
  async createMerchantPayment(
    merchantId: number,
    amount: number,
    amountKHR: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    telegramReport?: {
      totalCount: number;
      newCount: number;
      oldCount: number;
      successCount: number;
      inProgressCount: number;
      failedCount: number;
      returnedCount: number;
      pendingCount: number;
      totalUSD: number;
      totalKHR: number;
      deliveryFee: number;
      payableUSD: number;
      payableKHR: number;
      detailUrl?: string;
    },
    userId?: number,
    tenantId?: number,
    token?: string,
  ) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const secureToken = token || crypto.randomUUID();
    const payment = this.merchantPaymentRepo.create({
      merchantId,
      amount,
      amountKHR,
      date,
      reference,
      token: secureToken,
      note,
      parcelIds,
      createdById: userId,
      tenantId,
    });
    const saved = await this.merchantPaymentRepo.save(payment);

    // Update merchant balance (deduct payout amount)
    merchant.balance = parseFloat(merchant.balance as any || 0) - amount;
    await this.merchantRepo.save(merchant);

    if (parcelIds && parcelIds.length > 0) {
      await this.parcelRepo
        .createQueryBuilder()
        .update(Parcel)
        .set({ merchantPaymentStatus: 'paid' })
        .whereInIds(parcelIds)
        .andWhere('merchantId = :merchantId', { merchantId })
        .execute();
    }

    // Send Telegram Notification
    if (telegramReport) {
      const d = date ? new Date(date) : new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      let finalDetailUrl = telegramReport.detailUrl || '';
      const effectiveTenantId = tenantId || merchant.tenantId;
      if (effectiveTenantId) {
        try {
          const tenantObj = await this.tenantRepo.findOne({ where: { id: effectiveTenantId } });
          const tenantSlug = tenantObj?.slug;
          if (tenantSlug) {
            const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN?.replace(/^https?:\/\//, '') || 'new-delivery.rithyboth.work';
            if (finalDetailUrl.includes(`://${baseDomain}`)) {
              finalDetailUrl = finalDetailUrl.replace(`://${baseDomain}`, `://${tenantSlug}.${baseDomain}`);
            } else if (finalDetailUrl.includes('://localhost:3000')) {
              finalDetailUrl = finalDetailUrl.replace('://localhost:3000', `://${tenantSlug}.localhost:3000`);
            } else if (finalDetailUrl.startsWith('/')) {
              finalDetailUrl = `https://${tenantSlug}.${baseDomain}${finalDetailUrl}`;
            }
          }
        } catch (e) {
          // ignore error
        }
      }

      if (saved.token && finalDetailUrl) {
        if (finalDetailUrl.includes('client_id=') && finalDetailUrl.includes('reference=')) {
          finalDetailUrl = finalDetailUrl.replace(/client_id=[^&]+&reference=[^&]+/, `token=${saved.token}`);
        } else if (!finalDetailUrl.includes('token=')) {
          const separator = finalDetailUrl.includes('?') ? '&' : '?';
          finalDetailUrl = `${finalDetailUrl}${separator}token=${saved.token}`;
        }
      }

      const text = `📦 <b>របាយការណ៍ដឹកជញ្ជូនប្រចាំថ្ងៃ</b>\n\n` +
        `- ឈ្មោះហាង: ${merchant.nameKh || merchant.name}\n` +
        `- កាលបរិច្ឆេទ: ${formattedDate}\n` +
        `- លេខទូរស័ព្ទ: ${merchant.phone}\n` +
        `- សរុបចំនួនកញ្ចប់ (ថ្មី/ចាស់): ${telegramReport.newCount || 0} / ${telegramReport.oldCount || 0}\n` +
        `- ដឹកជោគជ័យ: ${telegramReport.successCount || 0} កញ្ចប់\n` +
        `- កំពុងដឹក: ${telegramReport.inProgressCount || 0} កញ្ចប់\n` +
        `- មានបញ្ហា: ${telegramReport.failedCount || 0} កញ្ចប់\n` +
        `- ឥវ៉ាន់ត្រឡប់: ${telegramReport.returnedCount || 0} កញ្ចប់\n` +
        `- នៅក្នុងស្តុក: ${telegramReport.pendingCount || 0} កញ្ចប់\n` +
        `- 🚚 សេវាដឹកត្រូវទទួល: $ ${parseFloat(telegramReport.deliveryFee as any || 0).toFixed(2)}\n\n` +
        `💵 <b>Total Amount: $ ${parseFloat(telegramReport.totalUSD as any || 0).toFixed(2)}</b>\n` +
        `<b>USD:</b> $ ${parseFloat(telegramReport.payableUSD as any || 0).toFixed(2)} USD\n` +
        `<b>KHR:</b> ${(telegramReport.payableKHR || 0).toLocaleString()} រៀល\n` +
        `-------------------------\n` +
        `របាយការណ៍លម្អិត ចុចត្រង់នេះ: <a href="${finalDetailUrl}">Click Detail</a>`;

      await this.telegramService.notifyMerchant(merchantId, 'PAYMENT_SETTLEMENT', text);
    }

    try {
      await this.firebaseService.sendToMerchant(merchantId, {
        title: 'ការទូទាត់ប្រាក់ COD បានបញ្ចប់ 💰',
        body: `ការទូទាត់ប្រាក់ #${saved.reference || saved.id} សរុប $${parseFloat(amount as any || 0).toFixed(2)} បានទូទាត់រួចរាល់`,
        type: 'payment_settlement',
        data: { settlementId: saved.id, reference: saved.reference },
        tenantId,
      });
    } catch (e) {
      // Continue
    }

    return saved;
  }

  async createShopPayment(
    merchantId: number,
    amount: number,
    amountKHR: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    telegramReport?: any,
    userId?: number,
    tenantId?: number,
    token?: string,
  ) {
    return this.createMerchantPayment(
      merchantId,
      amount,
      amountKHR,
      date,
      reference,
      note,
      parcelIds,
      telegramReport,
      userId,
      tenantId,
      token,
    );
  }

  async findAllMerchantPayments(tenantId?: number) {
    const qb = this.merchantPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.merchant', 'merchant')
      .leftJoinAndSelect('payment.creator', 'creator')
      .leftJoinAndSelect('payment.updater', 'updater')
      .orderBy('payment.date', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('(payment.tenantId = :tenantId OR payment.tenantId IS NULL)', { tenantId });
    }
    return qb.getMany();
  }

  async findAllShopPayments() {
    return this.findAllMerchantPayments();
  }

  async getDriverPaymentStats(driverId: number, tenantId?: number) {
    const driverQb = this.userRepo
      .createQueryBuilder('user')
      .where('user.id = :driverId', { driverId });
    if (tenantId) {
      driverQb.andWhere('(user.tenantId = :tenantId OR user.tenantId IS NULL)', { tenantId });
    }
    const driver = await driverQb.getOne();
    if (!driver) throw new NotFoundException('Driver not found');

    // Total COD USD collected from delivered orders
    const codUsdResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR collected from delivered orders
    const codKhrResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'KHR'")
      .getRawOne();

    // Total completed delivery fees
    const deliveryFeeResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .getRawOne();

    // Total payments settled to driver
    const settledResult = await this.driverPaymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.driverId = :driverId', { driverId })
      .getRawOne();

    return {
      driverId,
      salary: parseFloat((driver.salary as any) || '0'),
      totalCodUSD: parseFloat(codUsdResult?.total || '0'),
      totalCodKHR: parseFloat(codKhrResult?.total || '0'),
      totalDeliveryFee: parseFloat(deliveryFeeResult?.total || '0'),
      totalSettled: parseFloat(settledResult?.total || '0'),
    };
  }

  async getMerchantPaymentStats(merchantId: number, tenantId?: number) {
    const merchantQb = this.merchantRepo
      .createQueryBuilder('merchant')
      .where('merchant.id = :merchantId', { merchantId });
    if (tenantId) {
      merchantQb.andWhere('(merchant.tenantId = :tenantId OR merchant.tenantId IS NULL)', { tenantId });
    }
    const merchant = await merchantQb.getOne();
    if (!merchant) throw new NotFoundException('Merchant not found');

    // Total COD USD collected for them from delivered orders
    const codUsdResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR collected for them from delivered orders
    const codKhrResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'KHR'")
      .getRawOne();

    // Total completed delivery fees
    const deliveryFeeResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere("parcel.status = 'delivered'")
      .getRawOne();

    // Total payouts/settlements recorded
    const settledResult = await this.merchantPaymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.merchantId = :merchantId', { merchantId })
      .getRawOne();

    return {
      merchantId,
      balance: parseFloat((merchant.balance as any) || '0'),
      totalCodUSD: parseFloat(codUsdResult?.total || '0'),
      totalCodKHR: parseFloat(codKhrResult?.total || '0'),
      totalDeliveryFee: parseFloat(deliveryFeeResult?.total || '0'),
      totalSettled: parseFloat(settledResult?.total || '0'),
    };
  }

  async sendTelegramMessage(chatId: string, text: string) {
    return this.telegramService.sendMessage(chatId, text, {
      eventType: 'PAYMENT_SETTLEMENT',
    });
  }

  async deleteDriverPayment(id: number, tenantId?: number) {
    const qb = this.driverPaymentRepo.createQueryBuilder('payment').where('payment.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(payment.tenantId = :tenantId OR payment.tenantId IS NULL)', { tenantId });
    }
    const payment = await qb.getOne();
    if (!payment) throw new NotFoundException('Payment record not found');

    const ids = payment.parcelIds;
    if (ids && ids.length > 0) {
      await this.parcelRepo
        .createQueryBuilder()
        .update(Parcel)
        .set({ driverPaymentStatus: 'unpaid' })
        .whereInIds(ids)
        .andWhere('driverId = :driverId', { driverId: payment.driverId })
        .execute();
    }

    await this.driverPaymentRepo.remove(payment);
    return { success: true };
  }

  async deleteStaffPayment(id: number) {
    return this.deleteDriverPayment(id);
  }

  async updateDriverPayment(
    id: number,
    body: { amount?: number; currency?: string; note?: string; date?: Date; reference?: string; status?: string },
    userId?: number,
    tenantId?: number,
  ) {
    const qb = this.driverPaymentRepo.createQueryBuilder('payment').where('payment.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(payment.tenantId = :tenantId OR payment.tenantId IS NULL)', { tenantId });
    }
    const payment = await qb.getOne();
    if (!payment) throw new NotFoundException('Payment record not found');

    if (body.amount !== undefined) payment.amount = parseFloat(body.amount as any);
    if (body.currency !== undefined) payment.currency = body.currency;
    if (body.note !== undefined) payment.note = body.note;
    if (body.date !== undefined) payment.date = body.date;
    if (body.reference !== undefined) payment.reference = body.reference;
    if (body.status !== undefined) payment.status = body.status;
    if (userId) payment.updatedById = userId;

    return this.driverPaymentRepo.save(payment);
  }

  async updateStaffPayment(
    id: number,
    body: { amount?: number; note?: string; date?: Date; reference?: string },
    userId?: number,
  ) {
    return this.updateDriverPayment(id, body, userId);
  }

  async deleteMerchantPayment(id: number, tenantId?: number) {
    const qb = this.merchantPaymentRepo.createQueryBuilder('payment').where('payment.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(payment.tenantId = :tenantId OR payment.tenantId IS NULL)', { tenantId });
    }
    const payment = await qb.getOne();
    if (!payment) throw new NotFoundException('Payment record not found');

    const merchant = await this.merchantRepo.findOne({ where: { id: payment.merchantId } });
    if (merchant) {
      merchant.balance = parseFloat(merchant.balance as any) + parseFloat(payment.amount as any);
      await this.merchantRepo.save(merchant);
    }

    const ids = payment.parcelIds;
    if (ids && ids.length > 0) {
      await this.parcelRepo
        .createQueryBuilder()
        .update(Parcel)
        .set({ merchantPaymentStatus: 'unpaid' })
        .whereInIds(ids)
        .andWhere('merchantId = :merchantId', { merchantId: payment.merchantId })
        .execute();
    }

    await this.merchantPaymentRepo.remove(payment);
    return { success: true };
  }

  async deleteShopPayment(id: number) {
    return this.deleteMerchantPayment(id);
  }

  async updateMerchantPayment(
    id: number,
    body: { amount?: number; note?: string; date?: Date; reference?: string },
    userId?: number,
    tenantId?: number,
  ) {
    const qb = this.merchantPaymentRepo.createQueryBuilder('payment').where('payment.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(payment.tenantId = :tenantId OR payment.tenantId IS NULL)', { tenantId });
    }
    const payment = await qb.getOne();
    if (!payment) throw new NotFoundException('Payment record not found');

    if (body.amount !== undefined) {
      const oldAmount = parseFloat(payment.amount as any);
      const newAmount = parseFloat(body.amount as any);
      const diff = oldAmount - newAmount;

      const merchant = await this.merchantRepo.findOne({ where: { id: payment.merchantId } });
      if (merchant) {
        merchant.balance = parseFloat(merchant.balance as any) + diff;
        await this.merchantRepo.save(merchant);
      }
      payment.amount = newAmount;
    }

    if (body.note !== undefined) payment.note = body.note;
    if (body.date !== undefined) payment.date = body.date;
    if (body.reference !== undefined) payment.reference = body.reference;
    if (userId) payment.updatedById = userId;

    return this.merchantPaymentRepo.save(payment);
  }

  async updateShopPayment(
    id: number,
    body: { amount?: number; note?: string; date?: Date; reference?: string },
    userId?: number,
  ) {
    return this.updateMerchantPayment(id, body, userId);
  }

  async getPublicInvoice(merchantId?: number, reference?: string, token?: string) {
    let whereCondition: any;
    if (token) {
      whereCondition = { token };
    } else if (merchantId && reference) {
      whereCondition = { merchantId, reference };
    } else {
      throw new NotFoundException('Payment settlement not found');
    }

    const payment = await this.merchantPaymentRepo.findOne({
      where: whereCondition,
      relations: { merchant: true },
    });
    if (!payment) throw new NotFoundException('Payment settlement not found');

    let parcels: any[] = [];
    const ids = payment.parcelIds;
    if (ids && ids.length > 0) {
      parcels = await this.parcelRepo.createQueryBuilder('parcel')
        .whereInIds(ids)
        .leftJoinAndSelect('parcel.merchant', 'merchant')
        .leftJoinAndSelect('parcel.driver', 'driver')
        .leftJoinAndSelect('parcel.events', 'events')
        .getMany();
    }

    const effectiveTenantId = payment.tenantId || payment.merchant?.tenantId;
    let tenant: Tenant | null = null;
    if (effectiveTenantId) {
      tenant = await this.tenantRepo.findOne({ where: { id: effectiveTenantId } });
    }

    let orgSetting: Organisation | null = null;
    if (effectiveTenantId) {
      orgSetting = await this.orgRepo.findOne({ where: { tenantId: effectiveTenantId } });
    }
    if (!orgSetting) {
      orgSetting = await this.orgRepo.findOne({ where: {} });
    }

    const dynamicLogo = tenant?.logo || orgSetting?.logo || null;
    const dynamicName = (orgSetting?.name && orgSetting.name !== 'EBS Digital Solutions')
      ? orgSetting.name
      : (tenant?.name || orgSetting?.name || 'Delivery Express');

    const orgInfo = {
      name: dynamicName,
      phone: orgSetting?.phone || tenant?.phone || '012345676',
      address: orgSetting?.address || tenant?.address || 'Phnom Penh, Cambodia',
      logo: dynamicLogo,
      logoUrl: dynamicLogo,
      email: orgSetting?.email || tenant?.email || '',
    };

    return {
      payment,
      parcels,
      orgInfo,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        logoUrl: tenant.logo,
        phone: tenant.phone,
        address: tenant.address,
      } : null,
    };
  }

  /** Dedicated endpoint for Merchant settlement parcels (ទូទាត់ប្រាក់ជាមួយហាង) */
  async findMerchantSettlementParcels(query?: {
    merchantId?: number;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: number;
  }) {
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .where('parcel.status IN (:...statuses)', {
        statuses: ['delivered', 'failed', 'returned', 'in-transit', 'picked-up', 'pending'],
      })
      .orderBy('parcel.id', 'DESC');

    if (query?.tenantId) {
      qb.andWhere('(parcel.tenantId = :tenantId OR parcel.tenantId IS NULL)', { tenantId: query.tenantId });
    }
    if (query?.merchantId) {
      qb.andWhere('parcel.merchantId = :merchantId', { merchantId: query.merchantId });
    }
    if (query?.statusFilter && query.statusFilter !== 'all') {
      if (query.statusFilter === 'unpaid') {
        qb.andWhere('(parcel.merchantPaymentStatus = :pStatus OR parcel.merchantPaymentStatus IS NULL)', { pStatus: 'unpaid' });
      } else {
        qb.andWhere('parcel.merchantPaymentStatus = :pStatus', { pStatus: query.statusFilter });
      }
    }
    if (query?.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere('COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :start', { start });
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :end', { end });
    }

    return qb.getMany();
  }

  /** Dedicated endpoint for Driver settlement parcels (ទូទាត់ប្រាក់ជាមួយអ្នកដឹក) */
  async findDriverSettlementParcels(query?: {
    driverId?: number;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: number;
  }) {
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .where('parcel.status IN (:...statuses)', {
        statuses: ['delivered', 'failed', 'returned', 'in-transit', 'picked-up', 'pending'],
      })
      .orderBy('parcel.id', 'DESC');

    if (query?.tenantId) {
      qb.andWhere('(parcel.tenantId = :tenantId OR parcel.tenantId IS NULL)', { tenantId: query.tenantId });
    }
    if (query?.driverId) {
      qb.andWhere('parcel.driverId = :driverId', { driverId: query.driverId });
    }
    if (query?.statusFilter && query.statusFilter !== 'all') {
      if (query.statusFilter === 'unpaid') {
        qb.andWhere('(parcel.driverPaymentStatus = :pStatus OR parcel.driverPaymentStatus IS NULL)', { pStatus: 'unpaid' });
      } else {
        qb.andWhere('parcel.driverPaymentStatus = :pStatus', { pStatus: query.statusFilter });
      }
    }
    if (query?.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere('COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :start', { start });
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :end', { end });
    }

    return qb.getMany();
  }

}
