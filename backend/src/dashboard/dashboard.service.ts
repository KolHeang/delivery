import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/users.entity';
import { Customer } from '../customers/customer.entity';
import { Merchant } from '../merchants/merchant.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(User) private driverRepo: Repository<User>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Merchant) private merchantRepo: Repository<Merchant>,
  ) { }

  private applyDateFilter(
    queryBuilder: any,
    alias: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (startDate) {
      queryBuilder.andWhere(`${alias}.createdAt >= :startDate`, {
        startDate: new Date(startDate + 'T00:00:00'),
      });
    }
    if (endDate) {
      queryBuilder.andWhere(`${alias}.createdAt <= :endDate`, {
        endDate: new Date(endDate + 'T23:59:59.999'),
      });
    }
    return queryBuilder;
  }

  async getStats(startDate?: string, endDate?: string) {
    const [totalDrivers, totalStaff, totalCustomers, totalMerchants] =
      await Promise.all([
        this.driverRepo.count({ where: { role: 'driver' } }),
        this.driverRepo.count({ where: { role: In(['admin', 'staff']) } }),
        this.customerRepo.count(),
        this.merchantRepo.count(),
      ]);

    const ordersQuery = (status?: string) => {
      const qb = this.orderRepo.createQueryBuilder('order');
      if (status) {
        qb.where('order.status = :status', { status });
      } else {
        qb.where('1=1');
      }
      this.applyDateFilter(qb, 'order', startDate, endDate);
      return qb.getCount();
    };

    const [
      totalOrders,
      pending,
      assigned,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned,
    ] = await Promise.all([
      ordersQuery(),
      ordersQuery('pending'),
      Promise.resolve(0),
      ordersQuery('picked-up'),
      ordersQuery('in-transit'),
      ordersQuery('delivered'),
      ordersQuery('failed'),
      ordersQuery('returned'),
    ]);

    const revenueQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where("order.status = 'delivered'");
    this.applyDateFilter(revenueQuery, 'order', startDate, endDate);
    const revenueResult = await revenueQuery.getRawOne();

    const codQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where("order.status = 'delivered'");
    this.applyDateFilter(codQuery, 'order', startDate, endDate);
    const codResult = await codQuery.getRawOne();

    const feeQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('1=1');
    this.applyDateFilter(feeQuery, 'order', startDate, endDate);
    const feeResult = await feeQuery.getRawOne();

    const availableDrivers = await this.driverRepo.count({
      where: { status: 'available' },
    });

    const collectedCashUSD = parseFloat(codResult?.total || '0');

    return {
      totalOrders,
      totalDrivers,
      totalStaff,
      totalCustomers,
      totalMerchants,
      pending,
      assigned,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned,
      revenue: parseFloat(revenueResult?.total || '0'),
      totalDeliveryFee: parseFloat(feeResult?.total || '0'),
      collectedCashUSD,
      collectedCashKHR: collectedCashUSD * 4100,
      availableDrivers,
    };
  }

  async getChartData(startDate?: string, endDate?: string) {
    // Daily deliveries
    const dailyDataQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'day')
      .addSelect(
        "SUM(CASE WHEN order.status = 'delivered' THEN 1 ELSE 0 END)",
        'delivered',
      )
      .addSelect(
        "SUM(CASE WHEN order.status = 'failed' THEN 1 ELSE 0 END)",
        'failed',
      )
      .addSelect(
        "SUM(CASE WHEN order.status = 'returned' THEN 1 ELSE 0 END)",
        'returned',
      )
      .groupBy('DATE(order.createdAt)')
      .orderBy('DATE(order.createdAt)', 'ASC');

    if (startDate || endDate) {
      dailyDataQuery.where('1=1');
      this.applyDateFilter(dailyDataQuery, 'order', startDate, endDate);
    } else {
      dailyDataQuery.where("order.createdAt >= NOW() - INTERVAL '30 days'");
    }
    const dailyData = await dailyDataQuery.getRawMany();

    // Monthly revenue
    const monthlyRevenueQuery = this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.createdAt, 'Mon')", 'month')
      .addSelect('SUM(order.deliveryFee)', 'revenue')
      .where("order.status = 'delivered'")
      .groupBy(
        "TO_CHAR(order.createdAt, 'Mon'), DATE_TRUNC('month', order.createdAt)",
      )
      .orderBy("DATE_TRUNC('month', order.createdAt)", 'ASC');

    this.applyDateFilter(monthlyRevenueQuery, 'order', startDate, endDate);
    const monthlyRevenue = await monthlyRevenueQuery.getRawMany();

    // Status breakdown
    const statusBreakdownQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('1=1')
      .groupBy('order.status');

    this.applyDateFilter(statusBreakdownQuery, 'order', startDate, endDate);
    const statusBreakdown = await statusBreakdownQuery.getRawMany();

    return { dailyData, monthlyRevenue, statusBreakdown };
  }

  async getRecentOrders(startDate?: string, endDate?: string) {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.merchant', 'merchant')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.driver', 'driver')
      .leftJoinAndSelect('order.zone', 'zone')
      .where('1=1')
      .orderBy('order.createdAt', 'DESC')
      .take(10);

    this.applyDateFilter(qb, 'order', startDate, endDate);
    return qb.getMany();
  }

  async getTopDrivers(startDate?: string, endDate?: string) {
    if (startDate || endDate) {
      // Find top drivers based on orders delivered in the selected range
      const qb = this.orderRepo
        .createQueryBuilder('order')
        .select('order.driverId', 'driverId')
        .addSelect('COUNT(*)', 'totalDeliveries')
        .where("order.status = 'delivered'")
        .andWhere('order.driverId IS NOT NULL')
        .groupBy('order.driverId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(5);

      this.applyDateFilter(qb, 'order', startDate, endDate);
      const rawDrivers = await qb.getRawMany();

      if (rawDrivers.length === 0) {
        return [];
      }

      // Load driver entities for these IDs
      const driverIds = rawDrivers.map((rd) => rd.driverId);
      const drivers = await this.driverRepo
        .createQueryBuilder('driver')
        .leftJoinAndSelect('driver.zone', 'zone')
        .where('driver.id IN (:...driverIds)', { driverIds })
        .andWhere('driver.role = :role', { role: 'driver' })
        .getMany();

      // Return mapped results ordered by deliveries count
      return rawDrivers.map((rd) => {
        const driver = drivers.find((d) => d.id === rd.driverId);
        return {
          id: rd.driverId,
          name: driver?.name || 'Driver',
          nameKh: driver?.nameKh,
          zone: driver?.zone,
          totalDeliveries: parseInt(rd.totalDeliveries),
        };
      });
    }

    return this.driverRepo.find({
      where: { role: 'driver' },
      relations: { zone: true },
      order: { totalDeliveries: 'DESC' },
      take: 5,
    });
  }
}
