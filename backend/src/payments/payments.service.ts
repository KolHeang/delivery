import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffPayment } from './staff-payment.entity';
import { ShopPayment } from './shop-payment.entity';
import { Staff } from '../users/staff.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(StaffPayment) private staffRepo: Repository<StaffPayment>,
    @InjectRepository(ShopPayment) private shopRepo: Repository<ShopPayment>,
    @InjectRepository(Staff) private driverRepo: Repository<Staff>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
  ) {}

  // Staff Payments
  async createStaffPayment(driverId: number, amount: number, date: Date, reference?: string, note?: string, orderIds?: number[]) {
    const driver = await this.driverRepo.findOne({ where: { id: driverId, role: 'driver' } });
    if (!driver) throw new NotFoundException('Driver not found');

    const payment = this.staffRepo.create({ driverId, amount, date, reference, note });
    const saved = await this.staffRepo.save(payment);

    if (orderIds && orderIds.length > 0) {
      await this.orderRepo.createQueryBuilder()
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
  async createShopPayment(merchantId: number, amount: number, date: Date, reference?: string, note?: string, orderIds?: number[]) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const payment = this.shopRepo.create({ merchantId, amount, date, reference, note });
    const saved = await this.shopRepo.save(payment);

    // Update merchant balance (deduct payout amount)
    merchant.balance = parseFloat(merchant.balance as any) - amount;
    await this.merchantRepo.save(merchant);

    if (orderIds && orderIds.length > 0) {
      await this.orderRepo.createQueryBuilder()
        .update(Order)
        .set({ merchantPaymentStatus: 'paid' })
        .whereInIds(orderIds)
        .andWhere('merchantId = :merchantId', { merchantId })
        .execute();
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
    const driver = await this.driverRepo.findOne({ where: { id: driverId, role: 'driver' } });
    if (!driver) throw new NotFoundException('Driver not found');

    // Total COD USD collected from delivered orders
    const codUsdResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR collected from delivered orders
    const codKhrResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'KHR'")
      .getRawOne();

    // Total completed delivery fees
    const deliveryFeeResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .getRawOne();

    // Total payments settled to staff
    const settledResult = await this.staffRepo.createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.driverId = :driverId', { driverId })
      .getRawOne();

    return {
      driverId,
      salary: parseFloat(driver.salary as any || '0'),
      totalCodUSD: parseFloat(codUsdResult?.total || '0'),
      totalCodKHR: parseFloat(codKhrResult?.total || '0'),
      totalDeliveryFee: parseFloat(deliveryFeeResult?.total || '0'),
      totalSettled: parseFloat(settledResult?.total || '0'),
    };
  }

  async getMerchantPaymentStats(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    // Total COD USD collected for them from delivered orders
    const codUsdResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR collected for them from delivered orders
    const codKhrResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere("order.status = 'delivered'")
      .andWhere("order.codCurrency = 'KHR'")
      .getRawOne();

    // Total completed delivery fees
    const deliveryFeeResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere("order.status = 'delivered'")
      .getRawOne();

    // Total payouts/settlements recorded
    const settledResult = await this.shopRepo.createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.merchantId = :merchantId', { merchantId })
      .getRawOne();

    return {
      merchantId,
      balance: parseFloat(merchant.balance as any || '0'),
      totalCodUSD: parseFloat(codUsdResult?.total || '0'),
      totalCodKHR: parseFloat(codKhrResult?.total || '0'),
      totalDeliveryFee: parseFloat(deliveryFeeResult?.total || '0'),
      totalSettled: parseFloat(settledResult?.total || '0'),
    };
  }
}
