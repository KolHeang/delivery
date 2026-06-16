import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../../users/staff.entity';
import { Order } from '../../orders/order.entity';
import { UpdateOrderStatusDto } from '../../orders/dto/order.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async getProfile(driverId: number) {
    const driver = await this.staffRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    const { password, ...safeDriver } = driver as any;
    return safeDriver;
  }

  async getTasks(driverId: number, status?: string) {
    const where: any = { driverId };
    if (status) {
      where.status = status;
    }
    return this.orderRepo.find({
      where,
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
      where: { id: orderId, driverId },
    });
    if (!order)
      throw new NotFoundException('Order not found or not assigned to you');

    const updates: Partial<Order> = { status: dto.status as any };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();

    await this.orderRepo.update(orderId, updates);
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
    const driver = await this.staffRepo.findOne({ where: { id: driverId } });
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
        assignedParcels: stats['assigned'] || 0,
        totalPackage: totalPackage,
        totalSuccessful: stats['delivered'] || 0,
        totalProblem: stats['problem'] || 0,
        totalReturn: (stats['returned'] || 0) + (stats['rejected'] || 0),
      },
    };
  }
}
