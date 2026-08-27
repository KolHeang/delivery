import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcel } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/users.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Parcel, User, Customer, Merchant])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule { }
