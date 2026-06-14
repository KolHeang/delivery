import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/order.entity';
import { Staff } from '../users/staff.entity';
import { Expense } from '../expenses/expense.entity';
import { Income } from '../incomes/income.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Staff, Expense, Income])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
