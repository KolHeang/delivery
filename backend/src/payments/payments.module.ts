import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffPayment } from './staff-payment.entity';
import { ShopPayment } from './shop-payment.entity';
import { User } from '../users/users.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';
import { Organisation } from '../settings/organisation.entity';
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
