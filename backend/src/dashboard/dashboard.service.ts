import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Parcel } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/users.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Parcel) private parcelRepo: Repository<Parcel>,
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

    const parcelsQuery = (status?: string | string[]) => {
      const qb = this.parcelRepo.createQueryBuilder('parcel');
      if (status) {
        if (Array.isArray(status)) {
          qb.where('parcel.status IN (:...statuses)', { statuses: status });
        } else {
          qb.where('parcel.status = :status', { status });
        }
      } else {
        qb.where('1=1');
      }
      this.applyDateFilter(qb, 'parcel', startDate, endDate);
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
      parcelsQuery(),
      parcelsQuery('pending'),
      parcelsQuery('in-warehouse'),
      parcelsQuery('assigned'),
      parcelsQuery('picked-up'),
      parcelsQuery('in-transit'),
      parcelsQuery('delivered'),
      parcelsQuery('failed'),
      parcelsQuery('returned'),
      parcelsQuery([
        'in-warehouse',
        'assigned',
        'in-transit',
        'delivered',
        'failed',
        'returned',
      ]),
    ]);

    const revenueQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where("parcel.status = 'delivered'");
    this.applyDateFilter(revenueQuery, 'parcel', startDate, endDate);
    const revenueResult = await revenueQuery.getRawOne();

    const codQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where("parcel.status = 'delivered'")
      .groupBy('parcel.codCurrency');
    this.applyDateFilter(codQuery, 'parcel', startDate, endDate);
    const codResults = await codQuery.getRawMany();

    const feeQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where('1=1');
    this.applyDateFilter(feeQuery, 'parcel', startDate, endDate);
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
    const dailyDataQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select("TO_CHAR(parcel.created_at, 'YYYY-MM-DD')", 'day')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)",
        'delivered',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'failed' THEN 1 ELSE 0 END)",
        'failed',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'returned' THEN 1 ELSE 0 END)",
        'returned',
      )
      .groupBy("TO_CHAR(parcel.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(parcel.created_at, 'YYYY-MM-DD')", 'ASC');

    if (startDate || endDate) {
      dailyDataQuery.where('1=1');
      this.applyDateFilter(dailyDataQuery, 'parcel', startDate, endDate);
    } else {
      dailyDataQuery.where("parcel.created_at >= NOW() - INTERVAL '30 days'");
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
    const monthlyRevenueQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select("TO_CHAR(parcel.created_at, 'Mon')", 'month')
      .addSelect('SUM(parcel.deliveryFee)', 'revenue')
      .where("parcel.status = 'delivered'")
      .groupBy(
        "TO_CHAR(parcel.created_at, 'Mon'), DATE_TRUNC('month', parcel.created_at)",
      )
      .orderBy("DATE_TRUNC('month', parcel.created_at)", 'ASC');

    this.applyDateFilter(monthlyRevenueQuery, 'parcel', startDate, endDate);
    const monthlyRevenue = await monthlyRevenueQuery.getRawMany();

    // Status breakdown
    const statusBreakdownQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('1=1')
      .groupBy('parcel.status');

    this.applyDateFilter(statusBreakdownQuery, 'parcel', startDate, endDate);
    const statusBreakdown = await statusBreakdownQuery.getRawMany();

    return { dailyData, monthlyRevenue, statusBreakdown };
  }

  async getRecentParcels(startDate?: string, endDate?: string) {
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('1=1')
      .orderBy('parcel.createdAt', 'DESC')
      .take(10);

    this.applyDateFilter(qb, 'parcel', startDate, endDate);
    return qb.getMany();
  }

  async getRecentOrders(startDate?: string, endDate?: string) {
    return this.getRecentParcels(startDate, endDate);
  }

  async getTopDrivers(startDate?: string, endDate?: string) {
    if (startDate || endDate) {
      const qb = this.parcelRepo
        .createQueryBuilder('parcel')
        .select('parcel.driver_id', 'driverId')
        .addSelect('COUNT(*)', 'totalDeliveries')
        .where("parcel.status = 'delivered'")
        .andWhere('parcel.driver_id IS NOT NULL')
        .groupBy('parcel.driver_id')
        .orderBy('COUNT(*)', 'DESC')
        .limit(5);

      this.applyDateFilter(qb, 'parcel', startDate, endDate);
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

    const drivers = await this.driverRepo.find({
      where: { isDriver: true, isActive: true },
      relations: { zone: true, roleRelation: true },
      take: 5,
    });

    const driversWithStats = await Promise.all(
      drivers.map(async (d) => {
        const count = await this.parcelRepo.count({
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
