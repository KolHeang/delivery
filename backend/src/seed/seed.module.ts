import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../users/staff.entity';
import { Zone } from '../zones/zone.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Customer } from '../customers/customer.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';
import { Expense } from '../expenses/expense.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { Income } from '../incomes/income.entity';
import { IncomeType } from '../incomes/income-type.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Staff,
      Zone,
      Vehicle,
      Customer,
      Merchant,
      Order,
      Expense,
      ExpenseType,
      Income,
      IncomeType,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
