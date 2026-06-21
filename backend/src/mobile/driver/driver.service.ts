import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../users/users.entity';
import { Order } from '../../orders/order.entity';
import { OrderHistory } from '../../orders/order-history.entity';
import { UpdateOrderStatusDto } from '../../orders/dto/order.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderHistory) private readonly historyRepo: Repository<OrderHistory>,
  ) { }

  async getProfile(driverId: number) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    const { password, ...safeDriver } = driver as any;
    return safeDriver;
  }

  async updateDriverStatus(driverId: number, status: string) {
    await this.userRepo.update(driverId, { status: status as any });
    return this.getProfile(driverId);
  }


  async getTasks(driverId: number, status?: string) {
    if (status) {
      return this.orderRepo.find({
        where: { driverId, status },
        relations: { customer: true, merchant: true, zone: true },
        order: { createdAt: 'DESC' },
      });
    }

    return this.orderRepo.find({
      where: [
        { driverId, status: In(['assigned', 'picked-up', 'in-transit', 'pending'] as any) },
        { pickupDriverId: driverId, status: 'pending' }
      ],
      relations: { customer: true, merchant: true, zone: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateOrderStatus(
    driverId: number,
    orderId: number,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderRepo.findOne({
      where: [
        { id: orderId, driverId },
        { id: orderId, pickupDriverId: driverId }
      ],
    });
    if (!order)
      throw new NotFoundException('Order not found or not assigned to you');

    const updates: Partial<Order> = { status: dto.status as any };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();

    await this.orderRepo.update(orderId, updates);

    if (dto.status !== order.status) {
      try {
        const history = this.historyRepo.create({
          orderId,
          status: dto.status,
          note: order.note || undefined,
        });
        await this.historyRepo.save(history);
      } catch (err) {
        console.error(`Failed to log history for order #${orderId} update by driver`, err);
      }
    }

    return this.orderRepo.findOne({ where: { id: orderId } });
  }

  async getSummary(driverId: number) {
    // Get today's start and end dates
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const totalAssigned = await this.orderRepo.count({ where: { driverId } });

    const statusCounts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.driverId = :driverId', { driverId })
      .groupBy('order.status')
      .getRawMany();

    const todayDelivered = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.deliveredAt >= :start AND order.deliveredAt <= :end', {
        start,
        end,
      })
      .getCount();

    const codCollected = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .addSelect('order.codCurrency', 'currency')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.driverPaymentStatus = :payment', { payment: 'unpaid' })
      .groupBy('order.codCurrency')
      .getRawMany();

    const codPendingUSD =
      codCollected.find((c) => c.currency === 'USD')?.total || 0;
    const codPendingKHR =
      codCollected.find((c) => c.currency === 'KHR')?.total || 0;

    return {
      totalAssigned,
      statusCounts: statusCounts.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
        {},
      ),
      todayDelivered,
      codPendingUSD: parseFloat(codPendingUSD),
      codPendingKHR: parseFloat(codPendingKHR),
    };
  }

  async getDashboard(driverId: number) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const totalPackage = await this.orderRepo.count({ where: { driverId } });

    const statusCounts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.driverId = :driverId', { driverId })
      .groupBy('order.status')
      .getRawMany();

    const stats = statusCounts.reduce(
      (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
      {} as Record<string, number>,
    );

    const codCollected = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .addSelect('order.codCurrency', 'currency')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.driverPaymentStatus = :payment', { payment: 'unpaid' })
      .groupBy('order.codCurrency')
      .getRawMany();

    const codPendingUSD = parseFloat(
      codCollected.find((c) => c.currency === 'USD')?.total || 0,
    );
    const codPendingKHR = parseFloat(
      codCollected.find((c) => c.currency === 'KHR')?.total || 0,
    );

    return {
      wallets: [
        { currency: 'KHR', balance: codPendingKHR },
        { currency: 'USD', balance: codPendingUSD },
      ],
      statistics: {
        pickupRequest: stats['pending'] || 0,
        assignedParcels: (stats['assigned'] || 0) + (stats['picked-up'] || 0) + (stats['in-transit'] || 0),
        totalPackage: totalPackage,
        totalSuccessful: stats['delivered'] || 0,
        totalProblem: stats['problem'] || 0,
        totalReturn: (stats['returned'] || 0) + (stats['rejected'] || 0),
      },
    };
  }
}
