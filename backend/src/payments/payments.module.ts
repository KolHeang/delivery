import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffPayment } from './entities/staff-payment.entity';
import { ShopPayment } from './entities/shop-payment.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Order } from '../orders/entities/order.entity';
import { Organisation } from '../settings/entities/organisation.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffPayment,
      ShopPayment,
      User,
      Merchant,
      Order,
      Organisation,
    ]),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule { }
