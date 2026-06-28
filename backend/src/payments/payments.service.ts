import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffPayment } from './staff-payment.entity';
import { ShopPayment } from './shop-payment.entity';
import { User } from '../users/users.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';
import { Organisation } from '../settings/organisation.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(StaffPayment) private staffRepo: Repository<StaffPayment>,
    @InjectRepository(ShopPayment) private shopRepo: Repository<ShopPayment>,
    @InjectRepository(User) private driverRepo: Repository<User>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
  ) { }

  // UserPayments
  async createStaffPayment(
    driverId: number,
    amount: number,
    date: Date,
    reference?: string,
    note?: string,
    orderIds?: number[],
  ) {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId, role: 'driver' },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const payment = this.staffRepo.create({
      driverId,
      amount,
      date,
      reference,
      note,
      orderIds,
    });
    const saved = await this.staffRepo.save(payment);

    if (orderIds && orderIds.length > 0) {
      await this.orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({ driverPaymentStatus: 'paid' })
        .whereInIds(orderIds)
        .andWhere('driverId = :driverId', { driverId })
        .execute();
    }

    return saved;
  }

  async findAllStaffPayments() {
    return this.staffRepo.find({
      relations: { driver: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  // Shop Payments
  async createShopPayment(
    merchantId: number,
    amount: number,
    amountKHR: number,
    date: Date,
    reference?: string,
    note?: string,
    orderIds?: number[],
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
  ) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const payment = this.shopRepo.create({
      merchantId,
      amount,
      amountKHR,
      date,
      reference,
      note,
      orderIds,
    });
    const saved = await this.shopRepo.save(payment);

    // Update merchant balance (deduct payout amount)
    merchant.balance = parseFloat(merchant.balance as any) - amount;
    await this.merchantRepo.save(merchant);

    if (orderIds && orderIds.length > 0) {
      await this.orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({ merchantPaymentStatus: 'paid' })
        .whereInIds(orderIds)
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

  async findAllShopPayments() {
    return this.shopRepo.find({
      relations: { merchant: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async getDriverPaymentStats(driverId: number) {
    const driver = await this.driverRepo.findOne({
      where: { id: driverId, role: 'driver' },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    // Total COD USD collected from delivered orders
    const codUsdResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR collected from delivered orders
    const codKhrResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'KHR'")
      .getRawOne();

    // Total completed delivery fees
    const deliveryFeeResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .getRawOne();

    // Total payments settled to staff
    const settledResult = await this.staffRepo
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
    const codUsdResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR collected for them from delivered orders
    const codKhrResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'KHR'")
      .getRawOne();

    // Total completed delivery fees
    const deliveryFeeResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere("order.status = 'delivered'")
      .getRawOne();

    // Total payouts/settlements recorded
    const settledResult = await this.shopRepo
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

  async deleteStaffPayment(id: number) {
    const payment = await this.staffRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (payment.orderIds && payment.orderIds.length > 0) {
      await this.orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({ driverPaymentStatus: 'unpaid' })
        .whereInIds(payment.orderIds)
        .andWhere('driverId = :driverId', { driverId: payment.driverId })
        .execute();
    }

    await this.staffRepo.remove(payment);
    return { success: true };
  }

  async updateStaffPayment(
    id: number,
    body: { amount?: number; note?: string; date?: Date; reference?: string },
  ) {
    const payment = await this.staffRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment record not found');

    if (body.amount !== undefined) payment.amount = parseFloat(body.amount as any);
    if (body.note !== undefined) payment.note = body.note;
    if (body.date !== undefined) payment.date = body.date;
    if (body.reference !== undefined) payment.reference = body.reference;

    return this.staffRepo.save(payment);
  }

  async deleteShopPayment(id: number) {
    const payment = await this.shopRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Payment record not found');

    const merchant = await this.merchantRepo.findOne({ where: { id: payment.merchantId } });
    if (merchant) {
      merchant.balance = parseFloat(merchant.balance as any) + parseFloat(payment.amount as any);
      await this.merchantRepo.save(merchant);
    }

    if (payment.orderIds && payment.orderIds.length > 0) {
      await this.orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({ merchantPaymentStatus: 'unpaid' })
        .whereInIds(payment.orderIds)
        .andWhere('merchantId = :merchantId', { merchantId: payment.merchantId })
        .execute();
    }

    await this.shopRepo.remove(payment);
    return { success: true };
  }

  async updateShopPayment(
    id: number,
    body: { amount?: number; note?: string; date?: Date; reference?: string },
  ) {
    const payment = await this.shopRepo.findOne({ where: { id } });
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

    return this.shopRepo.save(payment);
  }

  async getPublicInvoice(merchantId: number, reference: string) {
    const payment = await this.shopRepo.findOne({
      where: { merchantId, reference },
      relations: { merchant: true },
    });
    if (!payment) throw new NotFoundException('Payment settlement not found');

    let orders: any[] = [];
    if (payment.orderIds && payment.orderIds.length > 0) {
      orders = await this.orderRepo.createQueryBuilder('order')
        .whereInIds(payment.orderIds)
        .leftJoinAndSelect('order.merchant', 'merchant')
        .leftJoinAndSelect('order.driver', 'driver')
        .leftJoinAndSelect('order.histories', 'histories')
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
      orders,
      orgInfo,
    };
  }
}
