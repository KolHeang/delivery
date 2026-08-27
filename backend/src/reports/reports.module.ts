import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcel } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/users.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Income } from '../incomes/entities/income.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Parcel, User, Expense, Income])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule { }
