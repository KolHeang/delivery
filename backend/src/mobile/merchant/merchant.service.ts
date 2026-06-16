import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../../merchants/merchant.entity';
import { Order } from '../../orders/order.entity';
import { CreateOrderDto } from '../../orders/dto/order.dto';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async getProfile(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: { zone: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    const { password, ...safeMerchant } = merchant as any;
    return safeMerchant;
  }

  async getOrders(merchantId: number, status?: string) {
    const where: any = { merchantId };
    if (status) {
      where.status = status;
    }
    return this.orderRepo.find({
      where,
      relations: { customer: true, driver: true, zone: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createOrder(merchantId: number, dto: CreateOrderDto) {
    const order = this.orderRepo.create({
      ...dto,
      merchantId, // Force the merchant ID to the logged-in merchant
      status: 'pending', // Always start as pending
    } as any);
    return this.orderRepo.save(order);
  }

  async getSummary(merchantId: number) {
    const totalOrders = await this.orderRepo.count({ where: { merchantId } });

    const statusCounts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.merchantId = :merchantId', { merchantId })
      .groupBy('order.status')
      .getRawMany();

    const pendingCOD = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .addSelect('order.codCurrency', 'currency')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.merchantPaymentStatus = :payment', { payment: 'unpaid' })
      .groupBy('order.codCurrency')
      .getRawMany();

    const codPendingUSD =
      pendingCOD.find((c) => c.currency === 'USD')?.total || 0;
    const codPendingKHR =
      pendingCOD.find((c) => c.currency === 'KHR')?.total || 0;

    const feesPending = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.merchantPaymentStatus = :payment', { payment: 'unpaid' })
      .getRawOne();

    return {
      totalOrders,
      statusCounts: statusCounts.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
        {},
      ),
      codPendingUSD: parseFloat(codPendingUSD),
      codPendingKHR: parseFloat(codPendingKHR),
      feesPending: parseFloat(feesPending?.total || '0'),
    };
  }

  async getDashboard(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const totalParcel = await this.orderRepo.count({ where: { merchantId } });

    const statusCounts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.merchantId = :merchantId', { merchantId })
      .groupBy('order.status')
      .getRawMany();

    const stats = statusCounts.reduce(
      (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
      {} as Record<string, number>,
    );

    return {
      balance: {
        amount: Number(merchant.balance) || 0,
        currency: 'USD',
      },
      statistics: {
        totalParcel: totalParcel,
        totalDelivered: stats['delivered'] || 0,
        totalReturn: (stats['returned'] || 0) + (stats['rejected'] || 0),
        totalTransit:
          (stats['in-transit'] || 0) +
          (stats['pending'] || 0) +
          (stats['assigned'] || 0) +
          (stats['picked-up'] || 0),
      },
    };
  }
}
