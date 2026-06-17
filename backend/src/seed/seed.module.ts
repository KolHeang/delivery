import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { Zone } from '../zones/zone.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Customer } from '../customers/customer.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';
import { Expense } from '../expenses/expense.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { Income } from '../incomes/income.entity';
import { IncomeType } from '../incomes/income-type.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../roles/permission.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Zone,
      Vehicle,
      Customer,
      Merchant,
      Order,
      Expense,
      ExpenseType,
      Income,
      IncomeType,
      Role,
      Permission,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule { }
