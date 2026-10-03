import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  private parseFlexibleDate(dateStr?: string | Date | null): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const str = String(dateStr).trim();
    const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  private applyDateFilter(
    queryBuilder: any,
    alias: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = this.parseFlexibleDate(startDate);
    const end = this.parseFlexibleDate(endDate);
    if (start) {
      start.setHours(0, 0, 0, 0);
      queryBuilder.andWhere(`${alias}.createdAt >= :startDate`, {
        startDate: start,
      });
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere(`${alias}.createdAt <= :endDate`, {
        endDate: end,
      });
    }
    return queryBuilder;
  }

  private applyTenantFilter(
    queryBuilder: any,
    alias: string,
    tenantId?: number,
  ) {
    if (tenantId) {
      queryBuilder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId });
    }
    return queryBuilder;
  }

  async getStats(startDate?: string, endDate?: string, tenantId?: number) {
    const tenantFilter = tenantId ? { tenantId } : {};

    const [totalDrivers, totalStaff, totalCustomers, totalMerchants] =
      await Promise.all([
        this.driverRepo.count({
          where: { ...tenantFilter, isDriver: true },
        }),
        this.driverRepo.count({
          where: { ...tenantFilter, isStaff: true },
        }),
        this.customerRepo.count({
          where: tenantFilter,
        }),
        this.merchantRepo.count({
          where: tenantFilter,
        }),
      ]);

    const statusCountsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('1=1')
      .groupBy('parcel.status');
    this.applyTenantFilter(statusCountsQb, 'parcel', tenantId);
    this.applyDateFilter(statusCountsQb, 'parcel', startDate, endDate);
    const rawStatusCounts = await statusCountsQb.getRawMany();

    const statusMap: Record<string, number> = {};
    let totalOrders = 0;
    rawStatusCounts.forEach((r) => {
      const c = parseInt(r.count, 10) || 0;
      statusMap[r.status] = c;
      totalOrders += c;
    });

    const pending = statusMap['pending'] || 0;
    const inWarehouse = statusMap['in-warehouse'] || 0;
    const assigned = statusMap['assigned'] || 0;
    const pickedUp = statusMap['picked-up'] || 0;
    const inTransit = statusMap['in-transit'] || 0;
    const delivered = statusMap['delivered'] || 0;
    const failed = statusMap['failed'] || 0;
    const returned = statusMap['returned'] || 0;
    const broughtToWarehouse =
      inWarehouse + assigned + inTransit + delivered + failed + returned;

    const revenueQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where("parcel.status = 'delivered'");
    this.applyTenantFilter(revenueQuery, 'parcel', tenantId);
    this.applyDateFilter(revenueQuery, 'parcel', startDate, endDate);
    const revenueResult = await revenueQuery.getRawOne();

    const codQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where("parcel.status = 'delivered'")
      .groupBy('parcel.codCurrency');
    this.applyTenantFilter(codQuery, 'parcel', tenantId);
    this.applyDateFilter(codQuery, 'parcel', startDate, endDate);
    const codResults = await codQuery.getRawMany();

    const feeQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where("parcel.status = 'delivered'");
    this.applyTenantFilter(feeQuery, 'parcel', tenantId);
    this.applyDateFilter(feeQuery, 'parcel', startDate, endDate);
    const feeResult = await feeQuery.getRawOne();

    const availableDrivers = await this.driverRepo.count({
      where: { ...tenantFilter, isDriver: true, isActive: true },
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

  async getChartData(startDate?: string, endDate?: string, tenantId?: number) {
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

    dailyDataQuery.where('1=1');
    this.applyTenantFilter(dailyDataQuery, 'parcel', tenantId);

    if (startDate || endDate) {
      this.applyDateFilter(dailyDataQuery, 'parcel', startDate, endDate);
    } else {
      dailyDataQuery.andWhere("parcel.created_at >= NOW() - INTERVAL '30 days'");
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

    this.applyTenantFilter(monthlyRevenueQuery, 'parcel', tenantId);
    this.applyDateFilter(monthlyRevenueQuery, 'parcel', startDate, endDate);
    const monthlyRevenue = await monthlyRevenueQuery.getRawMany();

    // Status breakdown
    const statusBreakdownQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('1=1')
      .groupBy('parcel.status');

    this.applyTenantFilter(statusBreakdownQuery, 'parcel', tenantId);
    this.applyDateFilter(statusBreakdownQuery, 'parcel', startDate, endDate);
    const statusBreakdown = await statusBreakdownQuery.getRawMany();

    return { dailyData, monthlyRevenue, statusBreakdown };
  }

  async getRecentParcels(
    startDate?: string,
    endDate?: string,
    tenantId?: number,
  ) {
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('1=1')
      .orderBy('parcel.createdAt', 'DESC')
      .take(10);

    this.applyTenantFilter(qb, 'parcel', tenantId);
    this.applyDateFilter(qb, 'parcel', startDate, endDate);
    return qb.getMany();
  }

  async getRecentOrders(
    startDate?: string,
    endDate?: string,
    tenantId?: number,
  ) {
    return this.getRecentParcels(startDate, endDate, tenantId);
  }

  async getTopDrivers(
    startDate?: string,
    endDate?: string,
    tenantId?: number,
  ) {
    const tenantFilter = tenantId ? { tenantId } : {};

    if (startDate || endDate) {
      const qb = this.parcelRepo
        .createQueryBuilder('parcel')
        .select('parcel.driverId', 'driverId')
        .addSelect('COUNT(*)', 'totalDeliveries')
        .where("parcel.status = 'delivered'")
        .andWhere('parcel.driverId IS NOT NULL')
        .groupBy('parcel.driverId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(5);

      this.applyTenantFilter(qb, 'parcel', tenantId);
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
      where: { ...tenantFilter, isDriver: true, isActive: true },
      relations: { zone: true, roleRelation: true },
      take: 5,
    });

    const driversWithStats = await Promise.all(
      drivers.map(async (d) => {
        const count = await this.parcelRepo.count({
          where: { ...tenantFilter, driverId: d.id, status: 'delivered' },
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
