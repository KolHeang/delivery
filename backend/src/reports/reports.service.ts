import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Staff } from '../users/staff.entity';
import { Expense } from '../expenses/expense.entity';
import { Income } from '../incomes/income.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Staff) private driverRepo: Repository<Staff>,
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(Income) private incomeRepo: Repository<Income>,
  ) {}

  async getRevenueReport(period: 'daily' | 'monthly' = 'monthly') {
    const groupFormat = period === 'daily' ? "DATE(order.createdAt)" : "TO_CHAR(order.createdAt, 'YYYY-MM')";
    const labelFormat = period === 'daily' ? "DATE(order.createdAt)" : "TO_CHAR(order.createdAt, 'Mon YYYY')";

    return this.orderRepo
      .createQueryBuilder('order')
      .select(labelFormat, 'label')
      .addSelect('COUNT(*)', 'totalOrders')
      .addSelect("SUM(CASE WHEN order.status = 'delivered' THEN 1 ELSE 0 END)", 'delivered')
      .addSelect("SUM(CASE WHEN order.status = 'failed' THEN 1 ELSE 0 END)", 'failed')
      .addSelect("SUM(order.deliveryFee)", 'revenue')
      .addSelect("SUM(order.cod)", 'totalCod')
      .where("order.createdAt >= NOW() - INTERVAL '6 months'")
      .groupBy(`${groupFormat}, ${labelFormat}`)
      .orderBy(groupFormat, 'ASC')
      .getRawMany();
  }

  async getDriverPerformance() {
    return this.driverRepo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .where('driver.role = :role', { role: 'driver' })
      .orderBy('driver.totalDeliveries', 'DESC')
      .getMany();
  }

  async getOrderSummary() {
    const statusCounts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(order.deliveryFee)', 'revenue')
      .groupBy('order.status')
      .getRawMany();

    const zoneRevenue = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoin('order.zone', 'zone')
      .select('zone.name', 'zone')
      .addSelect('COUNT(*)', 'count')
      .addSelect("SUM(CASE WHEN order.status = 'delivered' THEN 1 ELSE 0 END)", 'delivered')
      .addSelect('SUM(order.deliveryFee)', 'revenue')
      .where('zone.id IS NOT NULL')
      .groupBy('zone.name')
      .orderBy('SUM(order.deliveryFee)', 'DESC')
      .getRawMany();

    return { statusCounts, zoneRevenue };
  }

  async getFinancialReport(startDate?: string, endDate?: string) {
    // 1. Group Incomes by month
    const incomeQuery = this.incomeRepo.createQueryBuilder('income')
      .select("TO_CHAR(income.date, 'YYYY-MM')", 'monthKey')
      .addSelect("TO_CHAR(income.date, 'Mon YYYY')", 'monthLabel')
      .addSelect('SUM(income.amount)', 'total')
      .groupBy("TO_CHAR(income.date, 'YYYY-MM'), TO_CHAR(income.date, 'Mon YYYY')")
      .orderBy("TO_CHAR(income.date, 'YYYY-MM')", 'ASC');

    // 2. Group Expenses by month
    const expenseQuery = this.expenseRepo.createQueryBuilder('expense')
      .select("TO_CHAR(expense.date, 'YYYY-MM')", 'monthKey')
      .addSelect("TO_CHAR(expense.date, 'Mon YYYY')", 'monthLabel')
      .addSelect('SUM(expense.amount)', 'total')
      .groupBy("TO_CHAR(expense.date, 'YYYY-MM'), TO_CHAR(expense.date, 'Mon YYYY')")
      .orderBy("TO_CHAR(expense.date, 'YYYY-MM')", 'ASC');

    // 3. Breakdown Incomes by category
    const incomeCatQuery = this.incomeRepo.createQueryBuilder('income')
      .leftJoin('income.type', 'type')
      .select('COALESCE(type.name, \'Other\')', 'category')
      .addSelect('SUM(income.amount)', 'total')
      .groupBy('type.name');

    // 4. Breakdown Expenses by category
    const expenseCatQuery = this.expenseRepo.createQueryBuilder('expense')
      .leftJoin('expense.type', 'type')
      .select('COALESCE(type.name, \'Other\')', 'category')
      .addSelect('SUM(expense.amount)', 'total')
      .groupBy('type.name');

    // 5. Detailed Incomes for transaction log
    const detailedIncomeQuery = this.incomeRepo.createQueryBuilder('income')
      .leftJoinAndSelect('income.type', 'type');

    // 6. Detailed Expenses for transaction log
    const detailedExpenseQuery = this.expenseRepo.createQueryBuilder('expense')
      .leftJoinAndSelect('expense.type', 'type');

    if (startDate) {
      incomeQuery.andWhere('income.date >= :startDate', { startDate });
      expenseQuery.andWhere('expense.date >= :startDate', { startDate });
      incomeCatQuery.andWhere('income.date >= :startDate', { startDate });
      expenseCatQuery.andWhere('expense.date >= :startDate', { startDate });
      detailedIncomeQuery.andWhere('income.date >= :startDate', { startDate });
      detailedExpenseQuery.andWhere('expense.date >= :startDate', { startDate });
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
    const detailedIncomes = await detailedIncomeQuery.orderBy('income.date', 'DESC').getMany();
    const detailedExpenses = await detailedExpenseQuery.orderBy('expense.date', 'DESC').getMany();

    // Merge monthly income and expense
    const monthlyMap = new Map<string, { label: string; income: number; expense: number }>();
    
    rawIncomes.forEach(i => {
      monthlyMap.set(i.monthKey, {
        label: i.monthLabel,
        income: parseFloat(i.total || '0'),
        expense: 0,
      });
    });

    rawExpenses.forEach(e => {
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

    const totalIncome = rawIncomes.reduce((sum, item) => sum + parseFloat(item.total || '0'), 0);
    const totalExpense = rawExpenses.reduce((sum, item) => sum + parseFloat(item.total || '0'), 0);

    const transactions = [
      ...detailedIncomes.map(i => ({
        id: `income-${i.id}`,
        dbId: i.id,
        type: 'income',
        description: i.description,
        amount: parseFloat(i.amount as any),
        date: i.date,
        category: i.type?.name || 'Other',
      })),
      ...detailedExpenses.map(e => ({
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
      incomeByCategory: incomeByCategory.map(item => ({ category: item.category, total: parseFloat(item.total || '0') })),
      expenseByCategory: expenseByCategory.map(item => ({ category: item.category, total: parseFloat(item.total || '0') })),
      transactions,
    };
  }
}
