import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/users.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

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
        this.driverRepo.count({
          where: { isDriver: true },
        }),
        this.driverRepo.count({
          where: { isStaff: true },
        }),
        this.customerRepo.count(),
        this.merchantRepo.count(),
      ]);

    const ordersQuery = (status?: string | string[]) => {
      const qb = this.orderRepo.createQueryBuilder('order');
      if (status) {
        if (Array.isArray(status)) {
          qb.where('order.status IN (:...statuses)', { statuses: status });
        } else {
          qb.where('order.status = :status', { status });
        }
      } else {
        qb.where('1=1');
      }
      this.applyDateFilter(qb, 'order', startDate, endDate);
      return qb.getCount();
    };

    const [
      totalOrders,
      pending,
      inWarehouse,
      assigned,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned,
      broughtToWarehouse,
    ] = await Promise.all([
      ordersQuery(),
      ordersQuery('pending'),
      ordersQuery('in-warehouse'),
      ordersQuery('assigned'),
      ordersQuery('picked-up'),
      ordersQuery('in-transit'),
      ordersQuery('delivered'),
      ordersQuery('failed'),
      ordersQuery('returned'),
      ordersQuery([
        'in-warehouse',
        'assigned',
        'in-transit',
        'delivered',
        'failed',
        'returned',
      ]),
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
      .addSelect('order.codCurrency', 'currency')
      .where("order.status = 'delivered'")
      .groupBy('order.codCurrency');
    this.applyDateFilter(codQuery, 'order', startDate, endDate);
    const codResults = await codQuery.getRawMany();

    const feeQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('1=1');
    this.applyDateFilter(feeQuery, 'order', startDate, endDate);
    const feeResult = await feeQuery.getRawOne();

    const availableDrivers = await this.driverRepo.count({
      where: { isDriver: true, isActive: true },
    });

    const collectedCashUSD = parseFloat(
      codResults.find((c) => c.currency === 'USD')?.total || '0',
    );
    const collectedCashKHR = parseFloat(
      codResults.find((c) => c.currency === 'KHR')?.total || '0',
    );

    return {
      totalOrders,
      totalDrivers,
      totalStaff,
      totalCustomers,
      totalMerchants,
      pending,
      inWarehouse,
      assigned,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned,
      broughtToWarehouse,
      revenue: parseFloat(revenueResult?.total || '0'),
      totalDeliveryFee: parseFloat(feeResult?.total || '0'),
      collectedCashUSD,
      collectedCashKHR,
      availableDrivers,
    };
  }

  async getChartData(startDate?: string, endDate?: string) {
    // Determine date range (default last 14 days if not provided)
    let startD = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    let endD = endDate ? new Date(endDate) : new Date();

    if (startD > endD) {
      const temp = startD;
      startD = endD;
      endD = temp;
    }

    // Daily deliveries
    const dailyDataQuery = this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'total')
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
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'ASC');

    if (startDate || endDate) {
      dailyDataQuery.where('1=1');
      this.applyDateFilter(dailyDataQuery, 'order', startDate, endDate);
    } else {
      dailyDataQuery.where("order.created_at >= NOW() - INTERVAL '30 days'");
    }
    const rawDailyData = await dailyDataQuery.getRawMany();

    const dataMap = new Map<string, any>();
    for (const r of rawDailyData) {
      dataMap.set(r.day, {
        day: r.day,
        total: parseInt(r.total || '0', 10),
        delivered: parseInt(r.delivered || '0', 10),
        failed: parseInt(r.failed || '0', 10),
        returned: parseInt(r.returned || '0', 10),
      });
    }

    const dailyData: any[] = [];
    const curr = new Date(startD);
    curr.setHours(0, 0, 0, 0);
    const endLimit = new Date(endD);
    endLimit.setHours(23, 59, 59, 999);

    let maxSteps = 0;
    while (curr <= endLimit && maxSteps < 60) {
      const dayKey = curr.toISOString().split('T')[0];
      if (dataMap.has(dayKey)) {
        dailyData.push(dataMap.get(dayKey));
      } else {
        dailyData.push({
          day: dayKey,
          total: 0,
          delivered: 0,
          failed: 0,
          returned: 0,
        });
      }
      curr.setDate(curr.getDate() + 1);
      maxSteps++;
    }

    if (dailyData.length === 0) {
      const todayKey = new Date().toISOString().split('T')[0];
      dailyData.push({
        day: todayKey,
        total: 0,
        delivered: 0,
        failed: 0,
        returned: 0,
      });
    }

    // Monthly revenue
    const monthlyRevenueQuery = this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.created_at, 'Mon')", 'month')
      .addSelect('SUM(order.deliveryFee)', 'revenue')
      .where("order.status = 'delivered'")
      .groupBy(
        "TO_CHAR(order.created_at, 'Mon'), DATE_TRUNC('month', order.created_at)",
      )
      .orderBy("DATE_TRUNC('month', order.created_at)", 'ASC');

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
        .select('order.driver_id', 'driverId')
        .addSelect('COUNT(*)', 'totalDeliveries')
        .where("order.status = 'delivered'")
        .andWhere('order.driver_id IS NOT NULL')
        .groupBy('order.driver_id')
        .orderBy('COUNT(*)', 'DESC')
        .limit(5);

      this.applyDateFilter(qb, 'order', startDate, endDate);
      const rawDrivers = await qb.getRawMany();

      if (rawDrivers.length > 0) {
        const driverIds = rawDrivers.map((rd) => rd.driverId).filter(Boolean);
        const drivers = await this.driverRepo
          .createQueryBuilder('driver')
          .leftJoinAndSelect('driver.zone', 'zone')
          .leftJoinAndSelect('driver.roleRelation', 'roleRelation')
          .where('driver.id IN (:...driverIds)', { driverIds })
          .getMany();

        return rawDrivers.map((rd) => {
          const driver = drivers.find((d) => d.id === rd.driverId);
          return {
            id: rd.driverId,
            name: driver?.name || 'Driver',
            nameKh: driver?.nameKh,
            zone: driver?.zone,
            totalDeliveries: parseInt(rd.totalDeliveries || '0', 10),
          };
        });
      }
    }

    // Default: load drivers and their real delivered count from orders
    const drivers = await this.driverRepo.find({
      where: { isDriver: true, isActive: true },
      relations: { zone: true, roleRelation: true },
      take: 5,
    });

    const driversWithStats = await Promise.all(
      drivers.map(async (d) => {
        const count = await this.orderRepo.count({
          where: { driverId: d.id, status: 'delivered' },
        });
        return {
          id: d.id,
          name: d.name,
          nameKh: d.nameKh,
          zone: d.zone,
          totalDeliveries: count || d.totalDeliveries || 0,
        };
      }),
    );

    return driversWithStats.sort(
      (a, b) => b.totalDeliveries - a.totalDeliveries,
    );
  }
}
