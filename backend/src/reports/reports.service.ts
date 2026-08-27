import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/users.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Income } from '../incomes/entities/income.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Parcel) private parcelRepo: Repository<Parcel>,
    @InjectRepository(User) private driverRepo: Repository<User>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Income) private incomeRepo: Repository<Income>,
  ) { }

  async getRevenueReport(period: 'daily' | 'monthly' = 'monthly') {
    const groupFormat =
      period === 'daily'
        ? 'DATE(parcel.createdAt)'
        : "TO_CHAR(parcel.createdAt, 'YYYY-MM')";
    const labelFormat =
      period === 'daily'
        ? 'DATE(parcel.createdAt)'
        : "TO_CHAR(parcel.createdAt, 'Mon YYYY')";

    return this.parcelRepo
      .createQueryBuilder('parcel')
      .select(labelFormat, 'label')
      .addSelect('COUNT(*)', 'totalParcels')
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)",
        'delivered',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'failed' THEN 1 ELSE 0 END)",
        'failed',
      )
      .addSelect('SUM(parcel.deliveryFee)', 'revenue')
      .addSelect('SUM(parcel.cod)', 'totalCod')
      .where("parcel.createdAt >= NOW() - INTERVAL '6 months'")
      .groupBy(`${groupFormat}, ${labelFormat}`)
      .orderBy(groupFormat, 'ASC')
      .getRawMany();
  }

  async getDriverPerformance() {
    return this.driverRepo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .where('driver.isDriver = true')
      .orderBy('driver.totalDeliveries', 'DESC')
      .getMany();
  }

  async getParcelSummary() {
    const statusCounts = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(parcel.deliveryFee)', 'revenue')
      .groupBy('parcel.status')
      .getRawMany();

    const zoneRevenue = await this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.zone', 'zone')
      .select('zone.name', 'zone')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)",
        'delivered',
      )
      .addSelect('SUM(parcel.deliveryFee)', 'revenue')
      .where('zone.id IS NOT NULL')
      .groupBy('zone.name')
      .orderBy('SUM(parcel.deliveryFee)', 'DESC')
      .getRawMany();

    return { statusCounts, zoneRevenue };
  }

  async getShopSummary(startDate?: string, endDate?: string, merchantId?: string) {
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.merchant', 'merchant')
      .select('merchant.id', 'id')
      .addSelect("COALESCE(merchant.name, 'Unknown Shop')", 'name')
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
      .addSelect('0', 'qrShopUSD')
      .addSelect('0', 'qrShopKHR')
      .addSelect('0', 'qrDriverUSD')
      .addSelect('0', 'qrDriverKHR')
      .addSelect(
        "SUM(CASE WHEN parcel.codCurrency = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.codCurrency = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .addSelect('SUM(parcel.deliveryFee)', 'fee')
      .groupBy('merchant.id')
      .addGroupBy('merchant.name');

    if (startDate) q = q.andWhere('parcel.createdAt >= :startDate', { startDate });
    if (endDate) q = q.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (merchantId) q = q.andWhere('merchant.id = :merchantId', { merchantId });

    const result = await q.getRawMany();

    return result.map((row) => ({
      id: row.id || Math.random(),
      name: row.name,
      delivered: parseInt(row.delivered || '0', 10),
      failed: parseInt(row.failed || '0', 10),
      returned: parseInt(row.returned || '0', 10),
      qrShopUSD: parseFloat(row.qrShopUSD || '0'),
      qrShopKHR: parseFloat(row.qrShopKHR || '0'),
      qrDriverUSD: parseFloat(row.qrDriverUSD || '0'),
      qrDriverKHR: parseFloat(row.qrDriverKHR || '0'),
      codUSD: parseFloat(row.codUSD || '0'),
      codKHR: parseFloat(row.codKHR || '0'),
      fee: parseFloat(row.fee || '0'),
    }));
  }

  async getPickupSummary(startDate?: string, endDate?: string, driverId?: string, merchantId?: string) {
    // pickup driver = pickupDriverId (warehouse flow) OR driverId (direct flow with picked-up status)
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.pickupDriver', 'pickupDriver')
      .leftJoin('parcel.merchant', 'merchant')
      .select('pickupDriver.id', 'id')
      .addSelect("COALESCE(pickupDriver.name, 'Unknown Driver')", 'name')
      .addSelect('COUNT(*)', 'package')
      .addSelect('COUNT(DISTINCT merchant.id)', 'shopCount')
      .addSelect('SUM(parcel.deliveryFee)', 'fee')
      .where('parcel.pickupDriverId IS NOT NULL');

    if (startDate) q = q.andWhere('parcel.warehouseAt >= :startDate', { startDate });
    if (endDate) q = q.andWhere('parcel.warehouseAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (driverId) q = q.andWhere('pickupDriver.id = :driverId', { driverId });
    if (merchantId) q = q.andWhere('merchant.id = :merchantId', { merchantId });

    q = q.groupBy('pickupDriver.id').addGroupBy('pickupDriver.name');
    const result = await q.getRawMany();

    return result.map((row) => ({
      id: row.id || Math.random(),
      name: row.name,
      package: parseInt(row.package || '0', 10),
      shopCount: parseInt(row.shopCount || '0', 10),
      fee: parseFloat(row.fee || '0'),
    }));
  }

  async getDeliverySummary(startDate?: string, endDate?: string, driverId?: string) {
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.driver', 'driver')
      .select('driver.id', 'id')
      .addSelect("COALESCE(driver.name, 'Unknown Driver')", 'name')
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
      .addSelect(
        "SUM(CASE WHEN parcel.codCurrency = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.codCurrency = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .addSelect('SUM(parcel.deliveryFee)', 'fee')
      .where('parcel.driverId IS NOT NULL');

    if (startDate) q = q.andWhere('parcel.createdAt >= :startDate', { startDate });
    if (endDate) q = q.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (driverId) q = q.andWhere('driver.id = :driverId', { driverId });

    q = q.groupBy('driver.id').addGroupBy('driver.name');
    const result = await q.getRawMany();

    return result.map((row) => ({
      id: row.id || Math.random(),
      name: row.name,
      delivered: parseInt(row.delivered || '0', 10),
      failed: parseInt(row.failed || '0', 10),
      returned: parseInt(row.returned || '0', 10),
      codUSD: parseFloat(row.codUSD || '0'),
      codKHR: parseFloat(row.codKHR || '0'),
      fee: parseFloat(row.fee || '0'),
    }));
  }

  async getDailyDeliveryReport(
    startDate?: string,
    endDate?: string,
    driverId?: string,
    merchantId?: string,
  ) {
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .orderBy('parcel.createdAt', 'DESC');

    if (startDate) q = q.andWhere('parcel.createdAt >= :startDate', { startDate });
    if (endDate) q = q.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (driverId) q = q.andWhere('driver.id = :driverId', { driverId });
    if (merchantId) q = q.andWhere('merchant.id = :merchantId', { merchantId });

    const orders = await q.getMany();

    return orders.map((o) => {
      const formatLocal = (d?: Date) => {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '—';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      return {
        id: o.id,
        trackingCode: o.trackingCode,
        driver: o.driver?.name || '—',
        shopName: o.merchant?.name || '—',
        receiverPhone: o.receiverPhone,
        location: o.zone?.name || o.receiverAddress || '—',
        date: formatLocal(o.createdAt),
        status: o.status,
        currency: o.codCurrency || 'USD',
        codAmount: parseFloat(o.cod as any || '0'),
        deliveryFee: parseFloat(o.deliveryFee as any || '0'),
        paidAmount: parseFloat(o.cod as any || '0'),
        note: o.note || '',
        deliveredAt: formatLocal(o.deliveredAt),
      };
    });
  }

  async getFinancialReport(startDate?: string, endDate?: string) {
    // 1. Group Incomes by month
    const incomeQuery = this.incomeRepo
      .createQueryBuilder('income')
      .select("TO_CHAR(income.date, 'YYYY-MM')", 'monthKey')
      .addSelect("TO_CHAR(income.date, 'Mon YYYY')", 'monthLabel')
      .addSelect('SUM(income.amount)', 'total')
      .groupBy(
        "TO_CHAR(income.date, 'YYYY-MM'), TO_CHAR(income.date, 'Mon YYYY')",
      )
      .orderBy("TO_CHAR(income.date, 'YYYY-MM')", 'ASC');

    // 2. Group Expenses by month
    const expenseQuery = this.expenseRepo
      .createQueryBuilder('expense')
      .select("TO_CHAR(expense.date, 'YYYY-MM')", 'monthKey')
      .addSelect("TO_CHAR(expense.date, 'Mon YYYY')", 'monthLabel')
      .addSelect('SUM(expense.amount)', 'total')
      .groupBy(
        "TO_CHAR(expense.date, 'YYYY-MM'), TO_CHAR(expense.date, 'Mon YYYY')",
      )
      .orderBy("TO_CHAR(expense.date, 'YYYY-MM')", 'ASC');

    // 3. Breakdown Incomes by category
    const incomeCatQuery = this.incomeRepo
      .createQueryBuilder('income')
      .leftJoin('income.type', 'type')
      .select("COALESCE(type.name, 'Other')", 'category')
      .addSelect('SUM(income.amount)', 'total')
      .groupBy('type.name');

    // 4. Breakdown Expenses by category
    const expenseCatQuery = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoin('expense.type', 'type')
      .select("COALESCE(type.name, 'Other')", 'category')
      .addSelect('SUM(expense.amount)', 'total')
      .groupBy('type.name');

    // 5. Detailed Incomes for transaction log
    const detailedIncomeQuery = this.incomeRepo
      .createQueryBuilder('income')
      .leftJoinAndSelect('income.type', 'type');

    // 6. Detailed Expenses for transaction log
    const detailedExpenseQuery = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.type', 'type');

    if (startDate) {
      incomeQuery.andWhere('income.date >= :startDate', { startDate });
      expenseQuery.andWhere('expense.date >= :startDate', { startDate });
      incomeCatQuery.andWhere('income.date >= :startDate', { startDate });
      expenseCatQuery.andWhere('expense.date >= :startDate', { startDate });
      detailedIncomeQuery.andWhere('income.date >= :startDate', { startDate });
      detailedExpenseQuery.andWhere('expense.date >= :startDate', {
        startDate,
      });
    }
    if (endDate) {
      incomeQuery.andWhere('income.date <= :endDate', { endDate });
      expenseQuery.andWhere('expense.date <= :endDate', { endDate });
      incomeCatQuery.andWhere('income.date <= :endDate', { endDate });
      expenseCatQuery.andWhere('expense.date <= :endDate', { endDate });
      detailedIncomeQuery.andWhere('income.date <= :endDate', { endDate });
      detailedExpenseQuery.andWhere('expense.date <= :endDate', { endDate });
    }

    const rawIncomes = await incomeQuery.getRawMany();
    const rawExpenses = await expenseQuery.getRawMany();
    const incomeByCategory = await incomeCatQuery.getRawMany();
    const expenseByCategory = await expenseCatQuery.getRawMany();
    const detailedIncomes = await detailedIncomeQuery
      .orderBy('income.date', 'DESC')
      .getMany();
    const detailedExpenses = await detailedExpenseQuery
      .orderBy('expense.date', 'DESC')
      .getMany();

    // Merge monthly income and expense
    const monthlyMap = new Map<
      string,
      { label: string; income: number; expense: number }
    >();

    rawIncomes.forEach((i) => {
      monthlyMap.set(i.monthKey, {
        label: i.monthLabel,
        income: parseFloat(i.total || '0'),
        expense: 0,
      });
    });

    rawExpenses.forEach((e) => {
      const existing = monthlyMap.get(e.monthKey);
      if (existing) {
        existing.expense = parseFloat(e.total || '0');
      } else {
        monthlyMap.set(e.monthKey, {
          label: e.monthLabel,
          income: 0,
          expense: parseFloat(e.total || '0'),
        });
      }
    });

    const monthlySummary = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, val]) => ({
        month: val.label,
        income: val.income,
        expense: val.expense,
        profit: val.income - val.expense,
      }));

    const totalIncome = rawIncomes.reduce(
      (sum, item) => sum + parseFloat(item.total || '0'),
      0,
    );
    const totalExpense = rawExpenses.reduce(
      (sum, item) => sum + parseFloat(item.total || '0'),
      0,
    );

    const transactions = [
      ...detailedIncomes.map((i) => ({
        id: `income-${i.id}`,
        dbId: i.id,
        type: 'income',
        description: i.description,
        amount: parseFloat(i.amount as any),
        date: i.date,
        category: i.type?.name || 'Other',
      })),
      ...detailedExpenses.map((e) => ({
        id: `expense-${e.id}`,
        dbId: e.id,
        type: 'expense',
        description: e.description,
        amount: parseFloat(e.amount as any),
        date: e.date,
        category: e.type?.name || 'Other',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      monthlySummary,
      incomeByCategory: incomeByCategory.map((item) => ({
        category: item.category,
        total: parseFloat(item.total || '0'),
      })),
      expenseByCategory: expenseByCategory.map((item) => ({
        category: item.category,
        total: parseFloat(item.total || '0'),
      })),
      transactions,
    };
  }
}
