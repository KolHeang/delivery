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
  ) {}

  private applyTenant(qb: any, alias: string, tenantId?: number) {
    if (tenantId) {
      qb.andWhere(`${alias}.tenantId = :tenantId`, { tenantId });
    }
    return qb;
  }

  async getRevenueReport(period: 'daily' | 'monthly' = 'monthly', tenantId?: number) {
    const groupFormat =
      period === 'daily'
        ? 'DATE(parcel.createdAt)'
        : "TO_CHAR(parcel.createdAt, 'YYYY-MM')";
    const labelFormat =
      period === 'daily'
        ? 'DATE(parcel.createdAt)'
        : "TO_CHAR(parcel.createdAt, 'Mon YYYY')";

    const q = this.parcelRepo
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
      .where("parcel.createdAt >= NOW() - INTERVAL '6 months'");

    this.applyTenant(q, 'parcel', tenantId);

    return q
      .groupBy(`${groupFormat}, ${labelFormat}`)
      .orderBy(groupFormat, 'ASC')
      .getRawMany();
  }

  async getDriverPerformance(tenantId?: number) {
    const q = this.driverRepo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .where('driver.isDriver = true');

    this.applyTenant(q, 'driver', tenantId);

    return q.orderBy('driver.totalDeliveries', 'DESC').getMany();
  }

  async getParcelSummary(tenantId?: number) {
    const statusCountsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(parcel.deliveryFee)', 'revenue')
      .where('1=1');

    this.applyTenant(statusCountsQb, 'parcel', tenantId);
    const statusCounts = await statusCountsQb.groupBy('parcel.status').getRawMany();

    const zoneRevenueQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.zone', 'zone')
      .select('zone.name', 'zone')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)",
        'delivered',
      )
      .addSelect('SUM(parcel.deliveryFee)', 'revenue')
      .where('zone.id IS NOT NULL');

    this.applyTenant(zoneRevenueQb, 'parcel', tenantId);
    const zoneRevenue = await zoneRevenueQb
      .groupBy('zone.name')
      .orderBy('SUM(parcel.deliveryFee)', 'DESC')
      .getRawMany();

    return { statusCounts, zoneRevenue };
  }

  async getShopSummary(
    startDate?: string,
    endDate?: string,
    merchantId?: string,
    tenantId?: number,
  ) {
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
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN parcel.deliveryFee ELSE 0 END)",
        'fee',
      )
      .where('1=1')
      .groupBy('merchant.id')
      .addGroupBy('merchant.name');

    this.applyTenant(q, 'parcel', tenantId);

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

  async getPickupSummary(
    startDate?: string,
    endDate?: string,
    driverId?: string,
    merchantId?: string,
    tenantId?: number,
  ) {
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

    this.applyTenant(q, 'parcel', tenantId);

    if (startDate) {
      q = q.andWhere(
        'COALESCE(parcel.warehouseAt, parcel.pickedUpAt, parcel.createdAt) >= :startDate',
        { startDate: `${startDate} 00:00:00` },
      );
    }
    if (endDate) {
      q = q.andWhere(
        'COALESCE(parcel.warehouseAt, parcel.pickedUpAt, parcel.createdAt) <= :endDate',
        { endDate: `${endDate} 23:59:59.999` },
      );
    }
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

  async getDeliverySummary(
    startDate?: string,
    endDate?: string,
    driverId?: string,
    tenantId?: number,
  ) {
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
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN parcel.deliveryFee ELSE 0 END)",
        'fee',
      )
      .where('parcel.driverId IS NOT NULL');

    this.applyTenant(q, 'parcel', tenantId);

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
    tenantId?: number,
  ) {
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('1=1')
      .orderBy('parcel.createdAt', 'DESC');

    this.applyTenant(q, 'parcel', tenantId);

    if (startDate) q = q.andWhere('parcel.createdAt >= :startDate', { startDate });
    if (endDate) q = q.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    if (driverId) q = q.andWhere('driver.id = :driverId', { driverId });
    if (merchantId) q = q.andWhere('merchant.id = :merchantId', { merchantId });

    const orders = await q.getMany();

    return orders.map((o) => {
      const formatLocal = (d?: Date) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
      };

      return {
        id: o.id,
        trackingCode: o.trackingCode,
        driver: o.driver?.name || '',
        shopName: o.merchant?.name || '',
        receiverPhone: o.receiverPhone,
        location: o.zone?.name || o.receiverAddress || '',
        date: formatLocal(o.createdAt),
        status: o.status,
        currency: o.codCurrency || 'USD',
        codAmount: parseFloat((o.cod as any) || '0'),
        deliveryFee: parseFloat((o.deliveryFee as any) || '0'),
        paidAmount: parseFloat((o.cod as any) || '0'),
        note: o.note || '',
        deliveredAt: formatLocal(o.deliveredAt),
      };
    });
  }

  async getFinancialReport(startDate?: string, endDate?: string, tenantId?: number) {
    // 1. Group Incomes by month
    const incomeQuery = this.incomeRepo
      .createQueryBuilder('income')
      .select("TO_CHAR(income.date, 'YYYY-MM')", 'monthKey')
      .addSelect("TO_CHAR(income.date, 'Mon YYYY')", 'monthLabel')
      .addSelect('SUM(income.amount)', 'total')
      .where('1=1');
    this.applyTenant(incomeQuery, 'income', tenantId);
    incomeQuery
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
      .where('1=1');
    this.applyTenant(expenseQuery, 'expense', tenantId);
    expenseQuery
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
      .where('1=1');
    this.applyTenant(incomeCatQuery, 'income', tenantId);
    incomeCatQuery.groupBy('type.name');

    // 4. Breakdown Expenses by category
    const expenseCatQuery = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoin('expense.type', 'type')
      .select("COALESCE(type.name, 'Other')", 'category')
      .addSelect('SUM(expense.amount)', 'total')
      .where('1=1');
    this.applyTenant(expenseCatQuery, 'expense', tenantId);
    expenseCatQuery.groupBy('type.name');

    // 5. Detailed Incomes for transaction log
    const detailedIncomeQuery = this.incomeRepo
      .createQueryBuilder('income')
      .leftJoinAndSelect('income.type', 'type')
      .where('1=1');
    this.applyTenant(detailedIncomeQuery, 'income', tenantId);

    // 6. Detailed Expenses for transaction log
    const detailedExpenseQuery = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.type', 'type')
      .where('1=1');
    this.applyTenant(detailedExpenseQuery, 'expense', tenantId);

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

  async getUnpaidCodReport(
    startDate?: string,
    endDate?: string,
    tenantId?: number,
  ) {
    const nowMs = Date.now();
    const calcOverdueDays = (oldest?: string | Date | null) => {
      if (!oldest) return 0;
      const diff = nowMs - new Date(oldest).getTime();
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    };

    // 1. Drivers who collected COD from delivered parcels but have not remitted to company
    let driverQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.driver', 'driver')
      .select('driver.id', 'id')
      .addSelect("COALESCE(driver.name, 'Unknown Driver')", 'name')
      .addSelect('driver.nameKh', 'nameKh')
      .addSelect('driver.phone', 'phone')
      .addSelect('COUNT(*)', 'parcelCount')
      .addSelect(
        "SUM(CASE WHEN UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .addSelect('SUM(COALESCE(parcel.driverFee, 1000))', 'driverFee')
      .addSelect('MIN(COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt))', 'oldestDate')
      .where('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.driverId IS NOT NULL')
      .andWhere("(parcel.driverPaymentStatus IS NULL OR parcel.driverPaymentStatus != 'paid')")
      .groupBy('driver.id')
      .addGroupBy('driver.name')
      .addGroupBy('driver.nameKh')
      .addGroupBy('driver.phone');

    this.applyTenant(driverQb, 'parcel', tenantId);
    if (startDate) {
      driverQb = driverQb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :startDate',
        { startDate: `${startDate} 00:00:00` },
      );
    }
    if (endDate) {
      driverQb = driverQb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :endDate',
        { endDate: `${endDate} 23:59:59.999` },
      );
    }
    const rawDriverRows = await driverQb.getRawMany();

    // 2. Merchants whose delivered parcels have not yet been paid out by the company
    let merchantQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.merchant', 'merchant')
      .select('merchant.id', 'id')
      .addSelect("COALESCE(merchant.name, 'Unknown Shop')", 'name')
      .addSelect('merchant.nameKh', 'nameKh')
      .addSelect('merchant.phone', 'phone')
      .addSelect('COUNT(*)', 'parcelCount')
      .addSelect(
        "SUM(CASE WHEN UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .addSelect('SUM(COALESCE(parcel.deliveryFee, 0))', 'deliveryFee')
      .addSelect('MIN(COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt))', 'oldestDate')
      .where('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.merchantId IS NOT NULL')
      .andWhere("(parcel.merchantPaymentStatus IS NULL OR parcel.merchantPaymentStatus != 'paid')")
      .groupBy('merchant.id')
      .addGroupBy('merchant.name')
      .addGroupBy('merchant.nameKh')
      .addGroupBy('merchant.phone');

    this.applyTenant(merchantQb, 'parcel', tenantId);
    if (startDate) {
      merchantQb = merchantQb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :startDate',
        { startDate: `${startDate} 00:00:00` },
      );
    }
    if (endDate) {
      merchantQb = merchantQb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :endDate',
        { endDate: `${endDate} 23:59:59.999` },
      );
    }
    const rawMerchantRows = await merchantQb.getRawMany();

    const driverUnpaid = rawDriverRows
      .map((r) => ({
        id: Number(r.id),
        name: r.nameKh ? `${r.nameKh} (${r.name})` : r.name,
        phone: r.phone || '',
        parcelCount: parseInt(r.parcelCount || '0', 10),
        codUSD: parseFloat(r.codUSD || '0'),
        codKHR: parseFloat(r.codKHR || '0'),
        driverFee: parseFloat(r.driverFee || '0'),
        oldestDate: r.oldestDate,
        overdueDays: calcOverdueDays(r.oldestDate),
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays || b.codUSD - a.codUSD);

    const merchantUnpaid = rawMerchantRows
      .map((r) => ({
        id: Number(r.id),
        name: r.nameKh ? `${r.nameKh} (${r.name})` : r.name,
        phone: r.phone || '',
        parcelCount: parseInt(r.parcelCount || '0', 10),
        codUSD: parseFloat(r.codUSD || '0'),
        codKHR: parseFloat(r.codKHR || '0'),
        deliveryFee: parseFloat(r.deliveryFee || '0'),
        oldestDate: r.oldestDate,
        overdueDays: calcOverdueDays(r.oldestDate),
      }))
      .sort((a, b) => b.overdueDays - a.overdueDays || b.codUSD - a.codUSD);

    return {
      driverUnpaid,
      merchantUnpaid,
      summary: {
        driverCount: driverUnpaid.length,
        driverParcels: driverUnpaid.reduce((s, r) => s + r.parcelCount, 0),
        driverCodUSD: driverUnpaid.reduce((s, r) => s + r.codUSD, 0),
        driverCodKHR: driverUnpaid.reduce((s, r) => s + r.codKHR, 0),
        merchantCount: merchantUnpaid.length,
        merchantParcels: merchantUnpaid.reduce((s, r) => s + r.parcelCount, 0),
        merchantCodUSD: merchantUnpaid.reduce((s, r) => s + r.codUSD, 0),
        merchantCodKHR: merchantUnpaid.reduce((s, r) => s + r.codKHR, 0),
        merchantDeliveryFee: merchantUnpaid.reduce((s, r) => s + r.deliveryFee, 0),
      },
    };
  }

  async getDriverCommissionReport(
    startDate?: string,
    endDate?: string,
    driverId?: string,
    tenantId?: number,
  ) {
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.driver', 'driver')
      .select('driver.id', 'id')
      .addSelect("COALESCE(driver.name, 'Unknown Driver')", 'name')
      .addSelect('driver.nameKh', 'nameKh')
      .addSelect('driver.phone', 'phone')
      .addSelect("SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)", 'deliveredCount')
      .addSelect("SUM(CASE WHEN parcel.status = 'failed' THEN 1 ELSE 0 END)", 'failedCount')
      .addSelect("SUM(CASE WHEN parcel.status = 'returned' THEN 1 ELSE 0 END)", 'returnedCount')
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN COALESCE(parcel.driverFee, 1000) ELSE 0 END)",
        'totalDriverFee',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND parcel.driverPaymentStatus = 'paid' THEN COALESCE(parcel.driverFee, 1000) ELSE 0 END)",
        'paidDriverFee',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND (parcel.driverPaymentStatus IS NULL OR parcel.driverPaymentStatus != 'paid') THEN COALESCE(parcel.driverFee, 1000) ELSE 0 END)",
        'unpaidDriverFee',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN COALESCE(parcel.deliveryFee, 0) ELSE 0 END)",
        'totalDeliveryFee',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .where('parcel.driverId IS NOT NULL')
      .groupBy('driver.id')
      .addGroupBy('driver.name')
      .addGroupBy('driver.nameKh')
      .addGroupBy('driver.phone');

    this.applyTenant(q, 'parcel', tenantId);
    if (startDate) {
      q = q.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :startDate',
        { startDate: `${startDate} 00:00:00` },
      );
    }
    if (endDate) {
      q = q.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :endDate',
        { endDate: `${endDate} 23:59:59.999` },
      );
    }
    if (driverId) {
      q = q.andWhere('driver.id = :driverId', { driverId });
    }

    const rows = await q.getRawMany();
    return rows
      .map((r) => ({
        id: Number(r.id),
        name: r.nameKh ? `${r.nameKh} (${r.name})` : r.name,
        phone: r.phone || '',
        deliveredCount: parseInt(r.deliveredCount || '0', 10),
        failedCount: parseInt(r.failedCount || '0', 10),
        returnedCount: parseInt(r.returnedCount || '0', 10),
        totalDriverFee: parseFloat(r.totalDriverFee || '0'),
        paidDriverFee: parseFloat(r.paidDriverFee || '0'),
        unpaidDriverFee: parseFloat(r.unpaidDriverFee || '0'),
        totalDeliveryFee: parseFloat(r.totalDeliveryFee || '0'),
        codUSD: parseFloat(r.codUSD || '0'),
        codKHR: parseFloat(r.codKHR || '0'),
      }))
      .sort((a, b) => b.totalDriverFee - a.totalDriverFee);
  }

  async getFailedReturnedReport(
    startDate?: string,
    endDate?: string,
    driverId?: string,
    merchantId?: string,
    status?: string,
    tenantId?: number,
  ) {
    let totalQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)", 'delivered')
      .addSelect("SUM(CASE WHEN parcel.status = 'failed' THEN 1 ELSE 0 END)", 'failed')
      .addSelect("SUM(CASE WHEN parcel.status = 'returned' THEN 1 ELSE 0 END)", 'returned');
    this.applyTenant(totalQb, 'parcel', tenantId);
    if (startDate) totalQb = totalQb.andWhere('parcel.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    if (endDate) totalQb = totalQb.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59.999` });
    if (driverId) totalQb = totalQb.andWhere('parcel.driverId = :driverId', { driverId });
    if (merchantId) totalQb = totalQb.andWhere('parcel.merchantId = :merchantId', { merchantId });
    const totals = await totalQb.getRawOne();

    const targetStatuses =
      status === 'failed'
        ? ['failed']
        : status === 'returned'
          ? ['returned']
          : ['failed', 'returned'];

    let listQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.status IN (:...statuses)', { statuses: targetStatuses })
      .orderBy('parcel.updatedAt', 'DESC');

    this.applyTenant(listQb, 'parcel', tenantId);
    if (startDate) listQb = listQb.andWhere('parcel.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    if (endDate) listQb = listQb.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59.999` });
    if (driverId) listQb = listQb.andWhere('parcel.driverId = :driverId', { driverId });
    if (merchantId) listQb = listQb.andWhere('parcel.merchantId = :merchantId', { merchantId });

    const parcels = await listQb.take(300).getMany();

    const totalAll = parseInt(totals?.total || '0', 10);
    const totalDelivered = parseInt(totals?.delivered || '0', 10);
    const totalFailed = parseInt(totals?.failed || '0', 10);
    const totalReturned = parseInt(totals?.returned || '0', 10);

    return {
      summary: {
        totalAll,
        totalDelivered,
        totalFailed,
        totalReturned,
        issueRatePct: totalAll > 0 ? Math.round(((totalFailed + totalReturned) / totalAll) * 1000) / 10 : 0,
      },
      items: parcels.map((p) => ({
        id: p.id,
        trackingCode: p.trackingCode,
        status: p.status,
        merchantName: p.merchant?.nameKh ? `${p.merchant.nameKh} (${p.merchant.name})` : (p.merchant?.name || '—'),
        driverName: p.driver?.nameKh ? `${p.driver.nameKh} (${p.driver.name})` : (p.driver?.name || '—'),
        receiverName: p.receiverName || '',
        receiverPhone: p.receiverPhone || '',
        receiverAddress: p.receiverAddress || '',
        zoneName: p.zone?.name || '',
        cod: Number(p.cod || 0),
        codCurrency: (p.codCurrency || 'USD').toUpperCase(),
        note: p.note || '',
        updatedAt: p.updatedAt || p.createdAt,
      })),
    };
  }

  async getOverdueParcelsReport(
    minHours = 24,
    status?: string,
    tenantId?: number,
  ) {
    const safeHours = Number.isFinite(minHours) && minHours >= 1 ? minHours : 24;
    const cutoffDate = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    const openStatuses = ['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit'];
    const filterStatuses = status && openStatuses.includes(status) ? [status] : openStatuses;

    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.status IN (:...statuses)', { statuses: filterStatuses })
      .andWhere('parcel.createdAt <= :cutoffDate', { cutoffDate })
      .orderBy('parcel.createdAt', 'ASC');

    this.applyTenant(q, 'parcel', tenantId);
    const parcels = await q.take(300).getMany();
    const nowMs = Date.now();

    const items = parcels.map((p) => {
      const hoursDelayed = Math.max(1, Math.floor((nowMs - new Date(p.createdAt).getTime()) / (1000 * 60 * 60)));
      return {
        id: p.id,
        trackingCode: p.trackingCode,
        status: p.status,
        merchantName: p.merchant?.nameKh ? `${p.merchant.nameKh} (${p.merchant.name})` : (p.merchant?.name || '—'),
        driverName: p.driver?.nameKh ? `${p.driver.nameKh} (${p.driver.name})` : (p.driver?.name || '—'),
        receiverName: p.receiverName || '',
        receiverPhone: p.receiverPhone || '',
        receiverAddress: p.receiverAddress || '',
        zoneName: p.zone?.name || '',
        cod: Number(p.cod || 0),
        codCurrency: (p.codCurrency || 'USD').toUpperCase(),
        createdAt: p.createdAt,
        hoursDelayed,
        daysDelayed: Math.floor(hoursDelayed / 24),
      };
    });

    return {
      minHours: safeHours,
      summary: {
        totalOverdue: items.length,
        over48h: items.filter((i) => i.hoursDelayed >= 48).length,
        over72h: items.filter((i) => i.hoursDelayed >= 72).length,
      },
      items,
    };
  }

  async getZonePerformanceReport(
    startDate?: string,
    endDate?: string,
    tenantId?: number,
  ) {
    let q = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoin('parcel.zone', 'zone')
      .select('zone.id', 'id')
      .addSelect("COALESCE(zone.name, 'Unassigned Zone')", 'name')
      .addSelect('COUNT(*)', 'totalParcels')
      .addSelect("SUM(CASE WHEN parcel.status = 'delivered' THEN 1 ELSE 0 END)", 'delivered')
      .addSelect("SUM(CASE WHEN parcel.status = 'failed' THEN 1 ELSE 0 END)", 'failed')
      .addSelect("SUM(CASE WHEN parcel.status = 'returned' THEN 1 ELSE 0 END)", 'returned')
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' THEN COALESCE(parcel.deliveryFee, 0) ELSE 0 END)",
        'deliveryFee',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'USD' THEN parcel.cod ELSE 0 END)",
        'codUSD',
      )
      .addSelect(
        "SUM(CASE WHEN parcel.status = 'delivered' AND UPPER(COALESCE(parcel.codCurrency, 'USD')) = 'KHR' THEN parcel.cod ELSE 0 END)",
        'codKHR',
      )
      .where('1=1')
      .groupBy('zone.id')
      .addGroupBy('zone.name');

    this.applyTenant(q, 'parcel', tenantId);
    if (startDate) q = q.andWhere('parcel.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
    if (endDate) q = q.andWhere('parcel.createdAt <= :endDate', { endDate: `${endDate} 23:59:59.999` });

    const rows = await q.getRawMany();
    return rows
      .map((r) => {
        const totalParcels = parseInt(r.totalParcels || '0', 10);
        const delivered = parseInt(r.delivered || '0', 10);
        return {
          id: r.id ? Number(r.id) : 0,
          name: r.name,
          totalParcels,
          delivered,
          failed: parseInt(r.failed || '0', 10),
          returned: parseInt(r.returned || '0', 10),
          successRatePct: totalParcels > 0 ? Math.round((delivered / totalParcels) * 1000) / 10 : 0,
          deliveryFee: parseFloat(r.deliveryFee || '0'),
          codUSD: parseFloat(r.codUSD || '0'),
          codKHR: parseFloat(r.codKHR || '0'),
        };
      })
      .sort((a, b) => b.totalParcels - a.totalParcels);
  }
}
