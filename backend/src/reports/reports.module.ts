import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { User } from '../users/users.entity';
import { Expense } from '../expenses/expense.entity';
import { Income } from '../incomes/income.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Expense, Income])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule { }
