import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverPayment } from './entities/driver-payment.entity';
import { MerchantPayment } from './entities/merchant-payment.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Organisation } from '../settings/entities/organisation.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(DriverPayment) private driverPaymentRepo: Repository<DriverPayment>,
    @InjectRepository(MerchantPayment) private merchantPaymentRepo: Repository<MerchantPayment>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel) private parcelRepo: Repository<Parcel>,
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
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
  ) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const payment = this.driverPaymentRepo.create({
      driverId,
      amount,
      date,
      reference,
      note,
      parcelIds,
      createdById: userId,
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

  async findAllDriverPayments() {
    return this.driverPaymentRepo.find({
      relations: { driver: true, creator: true, updater: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
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
  ) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const payment = this.merchantPaymentRepo.create({
      merchantId,
      amount,
      amountKHR,
      date,
      reference,
      note,
      parcelIds,
      createdById: userId,
    });
    const saved = await this.merchantPaymentRepo.save(payment);

    // Update merchant balance (deduct payout amount)
    merchant.balance = parseFloat(merchant.balance as any) - amount;
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
    const targetChatId = merchant.telegram || process.env.CHAT_ID;
    if (targetChatId && telegramReport) {
      const d = date ? new Date(date) : new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

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
        `របាយការណ៍លម្អិត ចុចត្រង់នេះ: <a href="${telegramReport.detailUrl || ''}">Click Detail</a>`;

      await this.sendTelegramMessage(targetChatId.trim(), text);
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
    );
  }

  async findAllMerchantPayments() {
    return this.merchantPaymentRepo.find({
      relations: { merchant: true, creator: true, updater: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAllShopPayments() {
    return this.findAllMerchantPayments();
  }

  async getDriverPaymentStats(driverId: number) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
    });
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

  async getMerchantPaymentStats(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
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
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('TELEGRAM_BOT_TOKEN is not defined in environment variables');
      return;
    }

    // Normalize username/chat ID
    let targetChatId = chatId.trim();
    if (!targetChatId.match(/^-?\d+$/) && !targetChatId.startsWith('@')) {
      targetChatId = `@${targetChatId}`;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Telegram API responded with error: ${response.status} ${errorText}`);
      } else {
        console.log(`Telegram message sent successfully to ${targetChatId}`);
      }
    } catch (err) {
      console.error('Failed to send Telegram message:', err);
    }
  }

  async deleteDriverPayment(id: number) {
    const payment = await this.driverPaymentRepo.findOne({ where: { id } });
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
    body: { amount?: number; note?: string; date?: Date; reference?: string },
    userId?: number,
  ) {
    const payment = await this.driverPaymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (body.amount !== undefined) payment.amount = parseFloat(body.amount as any);
    if (body.note !== undefined) payment.note = body.note;
    if (body.date !== undefined) payment.date = body.date;
    if (body.reference !== undefined) payment.reference = body.reference;
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

  async deleteMerchantPayment(id: number) {
    const payment = await this.merchantPaymentRepo.findOne({ where: { id } });
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
  ) {
    const payment = await this.merchantPaymentRepo.findOne({ where: { id } });
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

  async getPublicInvoice(merchantId: number, reference: string) {
    const payment = await this.merchantPaymentRepo.findOne({
      where: { merchantId, reference },
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

    let orgInfo = await this.orgRepo.findOne({ where: {} });
    if (!orgInfo) {
      orgInfo = {
        name: 'E-Express',
        phone: '011609414',
        address: 'Phnom Penh',
      } as any;
    }

    return {
      payment,
      parcels,
      orgInfo,
    };
  }
}
