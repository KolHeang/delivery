import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Merchant } from '../../merchants/merchant.entity';
import { Order } from '../../orders/order.entity';
import { CreateOrderDto } from '../../orders/dto/order.dto';
import { PickupRequest } from '../../orders/pickup-request.entity';
import { CreatePickupRequestDto } from '../../orders/dto/pickup-request.dto';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(PickupRequest)
    private readonly pickupRequestRepo: Repository<PickupRequest>,
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

  async generateNextTrackingCode(): Promise<string> {
    try {
      const result = await this.orderRepo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      return `T${String(nextval).padStart(6, '0')}`;
    } catch (err) {
      await this.orderRepo.query("CREATE SEQUENCE IF NOT EXISTS tracking_code_seq START WITH 1");
      const lastOrders = await this.orderRepo.find({
        where: {
          trackingCode: Like('T%'),
        },
        order: { id: 'DESC' },
        take: 100,
      });

      let maxNumber = 0;
      for (const order of lastOrders) {
        if (order.trackingCode) {
          const match = order.trackingCode.match(/^T(\d{6})$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      if (maxNumber > 0) {
        await this.orderRepo.query(`SELECT setval('tracking_code_seq', ${maxNumber})`);
      }

      const result = await this.orderRepo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      return `T${String(nextval).padStart(6, '0')}`;
    }
  }


  async createOrder(merchantId: number, dto: CreateOrderDto) {
    if (!dto.trackingCode) {
      dto.trackingCode = await this.generateNextTrackingCode();
    }
    // Apply defaults for optional numeric/enum fields
    if (dto.weight === undefined || dto.weight === null) dto.weight = 0;
    if (!dto.size) dto.size = 'small';
    if (dto.cod === undefined || dto.cod === null) dto.cod = 0;
    if (dto.deliveryFee === undefined || dto.deliveryFee === null) dto.deliveryFee = 0;
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

    const [pickupPendingCount, pickupPickedUpCount] = await Promise.all([
      this.pickupRequestRepo.count({ where: { merchantId, status: 'pending' } }),
      this.pickupRequestRepo.count({ where: { merchantId, status: 'picked-up' } }),
    ]);

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
        pendingPickup: stats['pending'] || 0,
        pickedUpWaiting: stats['picked-up'] || 0,
        receivedAtWarehouse:
          totalParcel - (stats['pending'] || 0) - (stats['picked-up'] || 0),
        inTransit: (stats['assigned'] || 0) + (stats['in-transit'] || 0),
        totalDelivered: stats['delivered'] || 0,
        totalProblem: stats['failed'] || stats['problem'] || 0,
        totalReturn: (stats['returned'] || 0) + (stats['rejected'] || 0),
        pickupRequestsPending: pickupPendingCount,
        pickupRequestsPickedUp: pickupPickedUpCount,
      },
    };
  }

  async createPickupRequest(merchantId: number, dto: CreatePickupRequestDto) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const pickupRequest = this.pickupRequestRepo.create({
      merchantId,
      declaredQuantity: dto.declaredQuantity,
      pickupAddress: dto.pickupAddress || merchant.address || '',
      pickupTime: new Date(dto.pickupTime),
      status: 'pending',
    });

    return this.pickupRequestRepo.save(pickupRequest);
  }

  async getPickupRequests(merchantId: number) {
    return this.pickupRequestRepo.find({
      where: { merchantId },
      relations: { pickupDriver: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getPickupRequest(merchantId: number, id: number) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id, merchantId },
      relations: { pickupDriver: true, orders: true },
    });
    if (!request) throw new NotFoundException(`Pickup request #${id} not found`);
    return request;
  }
}
